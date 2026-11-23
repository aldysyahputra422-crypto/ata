import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Tanya Ata's gate is `canProcessAi` (FR-AUTH-07) and nothing else. Here it runs against the real SQL of
// migrations 0001-0009 in PGlite: the Supabase client is replaced by one that calls the same functions.
vi.mock("server-only", () => ({}));
const { current } = vi.hoisted(() => ({ current: { user: null as string | null, fail: false } }));
const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb000b";
const sessions: Record<string, string> = { [a]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [b]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };

async function as(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessions[userId] })]);
  await db.exec("set role authenticated");
}
const secondSession = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0009";
/** Stores a (fake) encrypted key for `userId` in `sessionId`, as the connect route does. */
async function storeKey(userId: string, sessionId = sessions[userId]) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessionId })]);
  await db.exec("set role authenticated");
  const ids = await call("public.ai_credential_begin()");
  const put = await call("public.ai_credential_put($1, 'openai', null, 'model-x', '1234', 1, 'aXY=', 'Y2lwaGVy', 'dGFn', 'd3JhcA==', $2)", [ids.connection_id, Math.floor(Date.now() / 1000) + 3600]);
  expect(put).toMatchObject({ provider_id: "openai" });
}
const keys = async (userId: string) => {
  await superuser();
  return (await db.query<{ c: number }>("select count(*)::int as c from public.ai_credentials where user_id = $1", [userId])).rows[0].c;
};
const superuser = () => db.exec("reset role");
const server = async () => { await db.exec("reset role"); await db.exec("set role service_role"); };
type Result = Record<string, unknown>;
const call = async (sql: string, params: unknown[] = []) => (await db.query<{ r: Result }>(`select ${sql} as r`, params)).rows[0].r;

const client = {
  auth: { getUser: async () => ({ data: { user: current.user ? { id: current.user, is_anonymous: false } : null }, error: null }) },
  async rpc(name: string, args: Record<string, unknown> = {}) {
    if (current.fail) throw new Error("database unreachable");
    if (!current.user) return { data: null, error: { code: "42501" } };
    await as(current.user);
    const keys = Object.keys(args);
    try {
      return { data: await call(`public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`, keys.map((k) => args[k])), error: null };
    } catch (error) {
      return { data: null, error: { code: "x", message: String(error) } };
    }
  },
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));

import { gateFor, gateSummary, revokedAmong } from "@/lib/tanya/server";
import { retrieveContext } from "@/lib/tanya/context";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
function born(years: number) {
  const d = new Date(`${today()}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}
const profile = (birth_date: string) => ({ display_name: "Raka", jenjang: "SMA/SMK", birth_date });
const patch = (value: unknown) => call("public.update_profile($1::jsonb)", [JSON.stringify(value)]);
const allow = async (user: string, category: string) => { await as(user); return call("public.set_ai_permission($1, true)", [category]); };
async function request(user: string, token: string) {
  await server();
  const made = await call("public.create_guardian_consent_request($1, $2, $3, $4, $5, $6)", [user, "Bu Sari", sha("wali@contoh.id"), "w***@contoh.id", sha(token), "v1"]);
  await call("public.record_guardian_consent_delivery($1, true, 'ref-1')", [made.id]);
}
const confirm = async (token: string, approve: boolean) => {
  await server();
  return call("public.confirm_guardian_consent($1, $2, $3, $4)", [sha(token), approve, "Sari Wulandari", approve ? sha("cabut-" + token) : null]);
};
/** A minor (16) signed in as `user`; `consent` says how far the guardian got. */
async function minor(user: string, consent: "none" | "pending" | "verified" | "rejected") {
  await as(user);
  await patch(profile(born(16)));
  if (consent === "none") return;
  await request(user, "tok-" + user);
  if (consent !== "pending") await confirm("tok-" + user, consent === "verified");
}
const gate = () => gateFor(client as never);
const REQUIRED = { allowed: false, reason: "guardian_consent_required" };
const OFF = { allowed: false, reason: "permission_off" };

describe("Tanya Ata on the guardian-consent gate (FR-AUTH-07, FR-AUTH-09; migrations 0008 + 0009)", () => {
  beforeAll(async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
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
    const files = readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort();
    // 0008 (guardian consent) is applied before 0009 (Tanya Ata), in file order.
    expect(files.map((name) => name.slice(0, 4)).slice(-2)).toEqual(["0008", "0009"]);
    for (const file of files) await db.exec(readFileSync(new URL(file, migrations), "utf8"));
    await db.query("insert into auth.users (id) values ($1), ($2)", [a, b]);
    await db.query("insert into auth.sessions values ($1, $2, null), ($3, $4, null), ($5, $2, null)", [sessions[a], a, sessions[b], b, secondSession]);
  }, 30000);

  beforeEach(async () => {
    await superuser();
    await db.exec(`
      delete from public.ai_credentials; delete from public.guardian_consents; delete from public.birth_date_corrections; delete from public.profiles; delete from public.ai_permissions; delete from public.audit_log;
      insert into public.profiles (user_id) select id from auth.users;
      insert into public.ai_permissions (user_id) select id from auth.users;
    `);
    current.user = a;
    current.fail = false;
  });
  afterAll(async () => { await db.close(); });

  it("refuses every category for a minor whose guardian has not answered, and never reads the data", async () => {
    for (const consent of ["none", "pending"] as const) {
      await minor(a, consent);
      const summary = await gateSummary(gate(), a);
      expect(Object.values(summary).every((d) => !d.allowed && d.reason === "guardian_consent_required"), consent).toBe(true);
      const read = vi.fn(async (category: string) => [{ label: "Slot", text: `rahasia ${category}` }]);
      const context = await retrieveContext({ userId: a, wanted: ["lomba", "profil"], gate: gate(), read });
      expect(context.sources).toEqual([]);
      expect(context.blocked.every((x) => x.reason === "guardian_consent_required")).toBe(true);
      expect(read).not.toHaveBeenCalled();
    }
  });

  it("allows a minor with verified guardian consent, for the categories that are switched on only", async () => {
    await minor(a, "verified");
    expect(await gate()(a, "lomba")).toEqual(OFF);
    expect(await allow(a, "lomba")).not.toHaveProperty("error");
    expect(await gate()(a, "lomba")).toEqual({ allowed: true });
    expect(await gate()(a, "profil")).toEqual(OFF);
    const read = vi.fn(async (category: string) => [{ label: "Slot", text: `isi ${category}` }]);
    const context = await retrieveContext({ userId: a, wanted: ["lomba", "profil"], gate: gate(), read });
    expect(context.sources.map((x) => x.category)).toEqual(["lomba"]);
    expect(read.mock.calls.map((c) => c[0])).toEqual(["lomba"]);
  });

  it("closes again the moment consent ends: revoked by the student, withdrawn by the guardian, or refused", async () => {
    await minor(a, "verified");
    await allow(a, "lomba");
    const sameGate = gate();
    expect(await revokedAmong(sameGate, a, ["lomba"])).toEqual([]);
    await as(a);
    expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
    // The same gate object sees the change: nothing is cached between calls.
    expect(await revokedAmong(sameGate, a, ["lomba"])).toEqual(["lomba"]);
    expect(await sameGate(a, "lomba")).toEqual(REQUIRED);

    await minor(b, "verified");
    await allow(b, "lomba");
    current.user = b;
    expect(await gate()(b, "lomba")).toEqual({ allowed: true });
    await server();
    expect(await call("public.withdraw_guardian_consent($1)", [sha("cabut-tok-" + b)])).toMatchObject({ status: "revoked" });
    expect(await revokedAmong(gate(), b, ["lomba"])).toEqual(["lomba"]);
    expect(await gate()(b, "lomba")).toEqual(REQUIRED);
  });

  it("deletes the account's stored keys in every session the moment guardian consent ends", async () => {
    await minor(a, "verified");
    await storeKey(a);
    await storeKey(a, secondSession);
    await minor(b, "verified");
    await storeKey(b);
    expect([await keys(a), await keys(b)]).toEqual([2, 1]);

    await as(a);
    expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
    expect([await keys(a), await keys(b)]).toEqual([0, 1]);
    await server();
    expect(await call("public.withdraw_guardian_consent($1)", [sha("cabut-tok-" + b)])).toMatchObject({ status: "revoked" });
    expect(await keys(b)).toBe(0);
  });

  it("leaves an adult's key alone when a former guardian withdraws the consent given while they were a minor", async () => {
    await minor(a, "verified");
    // The student has since turned 18 and connected a key as an adult.
    await superuser();
    await db.query("update public.profiles set birth_date = $2 where user_id = $1", [a, born(18)]);
    await storeKey(a);
    await server();
    expect(await call("public.withdraw_guardian_consent($1)", [sha("cabut-tok-" + a)])).toMatchObject({ status: "revoked" });
    expect(await keys(a)).toBe(1);
    await server();
    expect(await call("public.ai_credentials_purge()")).toBe(0);
    expect(await keys(a)).toBe(1);
  });

  it("purges the key of an account that came to need guardian consent another way, and leaves an adult's key alone", async () => {
    await as(a);
    await patch(profile(born(21)));
    await storeKey(a);
    await as(b);
    await patch(profile(born(21)));
    await storeKey(b);
    // The account's recorded age changes without a consent row changing (for example a corrected birth date).
    await superuser();
    await db.query("update public.profiles set birth_date = $2 where user_id = $1", [a, born(16)]);
    await server();
    expect(await call("public.ai_credentials_purge()")).toBe(1);
    expect([await keys(a), await keys(b)]).toEqual([0, 1]);
  });

  it("refuses a minor whose guardian said no", async () => {
    await minor(a, "rejected");
    expect(await gate()(a, "lomba")).toEqual(REQUIRED);
    expect(await revokedAmong(gate(), a, ["lomba", "profil"])).toEqual(["lomba", "profil"]);
  });

  it("leaves an adult unchanged: only the category switch decides", async () => {
    await as(a);
    await patch(profile(born(21)));
    expect(await gate()(a, "lomba")).toEqual(OFF);
    await allow(a, "lomba");
    expect(await gate()(a, "lomba")).toEqual({ allowed: true });
    expect(await gate()(a, "tugas")).toEqual(OFF);
  });

  it("refuses an account of unknown age", async () => {
    // No birth date and no birth year: the profile row as it is created.
    const summary = await gateSummary(gate(), a);
    expect(Object.values(summary).every((d) => !d.allowed && d.reason === "guardian_consent_required")).toBe(true);
  });

  it("fails closed: signed out, another account's id, an unknown category, and a gate that cannot be reached", async () => {
    await as(a);
    await patch(profile(born(21)));
    await allow(a, "lomba");
    expect(await gate()(null, "lomba")).toEqual({ allowed: false, reason: "signed_out" });
    expect(await gateFor(null)(a, "lomba")).toEqual({ allowed: false, reason: "signed_out" });
    expect(await gate()(b, "lomba")).toEqual({ allowed: false, reason: "signed_out" });
    expect((await gate()(a, "lain" as never)).allowed).toBe(false);
    current.fail = true;
    expect(await gate()(a, "lomba")).toEqual({ allowed: false });
    expect(await revokedAmong(gate(), a, ["lomba"])).toEqual(["lomba"]);
    current.fail = false;
    current.user = null;
    expect(await gate()(a, "lomba")).toEqual({ allowed: false, reason: "signed_out" });
  });
});
