import "server-only";
import { z } from "zod";
import { accountError } from "@/lib/account/http";
import { AI_ERROR_TEXT, AiError, createAdapter, findProvider, mapError, type Credential, type ProviderAdapter, type ProviderEntry } from "@/lib/tanya/providers";
import { pinnedHttp } from "@/lib/tanya/pinned-http";
import { checkBaseUrl } from "@/lib/tanya/ssrf";

const apiKey = z.string().min(8).max(400).regex(/^[\x21-\x7e]+$/);
export const keyInput = z.strictObject({
  provider_id: z.string().min(1).max(40),
  api_key: apiKey,
  base_url: z.string().max(300).optional(),
});
export const connectionInput = keyInput.extend({ model: z.string().trim().min(1).max(200) });
export const CONNECTION_BODY_BYTES = 4096;

const URL_TEXT = {
  invalid: "Alamat provider tidak valid.",
  not_https: "Alamat provider wajib memakai https.",
  private_address: "Alamat provider tidak boleh mengarah ke jaringan privat atau lokal.",
  unresolvable: "Alamat provider tidak ditemukan.",
} as const;

/** Resolves the provider and its base URL from the registry; only the custom entry accepts a URL from the user. */
type Target = { provider: ProviderEntry; baseUrl: string; storedUrl: string | null; adapter: ProviderAdapter };
export async function resolveTarget(input: { provider_id: string; base_url?: string }): Promise<{ error: Response } | Target> {
  const provider = findProvider(input.provider_id);
  if (!provider) return { error: accountError(400, "unknown_provider", "Provider ini tidak dikenal.") };
  if (provider.baseURL !== null) {
    if (input.base_url) return { error: accountError(400, "validation", "Provider ini tidak memakai alamat kustom.") };
    return { provider, baseUrl: provider.baseURL, storedUrl: null, adapter: createAdapter(provider) };
  }
  const checked = await checkBaseUrl(input.base_url ?? "");
  if (!checked.ok) return { error: accountError(400, "blocked_url", URL_TEXT[checked.reason]) };
  return { provider, baseUrl: checked.url, storedUrl: checked.url, adapter: createAdapter(provider, pinnedHttp()) };
}

export function providerFailure(error: unknown) {
  const mapped = mapError(error);
  const status = mapped.code === "key_rejected" ? 422 : mapped.code === "rate_limited" ? 429 : mapped.code === "model_unavailable" || mapped.code === "bad_request" ? 422 : 502;
  return accountError(status, mapped.code, AI_ERROR_TEXT[mapped.code].message, mapped.code === "rate_limited" ? mapped.retryAfterS : undefined);
}

/**
 * FR-BYOK-01: proves the key works before it is stored. Lists models; when the provider has no usable model
 * list, sends a one-word ping to the chosen model instead.
 */
export async function verifyConnection(adapter: ProviderAdapter, credential: Credential): Promise<void> {
  let models: string[] | null = null;
  try {
    models = (await adapter.listModels(credential)).map((m) => m.id);
  } catch (error) {
    const mapped = mapError(error);
    if (!["model_unavailable", "bad_request", "bad_response"].includes(mapped.code)) throw mapped;
  }
  if (models?.length) {
    if (!models.includes(credential.model)) throw new AiError("model_unavailable");
    return;
  }
  await adapter.generate({ system: "Balas satu kata.", messages: [{ role: "user", content: "ping" }], maxOutputTokens: 16 }, credential);
}
