import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE as disconnect, GET as getConnection, POST as connect } from "@/app/api/v1/connections/route";
import { POST as listModels } from "@/app/api/v1/connections/models/route";
import { POST as chat } from "@/app/api/v1/tanya/chat/route";
import { POST as prompt } from "@/app/api/v1/tanya/prompt/route";
import { GET as status } from "@/app/api/v1/tanya/status/route";

vi.mock("server-only", () => ({}));
const { auth, rpc, from, lookup } = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));
vi.mock("node:dns/promises", () => ({ lookup }));
// The pinned transport opens real sockets; its own behaviour is covered in tanya-lib.test.ts.
vi.mock("@/lib/tanya/pinned-http", () => ({ pinnedHttp: () => (input: string, init: RequestInit) => fetch(input, init) }));

const origin = "https://ata.example";
const KEY = "sk-user-SECRET-abcd1234";
const NOTE = "RAHASIA-AKUN";
const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();
const logs: string[] = [];

type Db = {
  credential: Record<string, unknown> | null; taken: number; tests: number; limitAfter: number; runs: Record<string, unknown>[];
  age: "adult" | "minor" | "unknown"; consent: "none" | "pending" | "verified" | "revoked" | "rejected"; gateError: boolean; gateCalls: number; categories: Record<string, boolean>; tables: string[]; active: boolean;
};
let db: Db;

const request = (path: string, method: string, body?: unknown, cookie = "", source = origin) =>
  new Request(origin + path, {
    method,
    headers: { origin: source, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const sse = (lines: unknown[]) => new Response(lines.map((l) => `data: ${JSON.stringify(l)}\n\n`).join("") + "data: [DONE]\n\n");
const answer = (text: string) => sse([{ choices: [{ delta: { content: text } }] }, { choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 40, completion_tokens: 6 } }]);
const models = () => Response.json({ data: [{ id: "model-x" }, { id: "model-y" }] });
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [join(dir, entry.name)] : []));
async function events(response: Response) {
  return (await response.text()).split("\n\n").filter(Boolean).map((line) => JSON.parse(line.replace(/^data: /, "")));
}
const cookieOf = (response: Response) => (response.headers.get("set-cookie") ?? "").split(";")[0];

function signedIn() {
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-a", is_anonymous: false } }, error: null });
  rpc.mockImplementation(async (name: string, args: Record<string, unknown> = {}) => {
    const ok = (data: unknown) => ({ data, error: null });
    if (name === "account_session_active") return ok(db.active);
    // The decision PR #26 takes in Postgres (ai_processing_gate): age and guardian consent first, then the category.
    if (name === "can_process_ai") {
      db.gateCalls += 1;
      if (db.gateError) return { data: null, error: { code: "x" } };
      if (db.age !== "adult" && !(db.age === "minor" && db.consent === "verified")) return ok({ allowed: false, reason: "guardian_consent_required" });
      return ok(db.categories[args.p_category as string] === true ? { allowed: true } : { allowed: false, reason: "permission_off" });
    }
    if (name === "ai_take_request") return ok(++db.taken > db.limitAfter ? 17 : 0);
    if (name === "ai_take_test") return ok(++db.tests > 5 ? 420 : 0);
    if (name === "ai_credential_begin") return ok({ user_id: "user-a", session_id: "sess-a", connection_id: "conn-1" });
    if (name === "ai_credential_put") {
      db.credential = { user_id: "user-a", session_id: "sess-a", connection_id: args.p_connection_id, provider_id: args.p_provider_id, base_url: args.p_base_url,
        model: args.p_model, last4: args.p_last4, kek_version: args.p_kek_version, iv: args.p_iv, ciphertext: args.p_ciphertext, tag: args.p_tag, wrapped_key: args.p_wrapped_key, expires_epoch: args.p_expires_epoch, expires_at: "2026-11-23T07:00:00Z" };
      return ok(db.credential);
    }
    if (name === "ai_credential_get") {
      if (!db.credential) return ok(null);
      const { connection_id, provider_id, base_url, model, last4, expires_at } = db.credential;
      return ok(args.p_secret ? db.credential : { connection_id, provider_id, base_url, model, last4, expires_at });
    }
    if (name === "ai_credential_delete") { const had = !!db.credential; db.credential = null; return ok(had); }
    if (name === "tanya_run_start") { db.runs.push({ ...args, status: args.p_mode === "handoff" ? "done" : "started" }); return ok(`run-${db.runs.length}`); }
    if (name === "tanya_run_finish") { Object.assign(db.runs[Number(String(args.p_run_id).slice(4)) - 1], { status: args.p_status, error: args.p_error_code, out: args.p_output_tokens }); return ok(true); }
    return { data: null, error: { code: "x" } };
  });
  from.mockImplementation((name: string) => {
    db.tables.push(name);
    const data = name === "profiles" ? { display_name: `${NOTE}-nama`, interests: [], targets: [], goals_text: null, weekly_hours: null }
      : name === "user_competitions" ? [{ competition_key: "k1", state: "slot", card: { nama: `${NOTE}-lomba` }, roadmap: null }] : [];
    const result = { data, error: null };
    const chain: Record<string, unknown> = { then: (done: (v: unknown) => unknown) => Promise.resolve(result).then(done) };
    for (const k of ["select", "eq", "order", "limit"]) chain[k] = () => chain;
    chain.maybeSingle = async () => result;
    return chain;
  });
}
const signedOut = () => auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

async function connected(provider = "openai") {
  fetchMock.mockResolvedValueOnce(models()).mockResolvedValueOnce(answer("pong"));
  const response = await connect(request("/api/v1/connections", "POST", { provider_id: provider, api_key: KEY, model: "model-x" }));
  expect(response.status).toBe(201);
  fetchMock.mockReset();
  return cookieOf(response);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubEnv("KEY_ENCRYPTION_SECRET", "k".repeat(48));
  vi.stubGlobal("fetch", fetchMock);
  logs.length = 0;
  for (const level of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, level).mockImplementation((...a) => { logs.push(a.map(String).join(" ")); });
  db = { credential: null, taken: 0, tests: 0, limitAfter: 30, runs: [], age: "adult", consent: "none", gateError: false, gateCalls: 0, categories: {}, tables: [], active: true };
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  signedIn();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("BYOK connection routes (FR-BYOK-01..05, 08)", () => {
  it("requires a session and the app's own origin", async () => {
    const body = { provider_id: "openai", api_key: KEY, model: "model-x" };
    expect((await connect(request("/api/v1/connections", "POST", body, "", "https://lain.example"))).status).toBe(403);
    expect((await disconnect(request("/api/v1/connections", "DELETE", undefined, "", "https://lain.example"))).status).toBe(403);
    expect((await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }, "", "https://lain.example"))).status).toBe(403);
    signedOut();
    const responses = [await getConnection(), await connect(request("/api/v1/connections", "POST", body)), await disconnect(request("/api/v1/connections", "DELETE")),
      await listModels(request("/api/v1/connections/models", "POST", body)), await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }))];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tests the key with the provider, stores only ciphertext, and never returns the key", async () => {
    fetchMock.mockResolvedValueOnce(models()).mockResolvedValueOnce(answer("pong"));
    const response = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }));
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ connection: { provider_id: "openai", provider_name: "OpenAI", model: "model-x", last4: "1234", expires_at: "2026-11-23T07:00:00Z" } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/models");
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ authorization: `Bearer ${KEY}` });
    // Uji Koneksi: one short chat request to the chosen model, output capped at 16 tokens.
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["https://api.openai.com/v1/models", "https://api.openai.com/v1/chat/completions"]);
    const ping = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(ping).toMatchObject({ model: "model-x", messages: [{ role: "system" }, { role: "user", content: "ping" }] });
    expect(ping.max_tokens ?? ping.max_completion_tokens).toBe(16);
    expect(rpc.mock.calls.filter((c) => c[0] === "ai_take_test")).toHaveLength(1);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^__Host-ata_kred=[A-Za-z0-9_-]{43}; Path=\/; (Expires=[^;]+; )?Max-Age=43200; Secure; HttpOnly; SameSite=strict$/i);
    expect(JSON.stringify(db.credential) + text + cookie + JSON.stringify(rpc.mock.calls)).not.toContain("SECRET");
    expect(await (await getConnection()).json()).toMatchObject({ byok_available: true, connection: { last4: "1234" } });
  });

  it("refuses a rejected key, an unknown model, an unknown provider and bad input without storing anything", async () => {
    fetchMock.mockResolvedValueOnce(new Response(`bad key ${KEY}`, { status: 401 }));
    const rejected = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }));
    expect(rejected.status).toBe(422);
    const body = await rejected.text();
    expect(JSON.parse(body).error).toEqual({ code: "key_rejected", message: "Key ditolak provider. Periksa atau ganti key-mu." });
    expect(body).not.toContain("SECRET");
    fetchMock.mockResolvedValueOnce(models());
    expect((await (await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "tidak-ada" }))).json()).error.code).toBe("model_unavailable");
    expect((await connect(request("/api/v1/connections", "POST", { provider_id: "entah", api_key: KEY, model: "m" }))).status).toBe(400);
    for (const bad of [{ provider_id: "openai", api_key: "x", model: "m" }, { provider_id: "openai", api_key: "ada spasi di key", model: "m" },
      { provider_id: "openai", api_key: KEY }, { provider_id: "openai", api_key: KEY, model: "m", extra: 1 }, "{", { provider_id: "openai", api_key: KEY, model: "m", base_url: "https://ai.example" }]) {
      expect((await connect(request("/api/v1/connections", "POST", bad))).status, JSON.stringify(bad)).toBe(400);
    }
    expect(db.credential).toBeNull();
  });

  it("never stores a model that cannot chat: refused by name before any provider call, or when the provider refuses the chat test", async () => {
    for (const model of ["text-embedding-3-small", "whisper-1", "dall-e-3", "tts-1", "omni-moderation-latest", "mistral-embed", "jina-embeddings-v3", "rerank-v3"]) {
      const response = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model }));
      expect(response.status, model).toBe(422);
      expect((await response.json()).error.code, model).toBe("model_not_chat");
    }
    // Refused by name costs nothing: no provider call and no test counted.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc.mock.calls.filter((c) => c[0] === "ai_take_test")).toHaveLength(0);

    // A listed model with an innocent name that the provider will not chat with.
    fetchMock.mockResolvedValueOnce(models()).mockResolvedValueOnce(new Response('{"error":{"message":"This is not a chat model"}}', { status: 404 }));
    const refused = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-y" }));
    expect((await refused.json()).error).toMatchObject({ code: "model_not_chat" });
    expect(db.credential).toBeNull();

    // The model list only offers chat models.
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "gpt-x" }, { id: "text-embedding-3-large" }, { id: "whisper-1" }, { id: "gpt-image-1" }] }), { status: 200 }));
    expect(await (await listModels(request("/api/v1/connections/models", "POST", { provider_id: "openai", api_key: KEY }))).json()).toEqual({ ok: true, models: ["gpt-x"] });
  });

  it("limits Uji Koneksi to 5 per 10 minutes and makes no provider call once over", async () => {
    for (let i = 0; i < 5; i++) {
      fetchMock.mockResolvedValueOnce(models()).mockResolvedValueOnce(answer("pong"));
      expect((await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }))).status).toBe(201);
    }
    fetchMock.mockReset();
    const sixth = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }));
    expect(sixth.status).toBe(429);
    expect((await sixth.json()).error).toMatchObject({ code: "test_limited", retry_after_s: 420 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("makes no provider call on its own: status, connection read and delete never reach the provider", async () => {
    const cookie = await connected();
    await status();
    await getConnection();
    await disconnect(request("/api/v1/connections", "DELETE", undefined, cookie));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a one-word ping when the provider has no model list", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 404 })).mockResolvedValueOnce(answer("pong"));
    const response = await connect(request("/api/v1/connections", "POST", { provider_id: "custom", api_key: KEY, model: "lokal-1", base_url: "https://ai.example/v1/" }));
    expect(response.status).toBe(201);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["https://ai.example/v1/models", "https://ai.example/v1/chat/completions"]);
    expect(db.credential).toMatchObject({ provider_id: "custom", base_url: "https://ai.example/v1", model: "lokal-1" });
  });

  it("blocks private and non-https custom URLs before any request leaves the server (FR-BYOK-04)", async () => {
    for (const base_url of ["http://169.254.169.254", "https://169.254.169.254", "https://127.0.0.1:8080/v1", "https://localhost/v1", undefined]) {
      const response = await connect(request("/api/v1/connections", "POST", { provider_id: "custom", api_key: KEY, model: "m", base_url }));
      expect((await response.json()).error.code, String(base_url)).toBe("blocked_url");
    }
    lookup.mockResolvedValue([{ address: "10.1.2.3", family: 4 }]);
    expect((await listModels(request("/api/v1/connections/models", "POST", { provider_id: "custom", api_key: KEY, base_url: "https://rebind.example/v1" }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists models for a key without storing it, and refuses to store when the server has no encryption secret", async () => {
    fetchMock.mockResolvedValueOnce(models());
    expect(await (await listModels(request("/api/v1/connections/models", "POST", { provider_id: "groq", api_key: KEY }))).json()).toEqual({ ok: true, models: ["model-x", "model-y"] });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/models");
    expect(db.credential).toBeNull();
    vi.stubEnv("KEY_ENCRYPTION_SECRET", "");
    const response = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("byok_unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deletes the key and clears the cookie", async () => {
    const cookie = await connected();
    const response = await disconnect(request("/api/v1/connections", "DELETE", undefined, cookie));
    expect(await response.json()).toEqual({ connection: null });
    expect(response.headers.get("set-cookie")).toMatch(/^__Host-ata_kred=; Path=\/; .*Max-Age=0/);
    expect(db.credential).toBeNull();
    expect((await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }, cookie))).status).toBe(409);
  });
});

describe("POST /api/v1/tanya/chat (FR-CCH-01, FR-BYOK-03)", () => {
  it("answers through the user's provider with only permitted data, and returns provenance", async () => {
    db.categories = { lomba: true };
    const cookie = await connected();
    fetchMock.mockResolvedValueOnce(answer("Idemu kuat [S1]."));
    const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku", history: [{ role: "user", content: "hai" }, { role: "assistant", content: "halo" }] }, cookie));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const out = await events(response);
    expect(out.map((e) => e.type)).toEqual(["meta", "delta", "done"]);
    expect(out[0]).toMatchObject({ provider: "OpenAI", model: "model-x", provenance: {
      intent: "review_ide", sources: [{ id: "S1", category: "lomba", label: `Slot: ${NOTE}-lomba` }], blocked: [{ category: "profil", reason: "permission_off" }] } });
    expect(out[2]).toMatchObject({ validation: { ok: true, cited: ["S1"], warnings: [] }, usage: { inputTokens: 40, outputTokens: 6 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers).toMatchObject({ authorization: `Bearer ${KEY}` });
    const sent = JSON.parse(init.body as string);
    expect(sent.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(sent.messages[0].content).toContain(`${NOTE}-lomba`);
    expect(init.body as string).not.toContain(`${NOTE}-nama`);
    expect(db.runs).toEqual([expect.objectContaining({ p_mode: "direct", p_intent: "review_ide", p_provider_id: "openai", p_categories: ["lomba"],
      p_sources: [{ id: "S1", category: "lomba" }], status: "done", out: 6 })]);
    expect(JSON.stringify(db.runs)).not.toMatch(/RAHASIA|review ideku|Idemu/);
    expect(JSON.stringify(out)).not.toContain("SECRET");
    expect(logs.join("\n")).not.toMatch(/SECRET|RAHASIA|review ideku|Idemu/);
  });

  for (const [who, setup] of [
    ["a minor whose consent is pending", () => { db.age = "minor"; db.consent = "pending"; }],
    ["a minor who never asked a guardian", () => { db.age = "minor"; db.consent = "none"; }],
    ["a minor whose guardian refused", () => { db.age = "minor"; db.consent = "rejected"; }],
    ["a minor whose consent was revoked", () => { db.age = "minor"; db.consent = "revoked"; }],
    ["an account of unknown age", () => { db.age = "unknown"; db.consent = "verified"; }],
  ] as const) {
    it(`refuses ${who}: nothing goes to a provider, not even the question, and no key can be connected`, async () => {
      // The key was connected while the account was still allowed to.
      const cookie = await connected();
      db.categories = { lomba: true, profil: true };
      setup();
      db.tables.length = 0;
      const taken = db.taken;
      const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie));
      expect(response.status).toBe(403);
      expect((await response.json()).error).toMatchObject({ code: "guardian_consent_required" });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(db.tables).toEqual([]);
      expect(db.runs).toEqual([]);
      expect(db.taken).toBe(taken);

      const connectAgain = await connect(request("/api/v1/connections", "POST", { provider_id: "openai", api_key: KEY, model: "model-x" }));
      expect(connectAgain.status).toBe(403);
      expect((await connectAgain.json()).error.code).toBe("guardian_consent_required");
      expect(fetchMock).not.toHaveBeenCalled();
      const state = await (await status()).json();
      expect(Object.values(state.permissions)).toEqual(Array(8).fill({ allowed: false, reason: "guardian_consent_required" }));

      // A prompt to copy calls no AI and carries no account data.
      const handoff = await (await prompt(request("/api/v1/tanya/prompt", "POST", { question: "Tolong review ideku" }, cookie))).json();
      expect(handoff.provenance.sources).toEqual([]);
      expect(handoff.prompt).not.toContain(NOTE);
      expect(db.tables).not.toContain("user_competitions");
    });
  }

  for (const [reason, who, setup] of [
    ["permission_off", "an adult with the category off", () => { db.categories = {}; }],
    ["permission_off", "a minor with verified consent and the category off", () => { db.age = "minor"; db.consent = "verified"; db.categories = {}; }],
    ["permission_off", "a gate that fails", () => { db.gateError = true; db.categories = { lomba: true, profil: true }; }],
  ] as const) {
    it(`sends no account data for ${who} (${reason})`, async () => {
      const cookie = await connected();
      setup();
      db.tables.length = 0;
      fetchMock.mockResolvedValueOnce(answer("Oke."));
      const out = await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie)));
      expect(out[0].provenance).toMatchObject({ sources: [], blocked: [{ category: "lomba", reason }, { category: "profil", reason }] });
      expect(fetchMock.mock.calls[0][1].body as string).not.toContain(NOTE);
      expect(db.tables).not.toContain("user_competitions");
      expect(out.at(-1).type).toBe("done");
    });
  }

  it("re-reads permissions on every request: a category switched off between two questions is not sent the second time", async () => {
    const cookie = await connected();
    db.categories = { lomba: true };
    fetchMock.mockResolvedValueOnce(answer("Satu [S1]."));
    const first = await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie)));
    expect(first[0].provenance.sources).toHaveLength(1);
    const readsBefore = db.gateCalls;

    db.categories = {};
    fetchMock.mockResolvedValueOnce(answer("Dua."));
    const second = await events(await chat(request("/api/v1/tanya/chat", "POST", {
      question: "Tolong review ideku lagi", context_categories: ["lomba"],
      history: [{ role: "user", content: "Tolong review ideku" }, { role: "assistant", content: `Satu, tentang ${NOTE}-lomba` }],
    }, cookie)));
    expect(db.gateCalls).toBeGreaterThan(readsBefore);
    // The earlier turns were answered with the revoked category: they are dropped and the client is told to clear them.
    expect(second[0]).toMatchObject({ cleared: ["lomba"], provenance: { sources: [], blocked: [{ category: "lomba", reason: "permission_off" }, { category: "profil", reason: "permission_off" }] } });
    const sent = fetchMock.mock.calls[1][1].body as string;
    expect(sent).not.toContain(NOTE);
    expect(JSON.parse(sent).messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(db.tables.filter((t) => t === "user_competitions")).toHaveLength(1);

    // Still permitted: the history is kept.
    db.categories = { lomba: true };
    fetchMock.mockResolvedValueOnce(answer("Tiga [S1]."));
    const third = await events(await chat(request("/api/v1/tanya/chat", "POST", {
      question: "Tolong review ideku sekali lagi", context_categories: ["lomba"], history: [{ role: "user", content: "a" }, { role: "assistant", content: "b" }],
    }, cookie)));
    expect(third[0].cleared).toEqual([]);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string).messages).toHaveLength(4);
    expect((await chat(request("/api/v1/tanya/chat", "POST", { question: "x", context_categories: ["bukan-kategori"] }, cookie))).status).toBe(400);
  });

  it("lets a minor with verified guardian consent use a category that is on, and an adult exactly as before", async () => {
    for (const setup of [() => { db.age = "minor"; db.consent = "verified"; }, () => { db.age = "adult"; db.consent = "none"; }]) {
      setup();
      const cookie = await connected();
      db.categories = { lomba: true };
      fetchMock.mockResolvedValueOnce(answer("Idemu kuat [S1]."));
      const out = await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie)));
      expect(out[0].provenance).toMatchObject({ sources: [{ id: "S1", category: "lomba" }], blocked: [{ category: "profil", reason: "permission_off" }] });
      expect(fetchMock.mock.calls[0][1].body as string).toContain(`${NOTE}-lomba`);
      expect(out.at(-1).type).toBe("done");
      const state = await (await status()).json();
      expect(state.permissions.lomba).toEqual({ allowed: true });
      expect(state.permissions.profil).toEqual({ allowed: false, reason: "permission_off" });
    }
  });

  it("guardian consent withdrawn or refused between two questions: the next request is refused", async () => {
    db.age = "minor"; db.consent = "verified"; db.categories = { lomba: true };
    const cookie = await connected();
    fetchMock.mockResolvedValueOnce(answer("Satu [S1]."));
    expect((await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie))))[0].provenance.sources).toHaveLength(1);

    for (const consent of ["revoked", "rejected"] as const) {
      db.consent = consent;
      db.tables.length = 0;
      fetchMock.mockReset();
      const response = await chat(request("/api/v1/tanya/chat", "POST", {
        question: "Tolong review ideku lagi", context_categories: ["lomba"],
        history: [{ role: "user", content: "Tolong review ideku" }, { role: "assistant", content: `Satu, tentang ${NOTE}-lomba` }],
      }, cookie));
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("guardian_consent_required");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(db.tables).toEqual([]);
      expect((await (await status()).json()).permissions.lomba).toEqual({ allowed: false, reason: "guardian_consent_required" });
    }
    // Consent given again: allowed again, with nothing remembered in between.
    db.consent = "verified";
    fetchMock.mockResolvedValueOnce(answer("Tiga [S1]."));
    expect((await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie)))).at(-1).type).toBe("done");
  });

  it("guardian consent withdrawn while an answer that uses no account data streams: the answer still stops", async () => {
    db.age = "minor"; db.consent = "verified"; db.categories = {};
    const cookie = await connected();
    let providerSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      providerSignal = init.signal ?? undefined;
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "Awal" } }] })}\n\n`));
          init.signal?.addEventListener("abort", () => controller.close());
        },
      }));
    });
    const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "Halo Ata" }, cookie));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (!text.includes("Awal")) text += decoder.decode((await reader.read()).value);
    db.consent = "revoked";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    const out = text.split("\n\n").filter(Boolean).map((line) => JSON.parse(line.replace(/^data: /, "")));
    expect(out.at(-1)).toMatchObject({ type: "error", code: "permission_revoked", guardian: true, categories: [] });
    expect(providerSignal?.aborted).toBe(true);
    expect(db.runs.at(-1)).toMatchObject({ status: "stopped", error: "permission_revoked" });
  }, 15000);

  for (const [how, end] of [
    ["the provider stream errors on abort", (c: ReadableStreamDefaultController<Uint8Array>, signal: AbortSignal) => c.error(signal.reason ?? new DOMException("aborted", "AbortError"))],
    ["the provider stream just ends on abort", (c: ReadableStreamDefaultController<Uint8Array>) => c.close()],
    ["the provider sends a normal finish on abort", (c: ReadableStreamDefaultController<Uint8Array>) => {
      c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`));
      c.close();
    }],
  ] as const) {
    for (const firstDelta of [true, false]) {
      it(`guardian consent withdrawn while an answer streams (${how}, ${firstDelta ? "after" : "before"} the first text): always ends with permission_revoked`, async () => {
        db.age = "minor"; db.consent = "verified"; db.categories = { lomba: true };
        const cookie = await connected();
        let providerSignal: AbortSignal | undefined;
        fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
          providerSignal = init.signal ?? undefined;
          return new Response(new ReadableStream<Uint8Array>({
            start(controller) {
              if (firstDelta) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "Awal jawaban" } }] })}\n\n`));
              init.signal?.addEventListener("abort", () => end(controller, init.signal!));
            },
          }));
        });
        const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie));
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let text = decoder.decode((await reader.read()).value);
        while (firstDelta && !text.includes("Awal jawaban")) text += decoder.decode((await reader.read()).value);
        db.consent = "revoked";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value);
        }
        const out = text.split("\n\n").filter(Boolean).map((line) => JSON.parse(line.replace(/^data: /, "")));
        expect(out.map((e) => e.type)).toEqual(firstDelta ? ["meta", "delta", "error"] : ["meta", "error"]);
        expect(out.at(-1)).toMatchObject({ code: "permission_revoked", categories: ["lomba"], guardian: true, partial: false });
        expect(providerSignal?.aborted).toBe(true);
        expect(db.runs.at(-1)).toMatchObject({ status: "stopped", error: "permission_revoked" });
      }, 15000);
    }
  }

  it("stops a running answer when a category it uses is revoked: the provider call is aborted and the stream ends with permission_revoked", async () => {
    const cookie = await connected();
    db.categories = { lomba: true };
    let providerSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      providerSignal = init.signal ?? undefined;
      const encoder = new TextEncoder();
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "Awal jawaban" } }] })}\n\n`));
          // The provider keeps the stream open; only an abort ends it.
          init.signal?.addEventListener("abort", () => controller.error(init.signal?.reason ?? new DOMException("aborted", "AbortError")));
        },
      }));
    });
    const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "Tolong review ideku" }, cookie));
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (!text.includes("Awal jawaban")) text += decoder.decode((await reader.read()).value);
    db.categories = {};
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
    }
    const out = text.split("\n\n").filter(Boolean).map((line) => JSON.parse(line.replace(/^data: /, "")));
    expect(out.map((e) => e.type)).toEqual(["meta", "delta", "error"]);
    expect(out[2]).toMatchObject({ code: "permission_revoked", categories: ["lomba"] });
    expect(providerSignal?.aborted).toBe(true);
    expect(db.runs.at(-1)).toMatchObject({ status: "stopped", error: "permission_revoked" });
  }, 15000);

  it("keeps no chat anywhere on the server: nothing logged, nothing stored, and the client code has no storage or analytics", async () => {
    const cookie = await connected();
    db.categories = { lomba: true };
    fetchMock.mockResolvedValueOnce(answer("JAWABAN-UNIK-123 [S1]."));
    await events(await chat(request("/api/v1/tanya/chat", "POST", {
      question: "PERTANYAAN-UNIK-456 review ideku", history: [{ role: "user", content: "RIWAYAT-UNIK-789" }, { role: "assistant", content: "balasan" }],
    }, cookie)));
    fetchMock.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await events(await chat(request("/api/v1/tanya/chat", "POST", { question: "PERTANYAAN-UNIK-456 gagal" }, cookie)));
    await prompt(request("/api/v1/tanya/prompt", "POST", { question: "PERTANYAAN-UNIK-456 prompt" }, cookie));
    const unique = /UNIK-(123|456|789)/;
    // Everything written to the database goes through rpc(); every console level is captured in `logs`.
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(unique);
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(NOTE);
    expect(JSON.stringify(db.runs)).not.toMatch(unique);
    expect(logs.join("\n")).not.toMatch(unique);
    expect(logs.join("\n")).not.toContain("SECRET");
    // Only the user's provider receives the conversation.
    expect(fetchMock.mock.calls.every((c) => String(c[0]).startsWith("https://api.openai.com/"))).toBe(true);

    const files = [...walk("src/lib/tanya"), ...walk("src/app/api/v1/tanya"), ...walk("src/app/api/v1/connections"), ...walk("src/app/(ata)/(apl)/ata")];
    expect(files.length).toBeGreaterThan(12);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|posthog|gtag|analytics\.|console\./i);
    }
    // The migration has no column that could hold a question, an answer or a prompt.
    const sql = readFileSync("supabase/migrations/0009_tanya_ata.sql", "utf8");
    const table = sql.slice(sql.indexOf("create table public.tanya_runs"), sql.indexOf("create index tanya_runs_user_created"));
    expect(table).not.toMatch(/\b(question|answer|prompt|content|message|text_|body)\b\s+(text|jsonb)/i);
  });

  it("does not call a provider without a usable connection", async () => {
    const none = await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }));
    expect([none.status, (await none.json()).error.code]).toEqual([409, "no_connection"]);
    const cookie = await connected();
    const lost = await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }));
    expect([lost.status, (await lost.json()).error.code]).toEqual([409, "connection_expired"]);
    expect(db.credential).toBeNull();
    await connected();
    const wrong = await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }, cookie));
    expect(wrong.status).toBe(409);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates input and enforces 30 requests a minute (FR-CCH-06, FR-BYOK-10)", async () => {
    const cookie = await connected();
    for (const bad of [{}, { question: "   " }, { question: "hai", history: [{ role: "system", content: "x" }] }, { question: "hai", lain: 1 }, "bukan json"]) {
      expect((await chat(request("/api/v1/tanya/chat", "POST", bad, cookie))).status).toBe(400);
    }
    const long = await chat(request("/api/v1/tanya/chat", "POST", { question: "a".repeat(12001) }, cookie));
    expect(long.status).toBe(413);
    expect((await long.json()).error.message).toBe("Teksmu 12.001 karakter, batasnya 12.000. Potong 1 karakter dulu.");
    db.taken = 30;
    const limited = await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }, cookie));
    expect([limited.status, limited.headers.get("retry-after")]).toEqual([429, "17"]);
    expect((await limited.json()).error).toMatchObject({ code: "rate_limited", retry_after_s: 17 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports provider failures as an error event with a fix, and records the run as failed (FR-CCH-07)", async () => {
    const cookie = await connected();
    const cases: [Response, string, string][] = [
      [new Response(`invalid ${KEY}`, { status: 401 }), "key_rejected", "reconnect"],
      [new Response("", { status: 429, headers: { "retry-after": "9" } }), "rate_limited", "wait"],
      [new Response("", { status: 404 }), "model_unavailable", "change_model"],
      [new Response('data: {"choices":[{"delta":{"content":"Sete"}}]}\n\n'), "network", "retry"],
      [sse([{ choices: [{ delta: {}, finish_reason: "stop" }] }]), "empty_output", "retry"],
    ];
    for (const [reply, code, action] of cases) {
      fetchMock.mockResolvedValueOnce(reply);
      const response = await chat(request("/api/v1/tanya/chat", "POST", { question: "hai" }, cookie));
      const text = await response.text();
      expect(text).not.toContain("SECRET");
      const last = JSON.parse(text.trim().split("\n\n").at(-1)!.replace(/^data: /, ""));
      expect(last, code).toMatchObject({ type: "error", code, action });
      expect(db.runs.at(-1)).toMatchObject({ status: "error", error: code });
    }
  });
});

describe("POST /api/v1/tanya/prompt (Mode Tanpa Key) and GET status", () => {
  it("returns a prompt to copy, calls no provider, and includes only permitted data", async () => {
    db.categories = { lomba: true };
    const response = await prompt(request("/api/v1/tanya/prompt", "POST", { question: "Tolong review ideku" }));
    const body = await response.json();
    expect(body.mode).toBe("handoff");
    expect(body.prompt).toContain(`${NOTE}-lomba`);
    expect(body.prompt).not.toContain(`${NOTE}-nama`);
    expect(body.prompt.endsWith("Pertanyaanku:\nTolong review ideku")).toBe(true);
    expect(body.provenance.blocked).toEqual([{ category: "profil", reason: "permission_off" }]);
    expect(body).not.toHaveProperty("answer");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.runs).toEqual([expect.objectContaining({ p_mode: "handoff", status: "done" })]);
  });

  it("works signed out with no account data at all (reason signed_out)", async () => {
    signedOut();
    const body = await (await prompt(request("/api/v1/tanya/prompt", "POST", { question: "Tolong review ideku" }))).json();
    expect(body.provenance).toMatchObject({ sources: [], blocked: [{ category: "lomba", reason: "signed_out" }, { category: "profil", reason: "signed_out" }] });
    expect(body.prompt).not.toContain(NOTE);
    expect(from).not.toHaveBeenCalled();
    expect((await prompt(request("/api/v1/tanya/prompt", "POST", { question: "x" }, "", "https://lain.example"))).status).toBe(403);
  });

  it("reports sign-in, connection and per-category permission state", async () => {
    db.categories = { tugas: true };
    await connected("anthropic").catch(() => {});
    const body = await (await status()).json();
    expect(body).toMatchObject({ signed_in: true, byok_available: true, permissions: { tugas: { allowed: true }, profil: { allowed: false, reason: "permission_off" } } });
    expect(body.providers.map((p: { id: string }) => p.id)).toEqual(["openai", "anthropic", "google", "xai", "deepseek", "openrouter", "groq", "mistral", "custom"]);
    expect(Object.keys(body.permissions)).toHaveLength(8);
    signedOut();
    const out = await (await status()).json();
    expect(out).toMatchObject({ signed_in: false, connection: null, permissions: { profil: { allowed: false, reason: "signed_out" } } });
  });
});
