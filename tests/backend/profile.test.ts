import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sessions: Record<string, string> = { [a]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [b]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };

async function as(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessions[userId] })]);
  await db.exec("set role authenticated");
}
const admin = () => db.exec("reset role");
type Profile = Record<string, unknown>;
type Result = { error?: string; field?: string; profile?: Profile; done?: boolean; categories?: Record<string, boolean>; changed?: boolean };
const call = async (sql: string, params: unknown[] = []) => (await db.query<{ r: Result }>(`select ${sql} as r`, params)).rows[0].r;
const patch = (value: unknown) => call("public.update_profile($1::jsonb)", [JSON.stringify(value)]);
const allow = (category: string, allowed: boolean) => call("public.set_ai_permission($1, $2)", [category, allowed]);
const required = { display_name: "Raka", jenjang: "Kuliah D3–S1", birth_year: 2005 };

describe("0007 profile, onboarding and AI permissions (FR-AUTH-04, FR-AUTH-09)", () => {
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
    await db.query("insert into auth.sessions values ($1, $2, null), ($3, $4, null)", [sessions[a], a, sessions[b], b]);
  }, 20000);

  beforeEach(async () => {
    await admin();
    await db.exec(`
      delete from public.profiles; delete from public.ai_permissions; delete from public.audit_log;
      insert into public.profiles (user_id) select id from auth.users;
      insert into public.ai_permissions (user_id) select id from auth.users;
    `);
    await as(a);
  });

  afterAll(async () => { await db.close(); });

  it("gives clients no table writes and no access to anon", async () => {
    await expect(db.query("update public.profiles set display_name = 'x'")).rejects.toThrow(/permission denied/);
    await expect(db.query("update public.ai_permissions set categories = '{}'")).rejects.toThrow(/permission denied/);
    await admin();
    await db.exec("set role anon");
    await expect(db.query("select public.update_profile('{}')")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.complete_onboarding()")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.set_ai_permission('profil', true)")).rejects.toThrow(/permission denied/);
  });

  it("rejects a session that has ended", async () => {
    await admin();
    await db.query("update auth.sessions set not_after = now() - interval '1 minute' where user_id = $1", [a]);
    await as(a);
    await expect(patch({ display_name: "Raka" })).rejects.toThrow(/authentication required/);
    await expect(allow("profil", true)).rejects.toThrow(/authentication required/);
    await admin();
    await db.query("update auth.sessions set not_after = null where user_id = $1", [a]);
  });

  it("saves the fields it is given and leaves the others", async () => {
    const first = await patch({ ...required, institution: "  Universitas Contoh  ", interests: ["KTI", "Esai", "KTI"], targets: ["Beasiswa"], skills: ["Menulis"], weekly_hours: 6, timezone: "Asia/Makassar", goals_text: "Lolos PKM", major: "Statistika" });
    expect(first.profile).toMatchObject({ ...required, institution: "Universitas Contoh", interests: ["KTI", "Esai"], targets: ["Beasiswa"], skills: ["Menulis"], weekly_hours: 6, timezone: "Asia/Makassar", goals_text: "Lolos PKM", major: "Statistika", onboarding_done: false });
    const second = await patch({ institution: "", weekly_hours: null });
    expect(second.profile).toMatchObject({ ...required, institution: null, weekly_hours: null, interests: ["KTI", "Esai"] });
  });

  it.each([
    [{ display_name: "R" }, "display_name"],
    [{ display_name: "x".repeat(31) }, "display_name"],
    [{ display_name: 5 }, "display_name"],
    [{ jenjang: "S3" }, "jenjang"],
    [{ birth_year: 1900 }, "birth_year"],
    [{ birth_year: 2005.5 }, "birth_year"],
    [{ birth_year: "2005" }, "birth_year"],
    [{ weekly_hours: 200 }, "weekly_hours"],
    [{ timezone: "Mars/Olympus" }, "timezone"],
    [{ interests: ["a", "b", "c", "d", "e", "f"] }, "interests"],
    [{ interests: "KTI" }, "interests"],
    [{ targets: [1] }, "targets"],
    [{ skills: ["x".repeat(41)] }, "skills"],
    [{ goals_text: "x".repeat(281) }, "goals_text"],
    [{ onboarding_done: true }, "onboarding_done"],
    [{ user_id: b }, "user_id"],
    [{ fee_max_idr: 1 }, "fee_max_idr"],
  ])("rejects %j and saves nothing", async (value, field) => {
    expect(await patch({ major: "Tetap", ...value })).toMatchObject({ error: "validation", field });
    await admin();
    expect((await db.query("select major, onboarding_done from public.profiles where user_id = $1", [a])).rows).toEqual([{ major: null, onboarding_done: false }]);
  });

  it("rejects a patch that is not an object", async () => {
    expect((await patch([])).error).toBe("validation");
    expect((await patch("x")).error).toBe("validation");
  });

  it("isolates accounts", async () => {
    await patch(required);
    await allow("profil", true);
    await as(b);
    expect((await db.query("select display_name from public.profiles")).rows).toEqual([{ display_name: null }]);
    expect((await db.query<{ c: Record<string, boolean> }>("select categories as c from public.ai_permissions")).rows[0].c.profil).toBe(false);
    await patch({ display_name: "Bima" });
    await admin();
    expect((await db.query("select user_id, display_name from public.profiles order by user_id")).rows).toEqual([{ user_id: a, display_name: "Raka" }, { user_id: b, display_name: "Bima" }]);
  });

  it("completes onboarding only with the required answers, and only once", async () => {
    expect((await call("public.complete_onboarding()")).error).toBe("incomplete");
    await patch(required);
    expect(await call("public.complete_onboarding()")).toEqual({ done: true });
    expect(await call("public.complete_onboarding()")).toEqual({ done: true });
    expect((await patch({ display_name: null })).error).toBe("validation");
    expect((await patch({ birth_year: null })).error).toBe("validation");
    expect((await patch({ display_name: "Raka B" })).profile).toMatchObject({ display_name: "Raka B", onboarding_done: true });
  });

  it("starts every AI category off, changes one at a time and audits each change", async () => {
    const start = await db.query<{ c: Record<string, boolean> }>("select categories as c from public.ai_permissions");
    expect(Object.values(start.rows[0].c)).toEqual(Array(8).fill(false));
    const on = await allow("tugas", true);
    expect(on.changed).toBe(true);
    expect(on.categories).toMatchObject({ tugas: true, profil: false, dokumen: false });
    expect((await allow("tugas", true)).changed).toBe(false);
    expect((await allow("tugas", false)).categories?.tugas).toBe(false);
    expect((await allow("rahasia", true)).error).toBe("validation");
    await admin();
    const log = await db.query("select actor_id, meta from public.audit_log where action = 'ai_permission_change' order by at");
    expect(log.rows).toEqual([
      { actor_id: a, meta: { category: "tugas", allowed: true } },
      { actor_id: a, meta: { category: "tugas", allowed: false } },
    ]);
  });

  it("keeps the new fields in the account export", async () => {
    await patch({ ...required, targets: ["Juara"] });
    const exported = await call("public.export_account_data()");
    expect(exported.profile).toMatchObject({ display_name: "Raka", targets: ["Juara"], skills: [] });
  });
});
