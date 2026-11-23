import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { handoffPrompt, prepare, provenance, provenanceRecord } from "@/lib/tanya/orchestrator";
import { gateFor, parseTanya, readerFor, TANYA_BODY_BYTES } from "@/lib/tanya/server";

export const dynamic = "force-dynamic";

/**
 * Mode Tanpa Key: compiles the prompt and returns it for the user to paste into an assistant of their choice.
 * No AI provider is called and no answer is produced here.
 */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  const input = parseTanya(await parseJsonBody(request, TANYA_BODY_BYTES));
  if ("error" in input) return input.error;

  const signedIn = session.state === "signed_in";
  const client = signedIn ? session.client : null;
  const prepared = await prepare({
    question: input.question, history: input.history, userId: signedIn ? session.user.id : null,
    gate: gateFor(client), read: client ? readerFor(client) : async () => null,
  });
  if (!prepared.quality.pass) {
    return accountError(422, "prompt_quality", "Pertanyaanmu belum cukup jelas untuk dijadikan prompt. Tulis lebih spesifik.");
  }
  if (client) {
    const record = provenanceRecord(prepared);
    await client.rpc("tanya_run_start", {
      p_mode: "handoff", p_intent: record.intent, p_provider_id: null, p_model: null,
      p_categories: record.categories, p_sources: record.sources, p_blocked: record.blocked,
    });
  }
  return NextResponse.json({ mode: "handoff", prompt: handoffPrompt(prepared), provenance: provenance(prepared) }, { headers: privateHeaders });
}
