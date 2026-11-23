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
/** Today in WIB (profiles here keep the default timezone), moved back by whole years and forward by days. */
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
function born(years: number, days = 0, from = today()) {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const year = Number(today().slice(0, 4));
const MINOR = born(16);
const ADULT = born(21);
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
const profile = (birth_date: string) => ({ display_name: "Raka", jenjang: "SMA/SMK", birth_date });

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
/** The server's part of a birth date correction: the link goes to the guardian's inbox. */
async function correction(user: string, date: string, token: string, sent: boolean | null = true, contact = "wali@contoh.id") {
  await server();
  const made = await call("public.create_birth_date_correction($1, $2, $3, $4, $5, $6)", [user, date, "Bu Sari", sha(contact), "w***@contoh.id", sha(token)]);
  if (made.id && sent !== null) await call("public.record_birth_date_correction_delivery($1, $2, 'ref-2')", [made.id, sent]);
  return made;
}
const confirmCorrection = async (token: string, approve = true, name: string | null = "Sari Wulandari") => {
  await server();
  return call("public.confirm_birth_date_correction($1, $2, $3)", [sha(token), approve, name]);
};
const legacyYear = async (user: string, birth_year: number | null) => {
  await superuser();
  await db.query("update public.profiles set birth_year = $2, birth_date = null where user_id = $1", [user, birth_year]);
  await as(user);
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
      delete from public.guardian_consents; delete from public.birth_date_corrections; delete from public.profiles; delete from public.ai_permissions; delete from public.audit_log;
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

    it("turns 18 on the birthday in the account's timezone, not before", async () => {
      const age = async (date: string | null, yearOnly: number | null, tz: string | null, at: string) =>
        (await db.query<{ r: string }>("select public.age_status($1::date, $2::numeric, $3, $4::timestamptz) as r", [date, yearOnly, tz, at])).rows[0].r;
      await superuser();
      expect(await age("2008-11-23", null, "Asia/Jakarta", "2026-11-22T16:59:59Z")).toBe("minor"); // 23:59 WIB the day before
      expect(await age("2008-11-23", null, "Asia/Jakarta", "2026-11-22T17:00:00Z")).toBe("adult"); // midnight WIB
      expect(await age("2008-11-23", null, "Asia/Jayapura", "2026-11-22T15:00:00Z")).toBe("adult"); // already the 23rd in WIT
      expect(await age("2008-11-23", null, "UTC", "2026-11-22T17:00:00Z")).toBe("minor");
      expect(await age("2008-11-23", null, null, "2026-11-22T17:00:00Z")).toBe("adult"); // no timezone: WIB
      expect(await age("2008-11-23", null, "Not/AZone", "2026-11-22T17:00:00Z")).toBe("adult");
      expect(await age("2008-02-29", null, "UTC", "2026-02-28T12:00:00Z")).toBe("minor"); // leap day: 18 on 1 March
      expect(await age("2008-02-29", null, "UTC", "2026-03-01T00:00:00Z")).toBe("adult");
      // the date wins over a stored year
      expect(await age("2010-01-01", 1990, "UTC", "2026-06-01T00:00:00Z")).toBe("minor");
      // year only (accounts from before 0008): adult once certainly 18, the ambiguous year stays a minor
      expect(await age(null, 2008, "UTC", "2026-12-31T00:00:00Z")).toBe("minor");
      expect(await age(null, 2007, "UTC", "2026-01-01T00:00:00Z")).toBe("adult");
      expect(await age(null, null, "UTC", "2026-01-01T00:00:00Z")).toBe("unknown");
    });

    it("lets the account continue without consent from its 18th birthday on", async () => {
      await patch(profile(born(18, 1))); // 18 tomorrow
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      await as(b);
      await patch(profile(born(18))); // 18 today
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
      expect((await allow("tugas")).changed).toBe(true);
      // the same account the day before its birthday and on it, without any write in between
      await superuser();
      await db.query("update public.profiles set birth_date = $2 where user_id = $1", [a, born(18)]);
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "not_required", account_state: "not_required" });
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
    });

    it("treats an account that only has a birth year as a minor until the date is completed", async () => {
      await legacyYear(a, year - 18); // 17 or 18: ambiguous
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "none", account_state: "pending", birth_date_known: false });
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
      // a year alone no longer finishes onboarding, and the year itself cannot be written any more
      expect(await call("public.complete_onboarding()")).toEqual({ error: "incomplete" });
      expect(await patch({ birth_year: year - 30 })).toEqual({ error: "validation", field: "birth_year" });
      // completing the date inside the stored year is the account's own statement, not a correction
      const done = await patch(profile(born(18)));
      expect(done.profile).toMatchObject({ birth_date: born(18), birth_year: year - 18, birth_date_corrections: 0 });
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
      // the account reads its own date through RLS, as the profile API does
      expect((await db.query("select birth_date::text as d from public.profiles")).rows).toEqual([{ d: born(18) }]);
      // a year that is certainly adult stays adult without a date
      await legacyYear(b, year - 19);
      expect((await allow("profil")).changed).toBe(true);
      // a date outside the stored minor year is a correction towards adult: not self-service
      await legacyYear(a, year - 16);
      expect(await patch({ birth_date: ADULT })).toEqual({ error: "guardian_verification_required", field: "birth_date" });
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
        `public.update_profile_unchecked('{"birth_year": 1990}')`,
        `public.create_birth_date_correction('${a}', '${ADULT}', 'Bu Sari', '${sha("c")}', 'w***', '${sha("t")}')`,
        `public.confirm_birth_date_correction('${sha("t")}', true, 'Bu Sari')`,
        `public.record_birth_date_correction_delivery(gen_random_uuid(), true)`,
        `public.set_birth_date_by_operator('${a}', '${ADULT}', 'manual check')`,
        `public.purge_guardian_requested_deletions()`,
        `public.apply_age_change('${a}', 'adult')`,
        `public.account_age('${a}')`,
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
    it("does not let a minor become an adult by editing the birth date, year or timezone", async () => {
      await patch(profile(MINOR));
      for (const birth_date of [ADULT, born(18), "1940-01-01"]) {
        expect(await patch({ birth_date })).toEqual({ error: "guardian_verification_required", field: "birth_date" });
      }
      for (const bad of [null, "", "2000", "2000-13-01", "2000-02-30", "01-01-2000", 2000, born(4), "1939-12-31", "2000-01-01'; --"]) {
        expect(await patch({ birth_date: bad }), String(bad)).toEqual({ error: "validation", field: "birth_date" });
      }
      expect(await patch({ birth_year: 1990 })).toEqual({ error: "validation", field: "birth_year" });
      // other fields in the same request are not saved either
      expect(await patch({ display_name: "Lain", birth_date: ADULT })).toEqual({ error: "guardian_verification_required", field: "birth_date" });
      // the furthest timezone moves today by a day at most; it cannot make a 16-year-old an adult
      expect((await patch({ timezone: "Pacific/Kiritimati" })).profile).toMatchObject({ display_name: "Raka" });
      expect(await allow("profil")).toEqual({ error: "guardian_consent_required" });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await superuser();
      expect((await db.query("select count(*)::int as n from public.audit_log where action = 'birth_date_change_refused'")).rows).toEqual([{ n: 4 }]);
      expect((await db.query("select birth_date::text as d from public.profiles where user_id = $1", [a])).rows).toEqual([{ d: MINOR }]);
    });

    it("lets a typo be corrected, counts and audits it, and stops at the limit", async () => {
      await patch(profile(MINOR));
      expect((await patch({ birth_date: born(15) })).profile).toMatchObject({ birth_date: born(15), birth_date_corrections: 1 });
      expect((await patch({ birth_date: born(15) })).profile).toMatchObject({ birth_date_corrections: 1 }); // no change, no count
      expect((await patch({ birth_date: born(14) })).profile).toMatchObject({ birth_date_corrections: 2 });
      expect(await patch({ birth_date: born(13) })).toEqual({ error: "correction_limit", field: "birth_date" });
      expect(await call("public.guardian_consent_status()")).toMatchObject({ corrections_left: 0 });
      // the limit also closes the guardian-confirmed route; what is left is the operator
      expect(await correction(a, ADULT, "kor-1")).toEqual({ error: "correction_limit" });
      await server();
      expect(await call("public.set_birth_date_by_operator($1, $2, $3)", [a, ADULT, "x"])).toEqual({ error: "validation" });
      expect(await call("public.set_birth_date_by_operator($1, $2, $3)", [a, ADULT, "akta lahir diperiksa manual"])).toEqual({ status: "applied", age: "adult" });
      await as(a);
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
      await superuser();
      const { rows } = await db.query<{ action: string; meta: Record<string, string> }>("select action, meta from public.audit_log where action like 'birth_date_%' order by at, action");
      expect(rows.map((r) => `${r.action}:${r.meta.by}`)).toEqual(["birth_date_set:account", "birth_date_corrected:account", "birth_date_corrected:account", "birth_date_corrected:operator"]);
      expect(JSON.stringify(rows)).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no birth date in the audit trail
    });

    it("turns everything off when an adult profile becomes a minor's", async () => {
      await patch(profile(ADULT));
      await call("public.complete_onboarding()");
      await allow("tugas");
      await allow("dokumen");
      expect(await gate("tugas")).toEqual({ allowed: true });
      const changed = await patch({ birth_date: MINOR });
      expect(changed.profile).toMatchObject({ birth_date: MINOR, onboarding_done: false, birth_date_corrections: 1 });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await allow("tugas")).toEqual({ error: "guardian_consent_required" });
      expect(await call("public.guardian_consent_status()")).toMatchObject({ account_state: "pending", status: "none" });
      // and the way back is closed to the account alone
      expect(await patch({ birth_date: ADULT })).toEqual({ error: "guardian_verification_required", field: "birth_date" });
      await superuser();
      const { rows } = await db.query<{ c: Record<string, boolean> }>("select categories as c from public.ai_permissions where user_id = $1", [a]);
      expect(Object.values(rows[0].c)).toEqual(Array(8).fill(false));
    });

    it("keeps a verified minor's consent and permissions when the birth date stays a minor's", async () => {
      await verifiedMinor();
      await allow("tugas");
      expect((await patch({ birth_date: born(15) })).profile).toMatchObject({ birth_date: born(15) });
      expect(await gate("tugas")).toEqual({ allowed: true });
    });
  });

  describe("birth date correction towards adult", () => {
    it("changes the date only when the guardian confirms from the inbox", async () => {
      await patch(profile(MINOR));
      expect(await correction(a, ADULT, "kor-1")).toMatchObject({ id: expect.any(String) });
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ account_state: "pending", correction: { birth_date: ADULT, contact_masked: "w***@contoh.id" } });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await server();
      expect(await call("public.guardian_consent_lookup($1)", [sha("kor-1")])).toMatchObject({ kind: "correction", student_name: "Raka", birth_date: ADULT });
      expect(await confirmCorrection("kor-1", true, null)).toEqual({ error: "validation" });
      expect(await confirmCorrection("kor-1")).toEqual({ status: "applied" });
      expect(await confirmCorrection("kor-1")).toEqual({ error: "invalid_token" }); // single use
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "not_required", correction: null, corrections_left: 1 });
      expect(await call("public.complete_onboarding()")).toEqual({ done: true });
      expect((await allow("tugas")).changed).toBe(true);
      await superuser();
      const { rows } = await db.query("select status, verification_method, verifier_name, verifier_declaration, token_hash from public.birth_date_corrections");
      expect(rows).toEqual([{ status: "applied", verification_method: "guardian_email_link", verifier_name: "Sari Wulandari", verifier_declaration: "parent_or_legal_guardian", token_hash: null }]);
    });

    it("rejects undelivered, expired, declined, cancelled and replaced links", async () => {
      await patch(profile(MINOR));
      await correction(a, ADULT, "kor-queued", null);
      expect(await confirmCorrection("kor-queued")).toEqual({ error: "invalid_token" });
      await correction(a, ADULT, "kor-failed", false);
      expect(await confirmCorrection("kor-failed")).toEqual({ error: "invalid_token" });
      expect(await confirmCorrection("kor-queued")).toEqual({ error: "invalid_token" }); // replaced by the newer request
      await correction(a, ADULT, "kor-declined");
      expect(await confirmCorrection("kor-declined", false)).toEqual({ status: "declined" });
      expect(await confirmCorrection("kor-declined")).toEqual({ error: "invalid_token" });
      // three requests in a day is the limit
      expect(await correction(a, ADULT, "kor-4")).toEqual({ error: "rate_limited" });
      await superuser();
      await db.exec("update public.birth_date_corrections set requested_at = now() - interval '2 days'");
      await correction(a, ADULT, "kor-expired");
      await superuser();
      await db.exec("update public.birth_date_corrections set token_expires_at = now() - interval '1 second' where status = 'pending'");
      expect(await confirmCorrection("kor-expired")).toEqual({ error: "invalid_token" });
      expect(await call("public.guardian_consent_lookup($1)", [sha("kor-expired")])).toEqual({ error: "invalid_token" });
      await correction(a, ADULT, "kor-cancelled");
      await as(a);
      expect(await call("public.cancel_birth_date_correction()")).toEqual({ status: "cancelled" });
      expect(await call("public.cancel_birth_date_correction()")).toEqual({ error: "not_found" });
      expect(await confirmCorrection("kor-cancelled")).toEqual({ error: "invalid_token" });
      await superuser();
      expect((await db.query("select birth_date::text as d, birth_date_corrections as n from public.profiles where user_id = $1", [a])).rows).toEqual([{ d: MINOR, n: 0 }]);
    });

    it("is only for the change the account cannot make itself, and goes to the guardian already on record", async () => {
      await patch(profile(MINOR));
      expect(await correction(a, born(15), "kor-1")).toEqual({ error: "not_required" }); // still a minor
      expect(await correction(a, "2000-02-30", "kor-1").catch(() => "rejected")).toBe("rejected");
      await request(a, "tok-1"); // the guardian's inbox is now on record
      expect(await correction(a, ADULT, "kor-2", true, "lain@contoh.id")).toEqual({ error: "guardian_mismatch" });
      expect(await correction(a, ADULT, "kor-3")).toMatchObject({ id: expect.any(String) });
      // a consent token does not confirm a correction, and the other way round
      expect(await confirmCorrection("tok-1")).toEqual({ error: "invalid_token" });
      expect(await confirm("kor-3")).toEqual({ error: "invalid_token" });
      // another account cannot see, cancel or use it
      await as(b);
      expect((await db.query("select count(*)::int as n from public.birth_date_corrections")).rows).toEqual([{ n: 0 }]);
      expect(await call("public.cancel_birth_date_correction()")).toEqual({ error: "not_found" });
      await patch(profile(ADULT));
      expect(await correction(b, born(30), "kor-b")).toEqual({ error: "not_required" }); // adult: nothing to verify
      await as(a);
      await expect(db.query("update public.birth_date_corrections set status = 'applied'")).rejects.toThrow(/permission denied/);
      await expect(db.query("select token_hash from public.birth_date_corrections")).rejects.toThrow(/permission denied/);
    });
  });

  describe("a guardian who declines", () => {
    it("blocks processing and leaves the account pending, deleting nothing by itself", async () => {
      await verifiedMinor(a, "tok-1");
      await allow("tugas");
      await call("public.complete_onboarding()");
      expect(await call("public.revoke_guardian_consent()")).toEqual({ status: "revoked" });
      await request(a, "tok-2");
      expect(await confirm("tok-2", false)).toEqual({ status: "declined" });
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "declined", account_state: "pending", deletion_due_at: null });
      expect(await gate("tugas")).toEqual({ allowed: false, reason: "guardian_consent_required" });
      expect(await call("public.complete_onboarding()")).toEqual({ error: "guardian_consent_required" });
      await server();
      expect(await call("public.purge_guardian_requested_deletions()")).toEqual({ deleted: 0 });
      await superuser();
      expect((await db.query("select count(*)::int as n from public.profiles")).rows).toEqual([{ n: 2 }]);
    });

    it("deletes the account only on the guardian's request, after the notice period, with an audit trail", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      await server();
      expect(await call("public.confirm_guardian_consent($1, false, null, null, true)", [sha("tok-1")])).toEqual({ status: "declined", deletion_requested: true });
      await as(a);
      const status = await call("public.guardian_consent_status()");
      expect(status).toMatchObject({ status: "declined", account_state: "pending" });
      expect(new Date(status.deletion_due_at as string).getTime() - Date.now()).toBeGreaterThan(6.9 * 86400e3);
      await server();
      expect(await call("public.purge_guardian_requested_deletions()")).toEqual({ deleted: 0 }); // notice period not over
      await superuser();
      await db.exec("update public.guardian_consents set deletion_due_at = now() - interval '1 second' where deletion_requested_at is not null");
      await server();
      expect(await call("public.purge_guardian_requested_deletions()")).toEqual({ deleted: 1 });
      await superuser();
      expect((await db.query("select user_id from public.profiles")).rows).toEqual([{ user_id: b }]);
      expect((await db.query("select count(*)::int as n from public.guardian_consents")).rows).toEqual([{ n: 0 }]);
      const { rows } = await db.query<{ action: string }>("select action, actor_id, meta from public.audit_log where action like '%delet%' order by action");
      expect(rows.map((r) => r.action)).toEqual(["account_deleted", "guardian_deletion_requested", "guardian_requested_deletion_done"]);
      expect(JSON.stringify(rows)).not.toContain(a);
      await db.query("insert into auth.users (id) values ($1)", [a]);
      await db.query("insert into auth.sessions values ($1, $2, null)", [sessions[a], a]);
    });

    it("drops the deletion request when the guardian later consents, and spares an account that turned 18", async () => {
      await patch(profile(MINOR));
      await request(a, "tok-1");
      await server();
      await call("public.confirm_guardian_consent($1, false, null, null, true)", [sha("tok-1")]);
      await request(a, "tok-2");
      expect(await confirm("tok-2")).toEqual({ status: "verified" });
      await as(b);
      await patch(profile(born(18, 1)));
      await request(b, "tok-b");
      await server();
      await call("public.confirm_guardian_consent($1, false, null, null, true)", [sha("tok-b")]);
      await superuser();
      await db.exec("update public.guardian_consents set deletion_due_at = now() - interval '1 second' where deletion_requested_at is not null");
      await db.query("update public.profiles set birth_date = $2 where user_id = $1", [b, born(18)]);
      await server();
      expect(await call("public.purge_guardian_requested_deletions()")).toEqual({ deleted: 0 });
      await superuser();
      expect((await db.query("select count(*)::int as n from public.audit_log where action = 'guardian_deletion_cancelled'")).rows).toEqual([{ n: 1 }]);
      await as(a);
      expect(await call("public.guardian_consent_status()")).toMatchObject({ status: "verified", account_state: "granted", deletion_due_at: null });
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

  it("migrates existing data without deleting any, and rolls back and forward again", async () => {
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
    await old.query("update public.profiles set display_name = 'Minor', jenjang = 'SMA/SMK', birth_year = $2, onboarding_done = true where user_id = $1", [a, year - 16]);
    await old.query("update public.profiles set display_name = 'Adult', jenjang = 'Kuliah D3–S1', birth_year = $2, onboarding_done = true where user_id = $1", [b, year - 21]);
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
    // nothing of the users' data was deleted, and the stored years are untouched
    expect((await old.query("select count(*)::int as n, count(birth_date)::int as dated from public.profiles")).rows).toEqual([{ n: 3, dated: 0 }]);
    expect((await old.query("select display_name, birth_year::int as y from public.profiles where user_id = $1", [a])).rows).toEqual([{ display_name: "Minor", y: year - 16 }]);
    expect((await old.query("select count(*)::int as n from public.ai_permissions")).rows).toEqual([{ n: 3 }]);

    // rollback: the down script restores 0007's behaviour, and 0008 applies again on top of it
    const down = readFileSync(new URL("../rollback/0008_guardian_consent.down.sql", migrations), "utf8");
    await old.exec(down);
    const names = async () => (await old.query<{ n: string }>(`
      select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'
      union all select 'table:' || tablename from pg_tables where schemaname = 'public'
      union all select 'column:' || column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'
      union all select 'trigger:' || tgname from pg_trigger where not tgisinternal order by 1`)).rows.map((r) => r.n);
    const before = new PGlite();
    await before.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users (id uuid primary key); create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users (id) on delete cascade, not_after timestamptz); create function auth.jwt() returns jsonb language sql stable as $$ select current_setting('request.jwt.claims', true)::jsonb $$; create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt() ->> 'sub')::uuid $$;");
    for (const file of files.filter((name) => name < "0008")) await before.exec(readFileSync(new URL(file, migrations), "utf8"));
    const expected = (await before.query<{ n: string }>(`
      select p.proname as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'
      union all select 'table:' || tablename from pg_tables where schemaname = 'public'
      union all select 'column:' || column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles'
      union all select 'trigger:' || tgname from pg_trigger where not tgisinternal order by 1`)).rows.map((r) => r.n);
    await before.close();
    expect(await names()).toEqual(expected);
    // the 0007 writers answer again as the account
    await old.query("insert into auth.sessions values ($1, $2, null)", [sessions[a], a]);
    await old.exec(`set role authenticated; select set_config('request.jwt.claims', '${JSON.stringify({ sub: a, session_id: sessions[a] })}', false)`);
    expect((await old.query<{ r: Result }>("select public.set_ai_permission('profil', true) as r")).rows[0].r.changed).toBe(true);
    // 0007 again: the account writes its own birth year, adult included
    expect((await old.query<{ r: { profile: { birth_year: number } } }>(`select public.update_profile('{"birth_year": ${year - 30}}') as r`)).rows[0].r.profile.birth_year).toBe(year - 30);
    expect((await old.query<{ r: Result }>("select public.export_account_data() as r")).rows[0].r).not.toHaveProperty("guardian_consents");
    await old.exec("reset role");
    await old.exec(readFileSync(new URL(files.find((name) => name.startsWith("0008"))!, migrations), "utf8"));
    await old.close();
  }, 40000);
});
