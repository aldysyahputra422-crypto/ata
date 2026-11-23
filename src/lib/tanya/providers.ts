import registry from "../../../content/providers.json";
import type { ChatMessage } from "./prompt";
import type { FinishReason } from "./validate";

// Provider abstraction (blueprint 03). The registry in content/providers.json decides which wire format a
// provider speaks; adding an OpenAI-compatible provider is a registry entry, not code. The key always comes
// from the user (BYOK): nothing here reads a platform key from the environment.

export type ProviderEntry = {
  id: string;
  name: string;
  sdk: string;
  baseURL: string | null;
  auth: "bearer" | "x-api-key" | "x-goog-api-key";
  modelsEndpoint: string | null;
  notes: string;
};
export type WireFormat = "openai-compatible" | "anthropic" | "gemini";

export const PROVIDERS: ProviderEntry[] = (registry.providers as ProviderEntry[]).map((p) => ({
  id: p.id, name: p.name, sdk: p.sdk, baseURL: p.baseURL, auth: p.auth, modelsEndpoint: p.modelsEndpoint, notes: p.notes,
}));
export const findProvider = (id: string) => PROVIDERS.find((p) => p.id === id) ?? null;
/** What the screen may show. */
export const publicProviders = () => PROVIDERS.map((p) => ({ id: p.id, name: p.name, notes: p.notes, needs_base_url: p.baseURL === null }));

export function wireFormat(provider: ProviderEntry): WireFormat {
  if (provider.sdk === "@ai-sdk/anthropic") return "anthropic";
  if (provider.sdk === "@ai-sdk/google") return "gemini";
  return "openai-compatible";
}

export type Credential = { providerId: string; apiKey: string; baseUrl: string; model: string };
export type GenerateRequest = { system: string; messages: ChatMessage[]; maxOutputTokens: number; signal?: AbortSignal };
export type Usage = { inputTokens?: number; outputTokens?: number };
export type StreamEvent = { type: "delta"; text: string } | { type: "finish"; reason: FinishReason; usage: Usage };
export type ModelInfo = { id: string };

export type AiErrorCode =
  | "key_rejected" | "rate_limited" | "quota" | "model_unavailable" | "bad_request" | "provider_down"
  | "network" | "timeout" | "bad_response" | "stopped";

/** A provider failure in Ata's own words. It never carries the provider's response body, which can echo the key. */
export class AiError extends Error {
  constructor(readonly code: AiErrorCode, readonly status?: number, readonly retryAfterS?: number) {
    super(code);
    this.name = "AiError";
  }
}

export interface ProviderAdapter {
  readonly id: string;
  readonly format: WireFormat;
  testConnection(cred: Credential): Promise<{ ok: true; models: ModelInfo[] }>;
  listModels(cred: Credential): Promise<ModelInfo[]>;
  stream(req: GenerateRequest, cred: Credential): AsyncIterable<StreamEvent>;
  generate(req: GenerateRequest, cred: Credential): Promise<{ text: string; reason: FinishReason; usage: Usage }>;
  mapError(error: unknown): AiError;
}

export type Http = (input: string, init: RequestInit) => Promise<Response>;
export const PROVIDER_TIMEOUT_MS = 60_000; // FR-BYOK-04
const MODEL_LIST_LIMIT = 200;
const MODEL_LIST_BYTES = 2_000_000;

/** Reads a response body as text, giving up once it is larger than any honest provider would send. */
async function readCapped(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new AiError("bad_response");
    }
    text += decoder.decode(value, { stream: true });
  }
}

function statusError(response: Response): AiError {
  const status = response.status;
  const retry = Number(response.headers.get("retry-after"));
  const retryAfter = Number.isFinite(retry) && retry > 0 ? Math.min(Math.ceil(retry), 3600) : undefined;
  if (status === 401 || status === 403) return new AiError("key_rejected", status);
  if (status === 402) return new AiError("quota", status);
  if (status === 404) return new AiError("model_unavailable", status);
  if (status === 429) return new AiError("rate_limited", status, retryAfter);
  if (status === 408 || status === 504) return new AiError("timeout", status);
  if (status >= 500) return new AiError("provider_down", status);
  if (status >= 300 && status < 400) return new AiError("bad_response", status);
  return new AiError("bad_request", status);
}

export function mapError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const name = (error as { name?: string } | null)?.name;
  if (name === "TimeoutError") return new AiError("timeout");
  if (name === "AbortError") return new AiError("stopped");
  return new AiError("network");
}

const join = (base: string, path: string) => `${base.replace(/\/+$/, "")}${path}`;

function authHeaders(provider: ProviderEntry, apiKey: string): Record<string, string> {
  if (provider.auth === "x-api-key") return { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  if (provider.auth === "x-goog-api-key") return { "x-goog-api-key": apiKey };
  return { authorization: `Bearer ${apiKey}` };
}

async function* sse(response: Response): AsyncGenerator<string> {
  if (!response.body) throw new AiError("bad_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        if (line.startsWith("data:")) yield line.slice(5).trim();
      }
    }
    const rest = buffer.trim();
    if (rest.startsWith("data:")) yield rest.slice(5).trim();
  } finally {
    reader.cancel().catch(() => {});
  }
}

const parse = (data: string): Record<string, unknown> | null => {
  try {
    const value: unknown = JSON.parse(data);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};
const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined);
type Json = Record<string, unknown>;

type Wire = {
  modelsPath(provider: ProviderEntry): string;
  models(body: Json): string[];
  chat(req: GenerateRequest, cred: Credential, provider: ProviderEntry): { path: string; body: Json };
  /** Reads one SSE data payload. Returns text, a finish reason and usage when present. */
  read(chunk: Json, usage: Usage): { text?: string; reason?: FinishReason; error?: AiError };
};

const openAiReason = (reason: unknown): FinishReason =>
  reason === "stop" ? "stop" : reason === "length" ? "length" : reason === "content_filter" ? "filter" : "other";

const WIRES: Record<WireFormat, Wire> = {
  "openai-compatible": {
    modelsPath: (provider) => provider.modelsEndpoint ?? "/models",
    models: (body) => (Array.isArray(body.data) ? body.data : []).map((m) => (m as Json)?.id).filter((id): id is string => typeof id === "string"),
    chat: (req, cred, provider) => ({
      path: "/chat/completions",
      body: {
        model: cred.model,
        stream: true,
        messages: [{ role: "system", content: req.system }, ...req.messages],
        // OpenAI's current chat models take max_completion_tokens; other compatible servers take max_tokens.
        [provider.id === "openai" ? "max_completion_tokens" : "max_tokens"]: req.maxOutputTokens,
      },
    }),
    read: (chunk, usage) => {
      if (chunk.error) return { error: new AiError("provider_down") };
      const u = chunk.usage as Json | undefined;
      if (u) {
        usage.inputTokens = count(u.prompt_tokens) ?? usage.inputTokens;
        usage.outputTokens = count(u.completion_tokens) ?? usage.outputTokens;
      }
      const choice = (Array.isArray(chunk.choices) ? chunk.choices[0] : undefined) as Json | undefined;
      const content = (choice?.delta as Json | undefined)?.content;
      return {
        text: typeof content === "string" ? content : undefined,
        reason: choice?.finish_reason ? openAiReason(choice.finish_reason) : undefined,
      };
    },
  },
  anthropic: {
    modelsPath: (provider) => provider.modelsEndpoint ?? "/models",
    models: (body) => (Array.isArray(body.data) ? body.data : []).map((m) => (m as Json)?.id).filter((id): id is string => typeof id === "string"),
    chat: (req, cred) => ({
      path: "/messages",
      body: { model: cred.model, stream: true, max_tokens: req.maxOutputTokens, system: req.system, messages: req.messages },
    }),
    read: (chunk, usage) => {
      if (chunk.type === "error") {
        const kind = (chunk.error as Json | undefined)?.type;
        return { error: new AiError(kind === "rate_limit_error" ? "rate_limited" : kind === "authentication_error" ? "key_rejected" : "provider_down") };
      }
      if (chunk.type === "message_start") usage.inputTokens = count(((chunk.message as Json | undefined)?.usage as Json | undefined)?.input_tokens);
      if (chunk.type === "content_block_delta") {
        const delta = chunk.delta as Json | undefined;
        return { text: delta?.type === "text_delta" && typeof delta.text === "string" ? delta.text : undefined };
      }
      if (chunk.type === "message_delta") {
        usage.outputTokens = count((chunk.usage as Json | undefined)?.output_tokens) ?? usage.outputTokens;
        const stop = (chunk.delta as Json | undefined)?.stop_reason;
        if (stop) return { reason: stop === "end_turn" || stop === "stop_sequence" ? "stop" : stop === "max_tokens" ? "length" : stop === "refusal" ? "filter" : "other" };
      }
      return {};
    },
  },
  gemini: {
    modelsPath: (provider) => provider.modelsEndpoint ?? "/models",
    models: (body) => (Array.isArray(body.models) ? body.models : [])
      .filter((m) => {
        const methods = (m as Json)?.supportedGenerationMethods;
        return !Array.isArray(methods) || methods.includes("generateContent");
      })
      .map((m) => (m as Json)?.name).filter((name): name is string => typeof name === "string").map((name) => name.replace(/^models\//, "")),
    chat: (req, cred) => ({
      path: `/models/${encodeURIComponent(cred.model)}:streamGenerateContent?alt=sse`,
      body: {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: req.maxOutputTokens },
      },
    }),
    read: (chunk, usage) => {
      if (chunk.error) return { error: new AiError("provider_down") };
      const u = chunk.usageMetadata as Json | undefined;
      if (u) {
        usage.inputTokens = count(u.promptTokenCount) ?? usage.inputTokens;
        usage.outputTokens = count(u.candidatesTokenCount) ?? usage.outputTokens;
      }
      const candidate = (Array.isArray(chunk.candidates) ? chunk.candidates[0] : undefined) as Json | undefined;
      const parts = (candidate?.content as Json | undefined)?.parts;
      const text = Array.isArray(parts) ? parts.map((p) => ((p as Json)?.text as string) ?? "").join("") : "";
      const finish = candidate?.finishReason;
      const blocked = (chunk.promptFeedback as Json | undefined)?.blockReason;
      return {
        text: text || undefined,
        reason: blocked ? "filter" : !finish ? undefined : finish === "STOP" ? "stop" : finish === "MAX_TOKENS" ? "length"
          : ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"].includes(String(finish)) ? "filter" : "other",
      };
    },
  },
};

export function createAdapter(provider: ProviderEntry, http: Http = (input, init) => fetch(input, init)): ProviderAdapter {
  const format = wireFormat(provider);
  const wire = WIRES[format];

  async function call(cred: Credential, path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const timeout = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
    let response: Response;
    try {
      response = await http(join(cred.baseUrl, path), {
        ...init,
        headers: { ...authHeaders(provider, cred.apiKey), ...(init.body ? { "content-type": "application/json" } : {}) },
        // A redirect could point a custom base URL at an internal address after it passed the SSRF check.
        redirect: "manual",
        cache: "no-store",
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch (error) {
      throw mapError(error);
    }
    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      throw statusError(response);
    }
    return response;
  }

  async function listModels(cred: Credential): Promise<ModelInfo[]> {
    const response = await call(cred, wire.modelsPath(provider), { method: "GET" });
    let body: unknown;
    try {
      body = JSON.parse(await readCapped(response, MODEL_LIST_BYTES));
    } catch {
      throw new AiError("bad_response");
    }
    if (!body || typeof body !== "object") throw new AiError("bad_response");
    return [...new Set(wire.models(body as Json))].filter((id) => id.length <= 200).sort().slice(0, MODEL_LIST_LIMIT).map((id) => ({ id }));
  }

  async function* stream(req: GenerateRequest, cred: Credential): AsyncGenerator<StreamEvent> {
    const { path, body } = wire.chat(req, cred, provider);
    const response = await call(cred, path, { method: "POST", body: JSON.stringify(body) }, req.signal);
    const usage: Usage = {};
    let reason: FinishReason | undefined;
    try {
      for await (const data of sse(response)) {
        if (data === "[DONE]") break;
        const chunk = parse(data);
        if (!chunk) continue;
        const part = wire.read(chunk, usage);
        if (part.error) throw part.error;
        if (part.text) yield { type: "delta", text: part.text };
        if (part.reason) reason = part.reason;
      }
    } catch (error) {
      throw mapError(error);
    }
    // A stream that ends without a finish reason was cut off: say so instead of presenting it as complete.
    if (!reason) throw new AiError("network");
    yield { type: "finish", reason, usage };
  }

  return {
    id: provider.id,
    format,
    listModels,
    testConnection: async (cred) => ({ ok: true, models: await listModels(cred) }),
    stream,
    generate: async (req, cred) => {
      let text = "";
      let reason: FinishReason = "other";
      let usage: Usage = {};
      for await (const event of stream(req, cred)) {
        if (event.type === "delta") text += event.text;
        else ({ reason, usage } = event);
      }
      return { text, reason, usage };
    },
    mapError,
  };
}

/** What the user sees for each failure, with the action that fixes it (FR-CCH-07). */
export const AI_ERROR_TEXT: Record<AiErrorCode, { message: string; action: "reconnect" | "retry" | "change_model" | "wait" | "none" }> = {
  key_rejected: { message: "Key ditolak provider. Periksa atau ganti key-mu.", action: "reconnect" },
  rate_limited: { message: "Provider sedang membatasi permintaanmu. Tunggu sebentar lalu coba lagi.", action: "wait" },
  quota: { message: "Kuota atau saldo di provider-mu habis. Cek akun provider-mu.", action: "reconnect" },
  model_unavailable: { message: "Model ini tidak tersedia di provider-mu. Ganti model.", action: "change_model" },
  bad_request: { message: "Provider menolak permintaan ini. Coba ganti model atau persingkat pesanmu.", action: "change_model" },
  provider_down: { message: "Provider sedang bermasalah. Coba lagi sebentar lagi.", action: "retry" },
  network: { message: "Koneksi ke provider terputus. Coba lagi.", action: "retry" },
  timeout: { message: "Provider tidak menjawab dalam 60 detik. Coba lagi.", action: "retry" },
  bad_response: { message: "Jawaban provider tidak bisa dibaca. Coba lagi atau ganti model.", action: "retry" },
  stopped: { message: "Jawaban dihentikan.", action: "none" },
};
