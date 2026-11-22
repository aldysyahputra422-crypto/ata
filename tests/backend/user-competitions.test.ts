import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PLAN_FEATURES } from "@/lib/entitlements/config";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const free = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const pro = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sessions: Record<string, string> = { [free]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [pro]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };
const freeLimit = PLAN_FEATURES.free.activeSlots.limit!;
const proLimit = PLAN_FEATURES.pro.activeSlots.limit!;

async function as(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessions[userId] })]);
  await db.exec("set role authenticated");
}
const admin = () => db.exec("reset role");
const add = (key: string, state: string) =>
  db.query("insert into public.user_competitions (competition_key, state) values ($1, $2)", [key, state]);
const setState = (key: string, state: string) =>
  db.query("update public.user_competitions set state = $2 where competition_key = $1", [key, state]);
const count = async (state = "slot") =>
  Number((await db.query<{ n: number }>("select count(*)::int as n from public.user_competitions where state = $1", [state])).rows[0].n);

describe("0005 user_competitions (K-03, K-23)", () => {
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
    await db.query("insert into auth.users (id) values ($1), ($2)", [free, pro]);
    await db.query("insert into auth.sessions values ($1, $2, null), ($3, $4, null)", [sessions[free], free, sessions[pro], pro]);
  }, 20000);

  beforeEach(async () => {
    await admin();
    await db.exec("delete from public.user_competitions; delete from public.entitlements");
    await db.query("insert into public.entitlements (user_id, source, ends_at) values ($1, 'grant', now() + interval '30 days')", [pro]);
  });

  afterAll(async () => { await db.close(); });

  it("has RLS on and isolates accounts for read, update and delete", async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid = 'public.user_competitions'::regclass");
    expect(rows[0].relrowsecurity).toBe(true);

    await as(free);
    await add("lomba-a", "saved");
    await as(pro);
    expect((await db.query("select 1 from public.user_competitions")).rows).toHaveLength(0);
    expect((await setState("lomba-a", "skipped")).affectedRows).toBe(0);
    expect((await db.query("delete from public.user_competitions where competition_key = 'lomba-a'")).affectedRows).toBe(0);
    await expect(db.query("insert into public.user_competitions (user_id, competition_key, state) values ($1, 'x', 'saved')", [free])).rejects.toThrow();
    await as(free);
    expect((await db.query("select 1 from public.user_competitions")).rows).toHaveLength(1);
  });

  it("denies anonymous and expired sessions", async () => {
    await admin();
    await db.exec("set role anon");
    await expect(db.query("select 1 from public.user_competitions")).rejects.toThrow(/permission denied/);
    await admin();
    await db.query("update auth.sessions set not_after = now() - interval '1 minute' where id = $1", [sessions[free]]);
    await as(free);
    await expect(add("lomba-a", "saved")).rejects.toThrow(/row-level security/);
    await admin();
    await db.query("update auth.sessions set not_after = null where id = $1", [sessions[free]]);
  });

  it("limits Free to the configured active Slots and leaves saved and skipped unlimited", async () => {
    await as(free);
    for (let i = 0; i < freeLimit; i++) await add(`slot-${i}`, "slot");
    await expect(add("slot-lebih", "slot")).rejects.toThrow(/slot_limit_reached/);
    for (let i = 0; i < 12; i++) await add(`simpan-${i}`, i % 2 ? "saved" : "skipped");
    await expect(setState("simpan-1", "slot")).rejects.toThrow(/slot_limit_reached/);
    expect(await count()).toBe(freeLimit);
    // releasing frees the place; the row and its roadmap are kept
    await db.query("update public.user_competitions set roadmap = '{\"langkah\":[]}' where competition_key = 'slot-0'");
    await setState("slot-0", "released");
    await setState("simpan-1", "slot");
    expect((await db.query<{ roadmap: unknown }>("select roadmap from public.user_competitions where competition_key = 'slot-0'")).rows[0].roadmap).toEqual({ langkah: [] });
  });

  it("limits Pro to the configured active Slots", async () => {
    await as(pro);
    for (let i = 0; i < proLimit; i++) await add(`slot-${i}`, "slot");
    await expect(add("slot-lebih", "slot")).rejects.toThrow(/slot_limit_reached/);
    expect(await count()).toBe(proLimit);
  });

  it("keeps Slots above the limit after a downgrade: editable and releasable, never removed, no new ones", async () => {
    await as(pro);
    for (let i = 0; i < proLimit; i++) await add(`slot-${i}`, "slot");
    await admin();
    await db.query("update public.entitlements set status = 'revoked' where user_id = $1", [pro]);
    await as(pro);
    expect(await count()).toBe(proLimit);
    await db.query("update public.user_competitions set roadmap = '{\"disetujui\":true}' where competition_key = 'slot-1'");
    await expect(add("slot-baru", "slot")).rejects.toThrow(/slot_limit_reached/);
    await setState("slot-2", "released");
    expect(await count()).toBe(proLimit - 1);
    if (proLimit - 1 >= freeLimit) await expect(setState("slot-2", "slot")).rejects.toThrow(/slot_limit_reached/);
  });

  it("the API's statements work at capacity; a PostgREST-style upsert would not", async () => {
    await as(free);
    for (let i = 0; i < freeLimit; i++) await add(`s-${i}`, "slot");
    // what PUT sends for an existing row: only granted columns, RETURNING the row
    const edited = await db.query("update public.user_competitions set state = 'slot', source = 'catalog', roadmap = '{\"langkah\":[]}' where competition_key = 's-0' returning competition_key");
    expect(edited.rows).toHaveLength(1);
    const created = await db.query("insert into public.user_competitions (competition_key, state, source) values ('baru', 'saved', 'catalog') returning competition_key");
    expect(created.rows).toHaveLength(1);
    await expect(db.query(`insert into public.user_competitions (competition_key, state, source) values ('s-0', 'slot', 'catalog')
      on conflict (user_id, competition_key) do update set competition_key = excluded.competition_key, state = excluded.state`)).rejects.toThrow();
  });

  it("keeps ownership, key and timestamps out of client control", async () => {
    await as(free);
    await add("lomba-a", "saved");
    await expect(db.query("update public.user_competitions set user_id = $1", [pro])).rejects.toThrow(/permission denied/);
    await expect(db.query("update public.user_competitions set competition_key = 'lain'")).rejects.toThrow(/permission denied/);
    await expect(add("../x", "saved")).rejects.toThrow(/check constraint/);
    await expect(add("lomba-b", "arsip")).rejects.toThrow(/check constraint/);
    await expect(db.query("insert into public.user_competitions (competition_key, state, card) values ('besar', 'saved', $1)", [JSON.stringify({ t: "x".repeat(40000) })])).rejects.toThrow(/check constraint/);
  });

  it("exports the rows and removes them with the account", async () => {
    await as(free);
    await add("lomba-a", "slot");
    const { rows } = await db.query<{ data: { user_competitions: { competition_key: string }[] } }>("select public.export_account_data() as data");
    expect(rows[0].data.user_competitions.map((r) => r.competition_key)).toEqual(["lomba-a"]);
    await admin();
    await db.query("delete from auth.users where id = $1", [free]);
    expect((await db.query("select 1 from public.user_competitions")).rows).toHaveLength(0);
    await db.query("insert into auth.users (id) values ($1)", [free]);
    await db.query("insert into auth.sessions values ($1, $2, null)", [sessions[free], free]);
  });
});
