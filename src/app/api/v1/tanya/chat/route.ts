import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody } from "@/lib/account/http";
import { execute, prepare, provenance, provenanceRecord, type TanyaEvent } from "@/lib/tanya/orchestrator";
import { findProvider } from "@/lib/tanya/providers";
import { gateFor, GUARDIAN_MESSAGE, guardianRequired, loadCredential, needsGuardian, parseTanya, readerFor, revokedAmong, REVOCATION_POLL_MS, REVOKED_MESSAGE, takeRequest, TANYA_BODY_BYTES } from "@/lib/tanya/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_CONNECTION = {
  none: "Belum ada AI yang tersambung. Sambungkan AI-mu atau pakai Mode Tanpa Key.",
  expired: "Sambungan AI-mu sudah berakhir. Sambungkan lagi untuk lanjut.",
  blocked_url: "Alamat provider kustommu tidak lagi bisa dipakai. Sambungkan lagi dengan alamat https publik.",
  not_chat: "Model yang tersimpan bukan model percakapan. Sambungkan lagi dengan model chat.",
} as const;

type RevokedEvent = { type: "error"; code: "permission_revoked"; message: string; action: "none"; partial: false; guardian: boolean; categories: string[] };

/** Tanya Ata with the user's own key (FR-CCH-01, FR-BYOK-03). Streams server-sent events: meta, delta…, then done or error. */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const input = parseTanya(await parseJsonBody(request, TANYA_BODY_BYTES));
  if ("error" in input) return input.error;

  const { client, user } = session;
  // Asked again on every request, and again while the answer streams: nothing about consent is remembered.
  const gate = gateFor(client);
  // A minor without verified guardian consent sends nothing to an AI provider, not even the question (FR-AUTH-07).
  if (await needsGuardian(gate, user.id)) return guardianRequired();

  const limited = await takeRequest(session.client);
  if (limited) return limited;
  const loaded = await loadCredential(session.client, request);
  if (loaded.state === "unavailable") return accountUnavailable();
  if (loaded.state !== "ready") return accountError(409, loaded.state === "none" ? "no_connection" : loaded.state === "not_chat" ? "model_not_chat" : "connection_expired", NO_CONNECTION[loaded.state]);

  // Earlier turns answered with a category that has since been switched off are not sent on: the history is dropped.
  const cleared = await revokedAmong(gate, user.id, input.contextCategories);
  const prepared = await prepare({ question: input.question, history: cleared.length ? [] : input.history, userId: user.id, gate, read: readerFor(client) });
  if (!prepared.quality.pass) {
    return accountError(422, "prompt_quality", "Pertanyaanmu belum cukup jelas untuk dikirim ke AI. Tulis lebih spesifik.");
  }

  const record = provenanceRecord(prepared);
  const started = await client.rpc("tanya_run_start", {
    p_mode: "direct", p_intent: record.intent, p_provider_id: loaded.credential.providerId, p_model: loaded.credential.model,
    p_categories: record.categories, p_sources: record.sources, p_blocked: record.blocked,
  });
  const runId = typeof started.data === "string" ? started.data : null;
  const finish = (status: "done" | "error" | "stopped", code: string | null, input_tokens?: number, output_tokens?: number) =>
    runId ? client.rpc("tanya_run_finish", {
      p_run_id: runId, p_status: status, p_error_code: code, p_input_tokens: input_tokens ?? null, p_output_tokens: output_tokens ?? null,
    }).then(() => {}, () => {}) : Promise.resolve();

  const encoder = new TextEncoder();
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const meta = {
    type: "meta", run_id: runId, provider: findProvider(loaded.credential.providerId)?.name ?? loaded.credential.providerId,
    model: loaded.credential.model, provenance: provenance(prepared), cleared,
  };
  // While the answer streams, guardian consent and the categories it depends on are checked again; losing either
  // stops the provider call.
  const dependsOn = [...new Set([...record.categories, ...(cleared.length ? [] : input.contextCategories)])];
  let revoked: { categories: string[]; guardian: boolean } | null = null;
  let checking = false;
  const watch = setInterval(() => {
    if (checking || abort.signal.aborted) return;
    checking = true;
    Promise.all([revokedAmong(gate, user.id, dependsOn), needsGuardian(gate, user.id)]).then(([gone, guardian]) => {
      if (gone.length || guardian) {
        revoked = { categories: gone, guardian };
        abort.abort();
      }
    }, () => {}).finally(() => { checking = false; });
  }, REVOCATION_POLL_MS);

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TanyaEvent | typeof meta | RevokedEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      let settled = false;
      try {
        send(meta);
        for await (const event of execute(prepared, loaded.adapter, loaded.credential, abort.signal)) {
          if (revoked) break;
          send(event);
          if (event.type === "done") {
            settled = true;
            await finish("done", null, event.usage.inputTokens, event.usage.outputTokens);
          } else if (event.type === "error") {
            settled = true;
            await finish(event.code === "stopped" ? "stopped" : "error", event.code);
          }
        }
      } catch {
        // The provider call was aborted, or the client went away mid-stream.
      } finally {
        clearInterval(watch);
        // A revocation always ends the stream with permission_revoked, however the aborted provider call ended:
        // with an event, with none, or by throwing.
        const lost = revoked as { categories: string[]; guardian: boolean } | null;
        if (!settled && lost) {
          settled = true;
          try {
            send({ type: "error", code: "permission_revoked", message: lost.guardian ? GUARDIAN_MESSAGE : REVOKED_MESSAGE, action: "none", partial: false, categories: lost.categories, guardian: lost.guardian });
          } catch {
            // the client is gone
          }
          await finish("stopped", "permission_revoked");
        }
        if (!settled) await finish("stopped", "stopped");
        try {
          controller.close();
        } catch {
          // already closed by cancel()
        }
      }
    },
    cancel() {
      clearInterval(watch);
      abort.abort();
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "private, no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}
