import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { accountError } from "@/lib/account/http";
import { AI_CATEGORIES, type AiCategory } from "@/lib/account/profile";
import { accountReader } from "./context";
import { cookieName, open, validSalt, type Sealed } from "./credentials";
import { defaultGate, type CanProcessAi, type GateDecision } from "./gate";
import { HISTORY_CHARS, QUESTION_LIMIT } from "./prompt";
import { createAdapter, findProvider, type Credential, type ProviderAdapter } from "./providers";
import { pinnedHttp } from "./pinned-http";
import { checkBaseUrl } from "./ssrf";

// Server wiring for the Tanya Ata routes.

/**
 * The consent gate every route uses. To integrate the guardian-consent module, return its `canProcessAi`
 * here (same signature); nothing else in Tanya Ata changes.
 */
export function gateFor(client: SupabaseClient | null): CanProcessAi {
  return defaultGate(client);
}
export const readerFor = accountReader;

export async function gateSummary(gate: CanProcessAi, userId: string | null): Promise<Record<string, GateDecision>> {
  const entries = await Promise.all(AI_CATEGORIES.map(async (category) => [category, await gate(userId, category)] as const));
  return Object.fromEntries(entries);
}

const message = z.strictObject({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(40000) });
export const tanyaInput = z.strictObject({
  question: z.string().refine((value) => value.trim().length > 0),
  history: z.array(message).max(40).default([]),
  // Account-data categories the earlier turns in `history` were answered with. The server drops the history
  // when any of them is no longer permitted, so revoked data is never sent on.
  context_categories: z.array(z.enum(AI_CATEGORIES)).max(AI_CATEGORIES.length).default([]),
});
export const TANYA_BODY_BYTES = 400 * 1024;

export function parseTanya(body: unknown): { error: Response } | { question: string; history: z.infer<typeof message>[]; contextCategories: AiCategory[] } {
  const parsed = tanyaInput.safeParse(body);
  if (!parsed.success) return { error: accountError(400, "validation", "Tulis pertanyaanmu dulu.") };
  const { question, history, context_categories } = parsed.data;
  if (question.length > QUESTION_LIMIT) {
    const over = (question.length - QUESTION_LIMIT).toLocaleString("id-ID");
    return { error: accountError(413, "too_long", `Teksmu ${question.length.toLocaleString("id-ID")} karakter, batasnya 12.000. Potong ${over} karakter dulu.`) };
  }
  if (history.reduce((n, m) => n + m.content.length, 0) > HISTORY_CHARS * 4) return { error: accountError(413, "too_long", "Riwayat percakapan terlalu panjang. Mulai percakapan baru.") };
  return { question, history, contextCategories: [...new Set(context_categories)] };
}

/** Categories from `categories` that the gate does not allow right now. Call with a fresh gate: a gate caches one read. */
export async function revokedAmong(gate: CanProcessAi, userId: string, categories: readonly AiCategory[]): Promise<AiCategory[]> {
  const decisions = await Promise.all(categories.map(async (category) => [category, await gate(userId, category)] as const));
  return decisions.filter(([, decision]) => !decision.allowed).map(([category]) => category);
}

export const REVOKED_MESSAGE = "Izin data yang dipakai percakapan ini dicabut. Jawaban dihentikan dan percakapan dibersihkan.";
/** How often a running answer re-checks the permissions it depends on. */
export const REVOCATION_POLL_MS = 2000;

export const secureRequest = (request: Request) => new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";

export function readSalt(request: Request): string | undefined {
  const name = cookieName(secureRequest(request));
  const pair = (request.headers.get("cookie") ?? "").split(/;\s*/).find((part) => part.startsWith(`${name}=`));
  const value = pair?.slice(name.length + 1);
  return validSalt(value) ? value : undefined;
}

export type PublicConnection = { provider_id: string; provider_name: string; model: string; last4: string; expires_at: string };
type StoredRow = {
  connection_id: string; provider_id: string; base_url: string | null; model: string; last4: string; expires_at: string;
  user_id?: string; session_id?: string; kek_version?: number; iv?: string; ciphertext?: string; tag?: string; wrapped_key?: string; expires_epoch?: number;
};

export function publicConnection(row: unknown): PublicConnection | null {
  const stored = row as StoredRow | null;
  const provider = stored && findProvider(stored.provider_id);
  if (!stored || !provider) return null;
  return { provider_id: stored.provider_id, provider_name: provider.name, model: stored.model, last4: stored.last4, expires_at: stored.expires_at };
}

export async function readConnection(client: SupabaseClient): Promise<{ connection: PublicConnection | null } | null> {
  const { data, error } = await client.rpc("ai_credential_get", { p_secret: false });
  return error ? null : { connection: publicConnection(data) };
}

export type Loaded =
  | { state: "ready"; credential: Credential; adapter: ProviderAdapter }
  | { state: "none" | "expired" | "blocked_url" | "unavailable" };

/** Decrypts the session's key for this one request. The plaintext lives only in the returned object. */
export async function loadCredential(client: SupabaseClient, request: Request): Promise<Loaded> {
  const { data, error } = await client.rpc("ai_credential_get", { p_secret: true });
  if (error) return { state: "unavailable" };
  const row = data as StoredRow | null;
  if (!row) return { state: "none" };
  const provider = findProvider(row.provider_id);
  const apiKey = provider && row.user_id && row.session_id && row.iv && row.ciphertext && row.tag && row.kek_version && row.wrapped_key && row.expires_epoch
    ? open({ kekVersion: row.kek_version, expiresAt: row.expires_epoch, iv: row.iv, ciphertext: row.ciphertext, tag: row.tag, wrappedKey: row.wrapped_key } satisfies Sealed, readSalt(request),
        { userId: row.user_id, sessionId: row.session_id, connectionId: row.connection_id, providerId: row.provider_id })
    : null;
  if (!provider || !apiKey) {
    // A row that can no longer be opened (cookie gone, KEK rotated away) is useless: remove it.
    await client.rpc("ai_credential_delete");
    return { state: "expired" };
  }
  let baseUrl = provider.baseURL;
  if (baseUrl === null) {
    // Checked again on every request: the name may resolve somewhere else than when it was saved.
    const checked = row.base_url ? await checkBaseUrl(row.base_url) : null;
    if (!checked?.ok) return { state: "blocked_url" };
    baseUrl = checked.url;
  }
  // A custom host is connected to through the pinned transport, so the checked address is the one used.
  const adapter = provider.baseURL === null ? createAdapter(provider, pinnedHttp()) : createAdapter(provider);
  return { state: "ready", adapter, credential: { providerId: provider.id, apiKey, baseUrl, model: row.model } };
}

/** FR-BYOK-10. Returns a 429 response when the account is over 30 requests this minute. */
export async function takeRequest(client: SupabaseClient) {
  const { data, error } = await client.rpc("ai_take_request");
  if (error || typeof data !== "number") return accountError(503, "unavailable", "Layanan AI belum tersedia. Coba lagi nanti.");
  if (data > 0) return accountError(429, "rate_limited", `Kamu sudah mengirim 30 permintaan dalam semenit. Coba lagi ${data} detik lagi.`, data);
}
