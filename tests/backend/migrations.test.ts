import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONFIG_VERSION, PLAN_FEATURES } from "@/lib/entitlements/config";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const first = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const second = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sessionA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001";
const sessionB = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002";

async function asAccount(userId: string, sessionId: string) {
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessionId })]);
  await db.exec("set role authenticated");
}

async function redeem(code: string, key: string | null = null) {
  const { rows } = await db.query("select public.redeem_code($1, $2) as result", [code, key]);
  return rows[0];
}

async function addCode(code: string, uses: number, onePerUser = true) {
  await db.query(`insert into public.redeem_codes (code_hash, label, max_uses, days_granted, one_per_user)
    values (encode(sha256(convert_to($1, 'UTF8')), 'hex'), 'fixture', $2, 30, $3)`, [code, uses, onePerUser]);
}

describe("R0.1 migrations", () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      grant usage on schema auth to anon, authenticated, service_role;
      alter default privileges in schema public grant truncate, references, trigger on tables to anon, authenticated, service_role;
      create table auth.users (id uuid primary key);
      create table auth.sessions (
        id uuid primary key,
        user_id uuid not null references auth.users (id) on delete cascade,
        not_after timestamptz
      );
      create function auth.jwt() returns jsonb language sql stable as
        $$ select current_setting('request.jwt.claims', true)::jsonb $$;
      create function auth.uid() returns uuid language sql stable as
        $$ select (auth.jwt() ->> 'sub')::uuid $$;
    `);
    await db.query("insert into auth.users (id) values ($1)", [second]);
    for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(new URL(file, migrations), "utf8"));
    }
    await db.query("insert into auth.users (id) values ($1)", [first]);
    await db.query("insert into auth.sessions values ($1, $2, null), ($3, $4, null)", [sessionA, first, sessionB, second]);
  }, 20000);

  afterAll(async () => { await db.close(); });

  it("keeps RLS enabled on all tables and seeds exactly the flags and configuration", async () => {
    const { rows: tables } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(tables).toHaveLength(13);
    expect(tables.every((table) => table.relrowsecurity)).toBe(true);
    await db.exec("set role authenticated");
    expect((await db.query("select key, value from public.system_flags order by key")).rows)
      .toEqual([{ key: "push_enabled", value: true }, { key: "radar_enabled", value: true }]);
    await expect(db.exec("update public.system_flags set value = 'false'")).rejects.toMatchObject({ code: "42501" });
    await db.exec("set role anon");
    await expect(db.exec("select key from public.system_flags")).rejects.toMatchObject({ code: "42501" });
    await db.exec("set role service_role");
    expect((await db.query("select key from public.system_flags")).rows).toHaveLength(2);
    await db.exec("set role anon");
    const { rows } = await db.query("select * from public.plan_features");
    const expected = Object.entries(PLAN_FEATURES).flatMap(([plan, features]) =>
      Object.entries(features).map(([feature, setting]) => ({
        plan, feature, enabled: "enabled" in setting ? setting.enabled : true,
        limit: "limit" in setting ? setting.limit : null,
        period: "period" in setting ? setting.period ?? null : null,
        note: "note" in setting ? setting.note ?? null : null,
        depth: null, status: setting.status, config_version: CONFIG_VERSION,
      })),
    );
    expect(rows).toHaveLength(expected.length);
    expect(rows).toEqual(expect.arrayContaining(expected));
    await db.exec("reset role");
  });

  it("isolates all user-owned rows and keeps privileged writes out of client roles", async () => {
    await db.query("insert into public.consents (user_id, doc, version, guardian_contact_hash) values ($1, 'privacy', '1', 'hash-fixture')", [second]);
    await asAccount(second, sessionB);
    expect((await db.query("select user_id from public.profiles")).rows).toEqual([{ user_id: second }]);
    expect((await db.query("select user_id from public.ai_permissions")).rows).toEqual([{ user_id: second }]);
    expect((await db.query("select user_id from public.consents")).rows).toEqual([{ user_id: second }]);
    await expect(db.exec("select guardian_contact_hash from public.consents")).rejects.toMatchObject({ code: "42501" });
    await asAccount(first, sessionA);
    expect((await db.query("select user_id from public.profiles")).rows).toEqual([{ user_id: first }]);
    expect((await db.query("select user_id from public.ai_permissions")).rows).toEqual([{ user_id: first }]);
    expect((await db.query("select user_id from public.consents")).rows).toEqual([]);
    await expect(db.exec("update public.profiles set onboarding_done = true")).rejects.toMatchObject({ code: "42501" });
    for (const table of ["entitlements", "redemptions", "consents", "ai_permissions", "plan_features"]) {
      await expect(db.exec(`delete from public.${table}`)).rejects.toMatchObject({ code: "42501" });
    }
    for (const table of ["redeem_codes", "redeem_requests", "audit_log"]) {
      await expect(db.exec(`select * from public.${table}`)).rejects.toMatchObject({ code: "42501" });
    }
    await db.exec("set role anon");
    await expect(redeem("TEST-SUPER")).rejects.toMatchObject({ code: "42501" });
    await expect(db.exec("select public.export_account_data()")).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  });

  it("atomically consumes a code, honors idempotency, and never reveals another account's grant", async () => {
    await addCode("TESTONEUSE", 1);
    await asAccount(first, sessionA);
    const key = "01b00000-0000-4000-b000-000000000000";
    const granted = await redeem("test-one-use", key);
    expect(granted).toMatchObject({ result: { days: 30, entitlement: { plan: "pro" } } });
    expect(await redeem("test-one-use", key)).toEqual(granted);
    expect(await redeem("test-one-use")).toEqual({ result: { error: "already_redeemed" } });
    expect((await db.query("select user_id from public.entitlements")).rows).toEqual([{ user_id: first }]);
    expect((await db.query("select user_id from public.redemptions")).rows).toEqual([{ user_id: first }]);
    await asAccount(second, sessionB);
    expect(await redeem("test-one-use", key)).toEqual(await redeem("not-a-code"));
    expect((await db.query("select user_id from public.entitlements")).rows).toEqual([]);
    expect((await db.query("select user_id from public.redemptions")).rows).toEqual([]);
    await db.exec("reset role");
    expect((await db.query("select used from public.redeem_codes")).rows).toEqual([{ used: 1 }]);
    expect((await db.query("select action from public.audit_log")).rows).toEqual([{ action: "redeem" }]);
  });

  it("returns only the current account's export, throttles it, and denies expired sessions", async () => {
    await asAccount(second, sessionB);
    for (let n = 0; n < 3; n++) {
      const { rows } = await db.query("select public.export_account_data() as data");
      expect(rows[0]).toMatchObject({ data: {
        profile: { user_id: second }, entitlements: [], redemptions: [], consents: [{ doc: "privacy" }],
      } });
      expect(JSON.stringify(rows[0])).not.toContain("hash-fixture");
      expect(JSON.stringify(rows[0])).not.toContain(first);
    }
    expect((await db.query("select public.export_account_data() as data")).rows)
      .toEqual([{ data: { error: "rate_limited" } }]);
    await db.exec("reset role");
    await db.query("update auth.sessions set not_after = now() - interval '1 minute' where id = $1", [sessionB]);
    await asAccount(second, sessionB);
    expect((await db.query("select user_id from public.profiles")).rows).toEqual([]);
    await expect(redeem("test-one-use")).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  });

  it("cascades account deletion and keeps an append-only deletion event without user identifiers", async () => {
    await db.query("delete from auth.users where id = $1", [first]);
    for (const table of ["profiles", "entitlements", "redemptions", "redeem_requests", "ai_permissions", "consents"]) {
      expect((await db.query(`select user_id from public.${table} where user_id = $1`, [first])).rows).toEqual([]);
    }
    expect((await db.query("select actor_id, target_id from public.audit_log where action = 'account_deleted'")).rows)
      .toEqual([{ actor_id: null, target_id: null }]);
    await db.exec("set role service_role");
    await expect(db.exec("delete from public.audit_log")).rejects.toMatchObject({ code: "42501" });
    await db.exec("reset role");
  });
});
