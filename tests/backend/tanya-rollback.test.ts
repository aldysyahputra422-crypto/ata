import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Rollback plan for migration 0009 (PO migration review). Applies every migration, runs the down script, and checks
// that only 0009's objects are gone, that existing data is untouched, and that 0009 can be applied again afterwards.
const migrations = new URL("../../supabase/migrations/", import.meta.url);
const down = readFileSync(new URL("../../supabase/rollback/0009_tanya_ata_down.sql", import.meta.url), "utf8");
const db = new PGlite();
const user = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const session = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001";

const objects = async () => ({
  tables: (await db.query<{ n: string }>("select tablename as n from pg_tables where schemaname = 'public' order by 1")).rows.map((r) => r.n),
  functions: (await db.query<{ n: string }>(
    "select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' order by 1")).rows.map((r) => r.n),
  triggers: (await db.query<{ n: string }>(
    "select c.relname || '.' || t.tgname as n from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and not t.tgisinternal order by 1")).rows.map((r) => r.n),
  policies: (await db.query<{ n: string }>("select tablename || '.' || policyname as n from pg_policies where schemaname = 'public' order by 1")).rows.map((r) => r.n),
});
const files = () => readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort();
const apply = async (file: string) => db.exec(readFileSync(new URL(file, migrations), "utf8"));
const rowCounts = async (tables: string[]) => Object.fromEntries(await Promise.all(tables.map(async (t) =>
  [t, (await db.query<{ c: number }>(`select count(*)::int as c from public.${t}`)).rows[0].c] as const)));

describe("0009 rollback (down SQL)", () => {
  let before: Awaited<ReturnType<typeof objects>>;
  let after: Awaited<ReturnType<typeof objects>>;

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
    for (const file of files().filter((name) => name < "0009")) await apply(file);
    await db.query("insert into auth.users (id) values ($1)", [user]);
    await db.query("insert into auth.sessions values ($1, $2, null)", [session, user]);
    // Adults: an account that needs guardian consent cannot keep a stored key (see tanya-gate.test.ts).
    await db.exec("update public.profiles set birth_date = '1990-01-01'");
    before = await objects();
    await apply(files().find((name) => name.startsWith("0009"))!);
    after = await objects();
  }, 30000);
  afterAll(() => db.close());

  it("0009 only adds objects: three tables, their functions, one policy and one trigger; nothing earlier is altered or dropped", () => {
    expect(after.tables.filter((t) => !before.tables.includes(t))).toEqual(["ai_credentials", "ai_request_counters", "tanya_runs"]);
    expect(before.tables.filter((t) => !after.tables.includes(t))).toEqual([]);
    expect(before.functions.filter((f) => !after.functions.includes(f))).toEqual([]);
    expect(after.functions.filter((f) => !before.functions.includes(f)).map((f) => f.split("(")[0])).toEqual([
      "ai_credential_begin", "ai_credential_delete", "ai_credential_get", "ai_credential_put", "ai_credential_session",
      "ai_credentials_drop_on_consent_end", "ai_credentials_purge", "ai_take_request", "ai_take_test", "tanya_run_finish", "tanya_run_start"]);
    expect(after.policies.filter((p) => !before.policies.includes(p))).toEqual(["tanya_runs.tanya_runs_read_own"]);
    // The only thing 0009 attaches to an earlier table: a trigger on guardian_consents (0008) that deletes stored keys.
    expect(after.triggers.filter((t) => !before.triggers.includes(t))).toEqual(["guardian_consents.ai_credentials_consent_end"]);
    expect(before.triggers.filter((t) => !after.triggers.includes(t))).toEqual([]);
  });

  it("the down script removes exactly what 0009 added, keeps existing rows, and 0009 applies again afterwards", async () => {
    // Use the feature so there is data to lose, and data elsewhere that must survive.
    await db.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: user, session_id: session, role: "authenticated" })}', false);`);
    const ids = (await db.query<{ r: { connection_id: string } }>("select public.ai_credential_begin() as r")).rows[0].r;
    await db.query("select public.ai_credential_put($1, 'openai', null, 'model-x', '1234', 1, 'aXY=', 'Y2lwaGVy', 'dGFn', 'd3JhcA==', $2)",
      [ids.connection_id, Math.floor(Date.now() / 1000) + 3600]);
    await db.exec("select public.ai_take_request(); select public.ai_take_test(); select public.tanya_run_start('handoff', 'umum', null, null, '{}', '[]', '[]');");
    await db.exec("reset role; select set_config('request.jwt.claims', '', false);");
    expect(await rowCounts(["ai_credentials", "ai_request_counters", "tanya_runs"])).toEqual({ ai_credentials: 1, ai_request_counters: 2, tanya_runs: 1 });
    const kept = await rowCounts(before.tables);
    expect(kept.audit_log).toBeGreaterThan(0);

    await db.exec(down);
    expect(await objects()).toEqual(before);
    expect(await rowCounts(before.tables)).toEqual(kept);
    // 0008 (guardian consent) sits under 0009 and is left whole: its tables and the AI gate still work.
    expect(before.tables).toEqual(expect.arrayContaining(["guardian_consents", "birth_date_corrections"]));
    expect((await db.query<{ r: unknown }>("select public.ai_processing_gate($1, 'lomba') as r", [user])).rows[0].r).toMatchObject({ allowed: false });
    expect((await db.query("select 1 from auth.users")).rows).toHaveLength(1);

    // Running it twice is harmless, and the migration can be applied again from a clean state.
    await db.exec(down);
    await apply(files().find((name) => name.startsWith("0009"))!);
    expect(await objects()).toEqual(after);
    expect(await rowCounts(["ai_credentials", "ai_request_counters", "tanya_runs"])).toEqual({ ai_credentials: 0, ai_request_counters: 0, tanya_runs: 0 });
  });
});
