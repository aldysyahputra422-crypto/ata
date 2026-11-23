import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb000b";
const sessions: Record<string, string> = { [a]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [b]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };
const CATEGORIES = ["profil", "akademik", "lomba", "tugas", "progres", "evaluasi", "ingatan", "dokumen"];
const year = new Date().getUTCFullYear();
const MINOR = year - 16;
const ADULT = year - 21;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

async function as(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessions[userId] })]);
  await db.exec("set role authenticated");
}
const superuser = () => db.exec("reset role");
const server = async () => { await db.exec("reset role"); await db.exec("set role service_role"); };
type Result = Record<string, unknown> & { error?: string };
const call = async (sql: string, params: unknown[] = []) => (await db.query<{ r: Result }>(`select ${sql} as r`, params)).rows[0].r;
const patch = (value: unknown) => call("public.update_profile($1::jsonb)", [JSON.stringify(value)]);
const allow = (category: string, allowed = true) => call("public.set_ai_permission($1, $2)", [category, allowed]);
const gate = (category: string) => call("public.can_process_ai($1)", [category]);
const profile = (birth_year: number) => ({ display_name: "Raka", jenjang: "SMA/SMK", birth_year });

/** The server's part: open a request for `user` and (unless told otherwise) record that the link was sent. */
async function request(user: string, token: string, sent: boolean | null = true) {
  await server();
  const made = await call("public.create_guardian_consent_request($1, $2, $3, $4, $5, $6)", [user, "Bu Sari", sha("wali@contoh.id"), "w***@contoh.id", sha(token), "v1"]);
  if (made.id && sent !== null) await call("public.record_guardian_consent_delivery($1, $2, 'ref-1')", [made.id, sent]);
  return made;
}
const confirm = async (token: string, approve = true, name: string | null = "Sari Wulandari", revoke = "cabut-" + token) => {
  await server();
  return call("public.confirm_guardian_consent($1, $2, $3, $4)", [sha(token), approve, name, approve ? sha(revoke) : null]);
};
/** A minor with verified consent, signed in. */
async function verifiedMinor(user = a, token = "tok-" + user) {
  await as(user);
  await patch(profile(MINOR));
  await request(user, token);
  expect(await confirm(token)).toEqual({ status: "verified" });
  await as(user);
}

describe("0008 guardian consent and the AI gate (FR-AUTH-07)", () => {
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
    await superuser();
    await db.exec(`
      delete from public.guardian_consents; delete from public.profiles; delete from public.ai_permissions; delete from public.audit_log;
      insert into public.profiles (user_id) select id from auth.users;
      insert into public.ai_permissions (user_id) select id from auth.users;
    `);
    await as(a);
  });

  afterAll(async () => { await db.close(); });

  describe("the reported bug", () => {
    it("does not finish a minor's onboarding without verified guardian consent", async () => {
      await patch(profile(MINOR));
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await request(a, "tok-1");
      await as(a);
      // a request that is only pending is not consent
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await superuser();
      expect((await db.query("select onboarding_done from public.profiles where user_id = $1", [a])).rows).toEqual([{ onboarding_done: false }]);
      await confirm("tok-1");
      await as(a);
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
    });

    it("lets an adult finish onboarding and use permissions without a guardian", async () => {
      await patch(profile(ADULT));
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
      expect((await allow("tugas")).changed).toBe(true);
      expect(await gate("tugas")).toEqual({ allowed: true });
      expect(await call("public.guardian_consent_status()")).toMatchObject({ required: false, status: "not_required" });
    });

    it("counts an account as a minor until the year it is certainly 18", async () => {
      // only the birth year is known: someone born 18 years ago may still be 17 today
      await patch(profile(year - 18));
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await as(b);
      await patch(profile(year - 19));
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
    });
  });

  describe("API bypass", () => {
    it("refuses every category for a minor without consent and for an unknown age", async () => {
      for (const category of CATEGORIES) expect(await allow(category)).toEqual({ error: "age_required" });
      await patch(profile(MINOR));
      for (const category of CATEGORIES) {
        expect(await allow(category)).toEqual({ error: "guardian_consent_required" });
        expect(await gate(category)).toEqual({ allowed: false, reason: "guardian_consent_required" });
      }
      await superuser();
      const { rows } = await db.query<{ c: Record<string, boolean> }>("select categories as c from public.ai_permissions where user_id = $1", [a]);
      expect(Object.values(rows[0].c)).toEqual(Array(8).fill(false));
    });

    it("gives the account no way to write consent, call the server functions or the unchecked writers", async () => {
      await patch(profile(MINOR));
      const denied = /permission denied/;
      await expect(db.query("insert into public.guardian_consents (user_id, version, scope, guardian_name, guardian_contact_hash, guardian_contact_masked, token_hash, token_expires_at, status) values ($1, 'v1', '{profil}', 'Bu Sari', $2, 'w***', $2, now() + interval '1 day', 'verified')", [a, sha("x")])).rejects.toThrow(denied);
      await expect(db.query("update public.guardian_consents set status = 'verified'")).rejects.toThrow(denied);
      await expect(db.query("delete from public.guardian_consents")).rejects.toThrow(denied);
      await expect(db.query("update public.ai_permissions set categories = '{\"profil\": true}'")).rejects.toThrow(denied);
      await expect(db.query("update public.profiles set onboarding_done = true")).rejects.toThrow(denied);
      for (const fn of [
        `public.create_guardian_consent_request('${a}', 'Bu Sari', '${sha("c")}', 'w***', '${sha("t")}', 'v1')`,
        `public.confirm_guardian_consent('${sha("t")}', true, 'Bu Sari', '${sha("r")}')`,
        `public.record_guardian_consent_delivery(gen_random_uuid(), true)`,
        `public.guardian_consent_lookup('${sha("t")}')`,
        `public.withdraw_guardian_consent('${sha("r")}')`,
        `public.ai_processing_gate('${a}', 'profil')`,
        `public.set_ai_permission_unchecked('profil', true)`,
        `public.update_profile_unchecked('{"birth_year": ${ADULT}}')`,
        `public.reset_ai_permissions('${a}', 'x')`,
        `public.end_guardian_consent(gen_random_uuid(), '${a}', 'student')`,
        `public.guardian_consent_verified('${a}')`,
      ]) await expect(db.query(`select ${fn}`), fn).rejects.toThrow(denied);
    });

    it("gives anon nothing", async () => {
      await superuser();
      await db.exec("set role anon");
      for (const fn of ["public.can_process_ai('profil')", "public.guardian_consent_status()", "public.revoke_guardian_consent()",
        `public.confirm_guardian_consent('${sha("t")}', true, 'Bu Sari', '${sha("r")}')`, `public.guardian_consent_lookup('${sha("t")}')`]) {
        await expect(db.query(`select ${fn}`), fn).rejects.toThrow(/permission denied/);
      }
      await expect(db.query("select * from public.guardian_consents")).rejects.toThrow(/permission denied/);
    });

    it("never shows the account a token hash, contact hash or the verifier's proof", async () => {
      await verifiedMinor();
      for (const column of ["token_hash", "revoke_token_hash", "guardian_contact_hash", "delivery_ref", "verifier_name"]) {
        await expect(db.query(`select ${column} from public.guardian_consents`), column).rejects.toThrow(/permission denied/);
      }
      expect((await db.query("select status, version, scope from public.guardian_consents")).rows).toEqual([{ status: "verified", version: "v1", scope: CATEGORIES }]);
      expect(JSON.stringify(await call("public.guardian_consent_status()"))).not.toMatch(/[0-9a-f]{64}/);
    });

    it("blocks even a privileged writer from storing an enabled category for a minor without consent", async () => {
      await patch(profile(MINOR));
      await server();
      await expect(db.query("update public.ai_permissions set categories = jsonb_set(categories, '{dokumen}', 'true') where user_id = $1", [a])).rejects.toThrow();
      await superuser();
      await expect(db.query("update public.ai_permissions set categories = jsonb_set(categories, '{dokumen}', 'true') where user_id = $1", [a])).rejects.toThrow(/guardian consent required/);
      await expect(db.query("update public.ai_permissions set categories = jsonb_set(categories, '{dokumen}', '\"yes\"') where user_id = $1", [a])).rejects.toThrow(/guardian consent required/);
      await expect(db.query("update public.ai_permissions set categories = jsonb_set(categories, '{dokumen}', 'true') where user_id = $1", [b])).rejects.toThrow(/guardian consent required/);
    });

    it("keeps the gate closed after the session ends", async () => {
      await verifiedMinor();
      await allow("tugas");
      expect(await gate("tugas")).toEqual({ allowed: true });
      await superuser();
      await db.query("update auth.sessions set not_after = now() - interval '1 minute' where user_id = $1", [a]);
      await as(a);
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "signed_out" });
      await expect(call("public.guardian_consent_status()")).rejects.toThrow(/authentication required/);
      await expect(call("public.revoke_guardian_consent()")).rejects.toThrow(/authentication required/);
      await superuser();
      await db.query("update auth.sessions set not_after = null where user_id = $1", [a]);
    });
  });

  describe("verification", () => {
    it("stores status, time, version, scope and proof once the guardian confirms", async () => {
      await verifiedMinor();
      await superuser();
      const { rows } = await db.query<Record<string, unknown>>("select * from public.guardian_consents where user_id = $1", [a]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        status: "verified", doc: "guardian_ai_consent", version: "v1", scope: CATEGORIES, guardian_name: "Bu Sari",
        guardian_contact_hash: sha("wali@contoh.id"), delivery_channel: "email", delivery_status: "sent", delivery_ref: "ref-1",
        verification_method: "guardian_email_link", verifier_name: "Sari Wulandari", token_hash: null, revoke_token_hash: sha("cabut-tok-" + a),
      });
      expect(rows[0].verified_at).toBeInstanceOf(Date);
      expect(rows[0].delivered_at).toBeInstanceOf(Date);
      const log = await db.query("select action from public.audit_log where action like 'guardian_consent%' order by at, action");
      expect(log.rows.map((r) => (r as { action: string }).action).sort()).toEqual(["guardian_consent_requested", "guardian_consent_verified"]);
    });

    it("leaves every category off after consent: the student still chooses each one", async () => {
      await verifiedMinor();
      expect(await gate("dokumen")).toEqual({ allowed: false, reason: "permission_off" });
      expect((await allow("dokumen")).changed).toBe(true);
      expect(await gate("dokumen")).toEqual({ allowed: true });
      expect(await gate("ingatan")).toEqual({ allowed: false, reason: "permission_off" });
      // an unknown category is outside every consent's scope and outside every permission: refused either way
      expect((await gate("rahasia")).allowed).toBe(false);
    });

    it("accepts a token once", async () => {
      await as(a);
      await patch(profile(MINOR));
      await request(a, "tok-1");
      expect(await confirm("tok-1")).toEqual({ status: "verified" });
      expect(await confirm("tok-1")).toEqual({ error: "invalid_token" });
      expect(await confirm("tok-1", false)).toEqual({ error: "invalid_token" });
      expect(await call("public.guardian_consent_lookup($1)", [sha("tok-1")])).toEqual({ error: "invalid_token" });
    });

    it("rejects an expired token", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      await superuser();
      await db.exec("update public.guardian_consents set token_expires_at = now() - interval '1 second'");
      expect(await confirm("tok-1")).toEqual({ error: "invalid_token" });
      expect(await call("public.guardian_consent_lookup($1)", [sha("tok-1")])).toEqual({ error: "invalid_token" });
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "expired", required: true });
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
    });

    it("rejects a token that was never delivered to the guardian", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-queued", null);
      expect(await confirm("tok-queued")).toEqual({ error: "invalid_token" });
      await as(a);
      await request(a, "tok-failed", false);
      expect(await confirm("tok-failed")).toEqual({ error: "invalid_token" });
      // a failed delivery cannot be relabelled as sent afterwards
      const { rows } = await db.query<{ id: string }>("select id from public.guardian_consents where status = 'pending'");
      expect(await call("public.record_guardian_consent_delivery($1, true)", [rows[0].id])).toEqual({ error: "not_found" });
      await as(a);
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      // the unsent request is not shown as waiting, so the address can be corrected
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "none", required: true });
    });

    it("exports the consent record without hashes and keeps the account id out of audit metadata", async () => {
      await verifiedMinor();
      await as(a);
      const exported = await call("public.export_account_data()") as { guardian_consents: Record<string, unknown>[] };
      expect(exported.guardian_consents).toHaveLength(1);
      expect(exported.guardian_consents[0]).toMatchObject({ status: "verified", guardian_name: "Bu Sari" });
      expect(exported.guardian_consents[0]).not.toHaveProperty("verifier_name");
      expect(JSON.stringify(exported.guardian_consents)).not.toMatch(/[0-9a-f]{64}/);
      expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
      await superuser();
      const { rows } = await db.query<{ meta: unknown }>("select meta from public.audit_log where action like 'guardian_consent_%'");
      expect(rows.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(rows)).not.toContain(a);
    });

    it.each([
      ["a wrong token", () => confirm("tok-2")],
      ["the raw hash as token", () => confirm(sha("tok-1"))],
      ["no verifier name", () => confirm("tok-1", true, null)],
      ["a blank verifier name", () => confirm("tok-1", true, " ")],
      ["a withdrawal token equal to the link token", async () => { await server(); return call("public.confirm_guardian_consent($1, true, 'Sari', $1)", [sha("tok-1")]); }],
      ["a null approval", async () => { await server(); return call("public.confirm_guardian_consent($1, null, 'Sari', $2)", [sha("tok-1"), sha("r")]); }],
    ])("does not verify with %s", async (_label, attempt) => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      const result = await attempt();
      expect(result.error).toMatch(/invalid_token|validation/);
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "pending" });
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
    });

    it("records a refusal and uses up the token", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      expect(await confirm("tok-1", false)).toEqual({ status: "declined" });
      expect(await confirm("tok-1")).toEqual({ error: "invalid_token" });
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "declined" });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
    });

    it("invalidates the previous link when a new request is opened, and limits requests per day", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      await request(a, "tok-2");
      expect(await confirm("tok-1")).toEqual({ error: "invalid_token" });
      for (const n of [3, 4, 5]) expect((await request(a, "tok-" + n)).id).toBeDefined();
      expect(await request(a, "tok-6")).toEqual({ error: "rate_limited" });
      expect(await confirm("tok-5")).toEqual({ status: "verified" });
      expect(await request(a, "tok-7")).toMatchObject({ error: expect.stringMatching(/already_verified|rate_limited/) });
    });

    it("validates what the server passes in and refuses adults and unknown ages", async () => {
      expect(await request(a, "tok-1")).toEqual({ error: "age_required" });
      await as(a);
      await patch(profile(MINOR));
      await server();
      const make = (args: unknown[]) => call("public.create_guardian_consent_request($1, $2, $3, $4, $5, $6, $7)", args);
      expect(await make([a, "B", sha("c"), "w***", sha("t"), "v1", 72])).toEqual({ error: "validation" });
      expect(await make([a, "Bu Sari", "wali@contoh.id", "w***", sha("t"), "v1", 72])).toEqual({ error: "validation" });
      expect(await make([a, "Bu Sari", sha("c"), "w***", "tok-plain", "v1", 72])).toEqual({ error: "validation" });
      expect(await make([a, "Bu Sari", sha("c"), "w***", sha("t"), "v1", 100000])).toEqual({ error: "validation" });
      expect(await make(["cccccccc-cccc-4ccc-cccc-cccccccccccc", "Bu Sari", sha("c"), "w***", sha("t"), "v1", 72])).toEqual({ error: "not_found" });
      await as(b);
      await patch(profile(ADULT));
      expect(await request(b, "tok-b")).toEqual({ error: "not_required" });
    });
  });

  describe("revocation", () => {
    it("lets the student revoke: permissions go off, the gate closes, onboarding reopens", async () => {
      await verifiedMinor();
      await call("public.complete_onboarding()");
      await allow("tugas");
      await allow("dokumen");
      expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await allow("tugas")).toEqual({ error: "guardian_consent_required" });
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "revoked", revoked_by: "student" });
      expect(await call("public.revoke_guardian_consent()")).toEqual({ error: "not_found" });
      await superuser();
      const state = await db.query<{ c: Record<string, boolean>; onboarding_done: boolean }>(
        "select p.categories as c, f.onboarding_done from public.ai_permissions p join public.profiles f using (user_id) where user_id = $1", [a]);
      expect(Object.values(state.rows[0].c)).toEqual(Array(8).fill(false));
      expect(state.rows[0].onboarding_done).toBe(false);
      expect((await db.query("select meta from public.audit_log where action = 'ai_permissions_reset'")).rows).toEqual([{ meta: { reason: "guardian_consent_revoked" } }]);
      expect((await db.query("select revoked_by, revoke_token_hash from public.guardian_consents")).rows).toEqual([{ revoked_by: "student", revoke_token_hash: null }]);
    });

    it("lets the guardian withdraw with the withdrawal token, once", async () => {
      await verifiedMinor();
      await allow("ingatan");
      await server();
      expect(await call("public.guardian_consent_lookup($1)", [sha("cabut-tok-" + a)])).toMatchObject({ kind: "withdraw", student_name: "Raka" });
      expect(await call("public.withdraw_guardian_consent($1)", [sha("salah")])).toEqual({ error: "invalid_token" });
      expect(await call("public.withdraw_guardian_consent($1)", [sha("tok-" + a)])).toEqual({ error: "invalid_token" });
      expect(await call("public.withdraw_guardian_consent($1)", [sha("cabut-tok-" + a)])).toEqual({ status: "revoked" });
      expect(await call("public.withdraw_guardian_consent($1)", [sha("cabut-tok-" + a)])).toEqual({ error: "invalid_token" });
      await as(a);
      expect(await gate("ingatan")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "revoked", revoked_by: "guardian" });
    });

    it("lets the student cancel a pending request, which kills its link", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      await as(a);
      expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
      expect(await confirm("tok-1")).toEqual({ error: "invalid_token" });
    });

    it("needs a fresh verification after revocation", async () => {
      await verifiedMinor();
      await call("public.revoke_guardian_consent()");
      await request(a, "tok-new");
      await as(a);
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
      await confirm("tok-new");
      await as(a);
      expect((await allow("profil")).changed).toBe(true);
    });
  });

  describe("age changes", () => {
    it("does not let a minor become an adult by editing the birth year, or clear it", async () => {
      await patch(profile(MINOR));
      for (const birth_year of [ADULT, year - 19, 1940]) {
        expect(await patch({ birth_year })).toEqual({ error: "age_locked", field: "birth_year" });
      }
      expect((await patch({ birth_year: null })).error).toMatch(/age_locked|validation/);
      // other fields in the same request are not saved either
      expect(await patch({ display_name: "Lain", birth_year: ADULT })).toEqual({ error: "age_locked", field: "birth_year" });
      expect((await patch({ birth_year: MINOR - 1 })).profile).toMatchObject({ birth_year: MINOR - 1, display_name: "Raka" });
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await superuser();
      expect((await db.query("select count(*)::int as n from public.audit_log where action = 'age_change_refused'")).rows).toEqual([{ n: 5 }]);
    });

    it("turns everything off when an adult profile becomes a minor's", async () => {
      await patch(profile(ADULT));
      await call("public.complete_onboarding()");
      await allow("tugas");
      await allow("dokumen");
      expect(await gate("tugas")).toEqual({ allowed: true });
      const changed = await patch({ birth_year: MINOR });
      expect(changed.profile).toMatchObject({ birth_year: MINOR, onboarding_done: false });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await allow("tugas")).toEqual({ error: "guardian_consent_required" });
      // and the way back is closed
      expect(await patch({ birth_year: ADULT })).toEqual({ error: "age_locked", field: "birth_year" });
      await superuser();
      const { rows } = await db.query<{ c: Record<string, boolean> }>("select categories as c from public.ai_permissions where user_id = $1", [a]);
      expect(Object.values(rows[0].c)).toEqual(Array(8).fill(false));
    });

    it("keeps a verified minor's consent and permissions when the birth year stays a minor's", async () => {
      await verifiedMinor();
      await allow("tugas");
      expect((await patch({ birth_year: MINOR + 1 })).profile).toMatchObject({ birth_year: MINOR + 1 });
      expect(await gate("tugas")).toEqual({ allowed: true });
    });
  });

  describe("cross-account access", () => {
    it("keeps one account's consent from helping or being seen by another", async () => {
      await verifiedMinor(a, "tok-a");
      await allow("tugas");
      await as(b);
      await patch({ ...profile(MINOR), display_name: "Bima" });
      expect((await db.query("select id, user_id, status from public.guardian_consents")).rows).toEqual([]);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "none", required: true });
      expect(await allow("tugas")).toEqual({ error: "guardian_consent_required" });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      // B cannot revoke A's consent
      expect(await call("public.revoke_guardian_consent()")).toEqual({ error: "not_found" });
      await as(a);
      expect(await gate("tugas")).toEqual({ allowed: true });
    });

    it("ties a token to the account it was issued for", async () => {
      await patch(profile(MINOR));
      await as(b);
      await patch({ ...profile(MINOR), display_name: "Bima" });
      await request(a, "tok-a");
      await request(b, "tok-b");
      // the same token hash cannot be issued twice
      await server();
      await expect(call("public.create_guardian_consent_request($1, 'Bu Sari', $2, 'w***', $3, 'v1')", [a, sha("c"), sha("tok-b")])).rejects.toThrow(/unique|duplicate/);
      await confirm("tok-b");
      await as(a);
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
      await as(b);
      expect((await allow("profil")).changed).toBe(true);
    });

    it("answers the server-side gate for the named account only", async () => {
      await verifiedMinor(a, "tok-a");
      await allow("tugas");
      await as(b);
      await patch(profile(MINOR));
      await server();
      const check = (user: string | null, category: string) => call("public.ai_processing_gate($1, $2)", [user, category]);
      expect(await check(a, "tugas")).toEqual({ allowed: true });
      expect(await check(a, "dokumen")).toEqual({ allowed: false, reason: "permission_off" });
      expect(await check(b, "tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await check("cccccccc-cccc-4ccc-cccc-cccccccccccc", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
      expect(await check(null, "tugas")).toEqual({ allowed: false, reason: "signed_out" });
    });

    it("deletes consent rows with the account", async () => {
      await verifiedMinor();
      await superuser();
      await db.query("delete from auth.users where id = $1", [b]);
      expect((await db.query("select count(*)::int as n from public.guardian_consents")).rows).toEqual([{ n: 1 }]);
      await db.query("insert into auth.users (id) values ($1)", [b]);
      await db.query("insert into auth.sessions values ($1, $2, null)", [sessions[b], b]);
    });
  });

  it("migrates existing data: minors lose enabled categories and finished onboarding", async () => {
    const old = new PGlite();
    await old.exec(`
      create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
      grant usage on schema auth to anon, authenticated, service_role;
      create table auth.users (id uuid primary key);
      create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users (id) on delete cascade, not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;
    `);
    const files = readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort();
    for (const file of files.filter((name) => name < "0008")) await old.exec(readFileSync(new URL(file, migrations), "utf8"));
    const c = "cccccccc-cccc-4ccc-cccc-cccccccccccc";
    await old.query("insert into auth.users (id) values ($1), ($2), ($3)", [a, b, c]);
    await old.exec("insert into public.profiles (user_id) select id from auth.users on conflict do nothing");
    await old.query("update public.profiles set display_name = 'Minor', jenjang = 'SMA/SMK', birth_year = $2, onboarding_done = true where user_id = $1", [a, MINOR]);
    await old.query("update public.profiles set display_name = 'Adult', jenjang = 'Kuliah D3–S1', birth_year = $2, onboarding_done = true where user_id = $1", [b, ADULT]);
    await old.exec(`insert into public.ai_permissions (user_id, categories) select id, '{"profil": true, "dokumen": true, "tugas": false}' from auth.users
      on conflict (user_id) do update set categories = excluded.categories`);
    await old.exec(readFileSync(new URL(files.find((name) => name.startsWith("0008"))!, migrations), "utf8"));
    const { rows } = await old.query<{ user_id: string; onboarding_done: boolean; on: number }>(`
      select f.user_id, f.onboarding_done, (select count(*)::int from jsonb_each(p.categories) e where e.value = 'true') as on
      from public.profiles f join public.ai_permissions p using (user_id) order by f.user_id`);
    expect(rows).toEqual([
      { user_id: a, onboarding_done: false, on: 0 },
      { user_id: b, onboarding_done: true, on: 2 },
      { user_id: c, onboarding_done: false, on: 0 },
    ]);
    await old.close();
  }, 20000);
});
