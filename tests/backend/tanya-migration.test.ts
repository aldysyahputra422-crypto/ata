import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sessions: Record<string, string> = { [a]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [b]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };
const otherSession = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0009";

async function as(userId: string, sessionId = sessions[userId]) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessionId })]);
  await db.exec("set role authenticated");
}
const admin = () => db.exec("reset role");
type Row = Record<string, unknown>;
const one = async (sql: string, params: unknown[] = []) => (await db.query<{ r: unknown }>(sql, params)).rows[0].r;
const begin = async () => (await one("select public.ai_credential_begin() as r")) as { user_id: string; session_id: string; connection_id: string };
const put = async (connectionId: string, provider = "openai") =>
  (await one("select public.ai_credential_put($1, $2, null, 'model-x', '1234', 1, 'aXY=', 'Y2lwaGVy', 'dGFn') as r", [connectionId, provider])) as Row;
const get = async (secret = false) => (await one("select public.ai_credential_get($1) as r", [secret])) as Row | null;

describe("0009 Tanya Ata storage (FR-BYOK-02, FR-BYOK-10)", () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      grant usage on schema auth to anon, authenticated, service_role;
      create table auth.users (id uuid primary key);
      create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users (id) on delete cascade, not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
    `);
    for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(new URL(file, migrations), "utf8"));
    }
    await db.query("insert into auth.users (id) values ($1), ($2)", [a, b]);
    await db.query("insert into auth.sessions values ($1, $2, null), ($3, $4, null), ($5, $2, null)", [sessions[a], a, sessions[b], b, otherSession]);
  }, 20000);

  beforeEach(async () => {
    await admin();
    await db.exec("delete from public.ai_credentials; delete from public.ai_request_counters; delete from public.tanya_runs");
  });

  afterAll(async () => { await db.close(); });

  it("turns RLS on and gives client roles no direct access to credentials or counters", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relname in ('ai_credentials', 'ai_request_counters', 'tanya_runs')");
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    await as(a);
    await put((await begin()).connection_id);
    for (const sql of [
      "select * from public.ai_credentials",
      "select ciphertext from public.ai_credentials",
      "delete from public.ai_credentials",
      "insert into public.ai_request_counters values (auth.uid(), now(), 1)",
      "select * from public.ai_request_counters",
      "insert into public.tanya_runs (user_id, mode, intent) values (auth.uid(), 'direct', 'umum')",
      "update public.tanya_runs set status = 'done'",
    ]) await expect(db.exec(sql), sql).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role; set role anon");
    for (const sql of ["select * from public.ai_credentials", "select * from public.tanya_runs", "select public.ai_credential_get(true)", "select public.ai_take_request()"])
      await expect(db.exec(sql), sql).rejects.toMatchObject({ code: "42501" });
  });

  it("binds a credential to the caller's account and session, and replaces the previous one", async () => {
    const audited = async () => {
      await admin();
      return (await db.query("select 1 from public.audit_log where actor_id = $1 and action = 'ai_connection_create'", [a])).rows.length;
    };
    const before = await audited();
    await as(a);
    const ids = await begin();
    expect(ids).toMatchObject({ user_id: a, session_id: sessions[a] });
    const saved = await put(ids.connection_id);
    expect(saved).toMatchObject({ connection_id: ids.connection_id, provider_id: "openai", model: "model-x", last4: "1234" });
    expect(Object.keys(saved)).not.toContain("ciphertext");
    expect(Object.keys((await get())!).sort()).toEqual(["base_url", "connection_id", "expires_at", "last4", "model", "provider_id"]);
    expect(await get(true)).toMatchObject({ user_id: a, session_id: sessions[a], ciphertext: "Y2lwaGVy", iv: "aXY=", tag: "dGFn", kek_version: 1 });
    await put((await begin()).connection_id, "anthropic");
    await admin();
    expect((await db.query("select provider_id from public.ai_credentials")).rows).toEqual([{ provider_id: "anthropic" }]);
    expect(await audited()).toBe(before + 2);
    expect((await db.query("select meta::text as meta from public.audit_log where action = 'ai_connection_create'")).rows
      .every((row) => !String((row as Row).meta).includes("Y2lwaGVy"))).toBe(true);
  });

  it("hides a credential from another account and from another session of the same account", async () => {
    await as(a);
    await put((await begin()).connection_id);
    await as(b);
    expect(await get(true)).toBeNull();
    expect(await one("select public.ai_credential_delete() as r")).toBe(false);
    await as(a, otherSession);
    expect(await get(true)).toBeNull();
    await as(a);
    expect(await get()).not.toBeNull();
  });

  it("drops the credential when it is idle, past its hard limit, deleted, or its session ends", async () => {
    await as(a);
    await put((await begin()).connection_id);
    await admin();
    await db.exec("update public.ai_credentials set idle_expires_at = now() - interval '1 second'");
    await as(a);
    expect(await get(true)).toBeNull();
    await admin();
    expect((await db.query("select 1 from public.ai_credentials")).rows).toHaveLength(0);

    await as(a);
    await put((await begin()).connection_id);
    await admin();
    await db.exec("update public.ai_credentials set absolute_expires_at = now() + interval '10 minutes'");
    await as(a);
    await get(true);
    await admin();
    expect((await db.query("select idle_expires_at <= absolute_expires_at as ok from public.ai_credentials")).rows).toEqual([{ ok: true }]);
    await db.exec("update public.ai_credentials set absolute_expires_at = now() - interval '1 second'");
    await as(a);
    expect(await get()).toBeNull();

    await put((await begin()).connection_id);
    expect(await one("select public.ai_credential_delete() as r")).toBe(true);
    expect(await get()).toBeNull();

    await put((await begin()).connection_id);
    await admin();
    await db.query("delete from auth.sessions where id = $1", [sessions[a]]);
    expect((await db.query("select 1 from public.ai_credentials")).rows).toHaveLength(0);
    await db.query("insert into auth.sessions values ($1, $2, null)", [sessions[a], a]);
  });

  it("refuses every function for a revoked session", async () => {
    await as(a, "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0404");
    for (const sql of ["select public.ai_credential_begin()", "select public.ai_credential_get(true)", "select public.ai_credential_delete()",
      "select public.ai_take_request()", "select public.tanya_run_start('direct', 'umum', null, null, '{}', '[]', '[]')"])
      await expect(db.exec(sql), sql).rejects.toMatchObject({ code: "42501" });
  });

  it("allows 30 requests a minute per account, then asks to wait", async () => {
    await as(a);
    for (let i = 0; i < 30; i++) expect(await one("select public.ai_take_request() as r")).toBe(0);
    const wait = (await one("select public.ai_take_request() as r")) as number;
    expect(wait).toBeGreaterThanOrEqual(1);
    expect(wait).toBeLessThanOrEqual(60);
    await as(b);
    expect(await one("select public.ai_take_request() as r")).toBe(0);
    await admin();
    await db.exec("update public.ai_request_counters set window_start = window_start - interval '2 minutes'");
    await as(a);
    expect(await one("select public.ai_take_request() as r")).toBe(0);
  });

  it("records what a run used, readable by its owner only, with no content columns", async () => {
    const { rows: columns } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'public' and table_name = 'tanya_runs'");
    expect(columns.map((c) => c.column_name).sort()).toEqual(["blocked", "categories_sent", "created_at", "error_code", "finished_at", "id",
      "input_tokens", "intent", "mode", "model", "output_tokens", "provider_id", "sources", "status", "user_id"]);
    await as(a);
    const run = await one("select public.tanya_run_start('direct', 'strategi_lomba', 'openai', 'model-x', '{lomba}', $1, $2) as r",
      [JSON.stringify([{ id: "S1", category: "lomba" }]), JSON.stringify([{ category: "profil", reason: "permission_off" }])]);
    expect(run).toEqual(expect.any(String));
    expect(await one("select public.tanya_run_start('direct', 'umum', null, null, '{rahasia}', '[]', '[]') as r")).toBeNull();
    expect(await one("select public.tanya_run_start('lain', 'umum', null, null, '{}', '[]', '[]') as r")).toBeNull();
    expect((await db.query("select status, categories_sent from public.tanya_runs")).rows).toEqual([{ status: "started", categories_sent: ["lomba"] }]);
    await as(b);
    expect((await db.query("select id from public.tanya_runs")).rows).toHaveLength(0);
    expect(await one("select public.tanya_run_finish($1, 'done', null, 1, 1) as r", [run])).toBe(false);
    await as(a);
    expect(await one("select public.tanya_run_finish($1, 'done', null, 120, 45) as r", [run])).toBe(true);
    expect(await one("select public.tanya_run_finish($1, 'error', 'x', 0, 0) as r", [run])).toBe(false);
    expect((await db.query("select status, input_tokens, output_tokens from public.tanya_runs")).rows).toEqual([{ status: "done", input_tokens: 120, output_tokens: 45 }]);
    expect(await one("select public.tanya_run_start('handoff', 'umum', null, null, '{}', '[]', '[]') is not null as r")).toBe(true);
  });
});
