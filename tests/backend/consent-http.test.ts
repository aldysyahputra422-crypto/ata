import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getConsent } from "@/app/api/v1/consent/route";
import { POST as requestConsent } from "@/app/api/v1/consent/request/route";
import { POST as revokeConsent } from "@/app/api/v1/consent/revoke/route";
import { POST as lookup } from "@/app/api/v1/consent/guardian/lookup/route";
import { POST as confirm } from "@/app/api/v1/consent/guardian/confirm/route";
import { POST as withdraw } from "@/app/api/v1/consent/guardian/withdraw/route";
import { POST as complete } from "@/app/api/v1/profile/onboarding/complete/route";
import { PATCH as patchPermission } from "@/app/api/v1/permissions/route";
import { PATCH as patchProfile } from "@/app/api/v1/profile/route";
import { canProcessAi } from "@/lib/account/ai-gate";
import { mailbox } from "@/lib/account/consent";

vi.mock("server-only", () => ({}));
const { auth, rpc, from, adminRpc } = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn(), adminRpc: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: adminRpc }) }));

const origin = "https://ata.example";
const post = (path: string, body?: unknown, source = origin) =>
  new Request(origin + path, {
    method: "POST",
    headers: { origin: source, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const TOKEN = "A".repeat(43);
const guardian = { guardian_name: "Bu Sari", guardian_email: "Wali@Contoh.id" };
let results: Record<string, unknown> = {};
let adminResults: Record<string, unknown> = {};
const fetchMock = vi.fn();

function signedIn(id = "account-a") {
  auth.getUser.mockResolvedValue({ data: { user: { id, email: "raka@contoh.id", is_anonymous: false } }, error: null });
  rpc.mockImplementation(async (name: string) => {
    if (name === "account_session_active") return { data: true, error: null };
    return name in results ? results[name] : { data: null, error: { code: "x" } };
  });
  from.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    for (const k of ["select", "eq", "limit"]) chain[k] = () => chain;
    const result = { data: { display_name: "Raka", interests: [], targets: [], skills: [], onboarding_done: false, updated_at: "x" }, error: null };
    return Object.assign(chain, { maybeSingle: async () => result, single: async () => result });
  });
}
function delivery(on: boolean) {
  vi.stubEnv("RESEND_API_KEY", on ? "test-key" : "");
  vi.stubEnv("GUARDIAN_CONSENT_EMAIL_FROM", on ? "Ata <ata@contoh.id>" : "");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");
  vi.stubEnv("APP_ORIGIN", origin);
  delivery(true);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "msg-1" }), { status: 200 }));
  results = {};
  adminResults = {
    create_guardian_consent_request: { data: { id: "req-1", expires_at: "2026-11-26T00:00:00Z" }, error: null },
    record_guardian_consent_delivery: { data: { delivery_status: "sent" }, error: null },
  };
  adminRpc.mockImplementation(async (name: string) => (name in adminResults ? adminResults[name] : { data: null, error: { code: "x" } }));
});

describe("/api/v1/consent (FR-AUTH-07)", () => {
  it("requires a session on the account routes and never reaches the service role without one", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const responses = [await getConsent(), await requestConsent(post("/api/v1/consent/request", guardian)), await revokeConsent(post("/api/v1/consent/revoke"))];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401]);
    expect(adminRpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects another origin on every write", async () => {
    signedIn();
    const lain = "https://lain.example";
    const responses = [
      await requestConsent(post("/api/v1/consent/request", guardian, lain)), await revokeConsent(post("/api/v1/consent/revoke", undefined, lain)),
      await lookup(post("/api/v1/consent/guardian/lookup", { token: TOKEN }, lain)),
      await confirm(post("/api/v1/consent/guardian/confirm", { token: TOKEN, approve: false }, lain)),
      await withdraw(post("/api/v1/consent/guardian/withdraw", { token: TOKEN }, lain)),
    ];
    expect(responses.map((r) => r.status)).toEqual([403, 403, 403, 403, 403]);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("returns the consent status without hashes and says whether delivery is wired", async () => {
    signedIn();
    results.guardian_consent_status = { data: { status: "pending", required: true, guardian_name: "Bu Sari", contact_masked: "w***@contoh.id", version: "v1", scope: ["profil", "lain"], token_hash: sha("x"), guardian_contact_hash: sha("y") }, error: null };
    const on = await (await getConsent()).json();
    expect(on.consent).toMatchObject({ status: "pending", required: true, delivery_available: true, scope: ["profil"] });
    expect(JSON.stringify(on)).not.toMatch(/[0-9a-f]{64}/);
    delivery(false);
    expect((await (await getConsent()).json()).consent.delivery_available).toBe(false);
    results.guardian_consent_status = { data: { status: "apa-saja" }, error: null };
    expect((await getConsent()).status).toBe(503);
  });

  it("sends the link to the guardian only: the token is hashed for the database and never returned", async () => {
    signedIn();
    const response = await requestConsent(post("/api/v1/consent/request", guardian));
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toEqual({ status: "pending", contact_masked: "w***@contoh.id", expires_at: "2026-11-26T00:00:00Z" });

    const [, args] = adminRpc.mock.calls.find(([name]) => name === "create_guardian_consent_request")!;
    expect(args).toMatchObject({ p_user_id: "account-a", p_guardian_name: "Bu Sari", p_contact_hash: sha("wali@contoh.id"), p_contact_masked: "w***@contoh.id" });
    const [url, init] = fetchMock.mock.calls[0];
    const mail = JSON.parse(init.body);
    expect(url).toBe("https://api.resend.com/emails");
    expect(mail.to).toEqual(["wali@contoh.id"]);
    const token = /https:\/\/ata\.example\/wali\/persetujuan#t=([A-Za-z0-9_-]{43})/.exec(mail.text)?.[1];
    expect(token).toBeDefined();
    expect(sha(token!)).toBe(args.p_token_hash);
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(args)).not.toContain(token);
    expect(adminRpc).toHaveBeenCalledWith("record_guardian_consent_delivery", { p_id: "req-1", p_sent: true, p_ref: "resend:msg-1" });
  });

  it("ignores an account id, status or token smuggled into the request", async () => {
    signedIn();
    for (const extra of [{ user_id: "account-b" }, { status: "verified" }, { token_hash: sha("x") }, { verified: true }, { acknowledged: true }]) {
      expect((await requestConsent(post("/api/v1/consent/request", { ...guardian, ...extra }))).status).toBe(422);
    }
    for (const body of [{}, { guardian_name: "B", guardian_email: "wali@contoh.id" }, { guardian_name: "Bu Sari", guardian_email: "bukan-email" },
      { guardian_name: "<b>Sari</b>", guardian_email: "wali@contoh.id" }, { guardian_name: "Bu Sari" }, []]) {
      expect((await requestConsent(post("/api/v1/consent/request", body))).status).toBe(422);
    }
    expect(adminRpc).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses the student's own email as the guardian's", async () => {
    signedIn();
    for (const guardian_email of [" RAKA@contoh.id ", "raka+wali@contoh.id"]) {
      const response = await requestConsent(post("/api/v1/consent/request", { guardian_name: "Bu Sari", guardian_email }));
      expect(response.status, guardian_email).toBe(422);
      expect((await response.json()).error.field).toBe("guardian_email");
    }
    expect(mailbox("R.a.ka+x@GoogleMail.com")).toBe("raka@gmail.com");
    expect(mailbox("r.aka@contoh.id")).toBe("r.aka@contoh.id");
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("opens no request when no delivery channel is wired", async () => {
    signedIn();
    delivery(false);
    const response = await requestConsent(post("/api/v1/consent/request", guardian));
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("delivery_unavailable");
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("records a failed delivery and reports it, so the link can never verify", async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const response = await requestConsent(post("/api/v1/consent/request", guardian));
    expect(response.status).toBe(502);
    expect(adminRpc).toHaveBeenCalledWith("record_guardian_consent_delivery", { p_id: "req-1", p_sent: false, p_ref: null });
    fetchMock.mockRejectedValue(new Error("network"));
    expect((await requestConsent(post("/api/v1/consent/request", guardian))).status).toBe(502);
  });

  it.each([["age_required", 409], ["not_required", 409], ["already_verified", 409], ["rate_limited", 429], ["validation", 422], ["not_found", 503]])(
    "maps the database's %s to %i and sends nothing", async (error, status) => {
      signedIn();
      adminResults.create_guardian_consent_request = { data: { error }, error: null };
      expect((await requestConsent(post("/api/v1/consent/request", guardian))).status).toBe(status);
      expect(fetchMock).not.toHaveBeenCalled();
    });

  it("revokes through the account's own session", async () => {
    signedIn();
    results.revoke_guardian_consent = { data: { status: "revoked" }, error: null };
    expect((await revokeConsent(post("/api/v1/consent/revoke"))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("revoke_guardian_consent");
    expect(adminRpc).not.toHaveBeenCalled();
    results.revoke_guardian_consent = { data: { error: "not_found" }, error: null };
    expect((await revokeConsent(post("/api/v1/consent/revoke"))).status).toBe(404);
    results.revoke_guardian_consent = { data: null, error: { code: "42501" } };
    expect((await revokeConsent(post("/api/v1/consent/revoke"))).status).toBe(401);
  });
});

describe("guardian routes (FR-AUTH-07)", () => {
  it("rejects malformed tokens and extra fields before the database", async () => {
    for (const body of [{}, { token: "pendek" }, { token: TOKEN + "x" }, { token: sha("x") }, { token: TOKEN, user_id: "account-a" }, { token: [TOKEN] }]) {
      expect((await lookup(post("/api/v1/consent/guardian/lookup", body))).status).toBe(422);
      expect((await withdraw(post("/api/v1/consent/guardian/withdraw", body))).status).toBe(422);
    }
    for (const body of [
      { token: TOKEN }, { token: TOKEN, approve: true }, { token: TOKEN, approve: true, verifier_name: "Sari" },
      { token: TOKEN, approve: true, verifier_name: "Sari", is_guardian: false }, { token: TOKEN, approve: true, verifier_name: "S", is_guardian: true },
      { token: TOKEN, approve: "true", verifier_name: "Sari", is_guardian: true }, { token: TOKEN, approve: false, status: "verified" },
      { token: TOKEN, approve: true, verifier_name: "Sari", is_guardian: true, user_id: "account-b" },
    ]) expect((await confirm(post("/api/v1/consent/guardian/confirm", body))).status, JSON.stringify(body)).toBe(422);
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("looks a link up by the token's hash and answers 404 for anything unknown", async () => {
    adminResults.guardian_consent_lookup = { data: { kind: "confirm", student_name: "Raka", guardian_name: "Bu Sari", version: "v1", scope: ["profil"], user_id: "account-a" }, error: null };
    const response = await lookup(post("/api/v1/consent/guardian/lookup", { token: TOKEN }));
    expect(await response.json()).toEqual({ kind: "confirm", student_name: "Raka", guardian_name: "Bu Sari", version: "v1", scope: ["profil"], expires_at: null, verified_at: null });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(adminRpc).toHaveBeenCalledWith("guardian_consent_lookup", { p_token_hash: sha(TOKEN) });
    adminResults.guardian_consent_lookup = { data: { error: "invalid_token" }, error: null };
    expect((await lookup(post("/api/v1/consent/guardian/lookup", { token: TOKEN }))).status).toBe(404);
  });

  it("confirms with the hashed token and hands the withdrawal token over once, storing only its hash", async () => {
    adminResults.confirm_guardian_consent = { data: { status: "verified" }, error: null };
    const response = await confirm(post("/api/v1/consent/guardian/confirm", { token: TOKEN, approve: true, verifier_name: " Sari Wulandari ", is_guardian: true }));
    const body = await response.json();
    expect(body.status).toBe("verified");
    expect(body.withdraw_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(adminRpc).toHaveBeenCalledWith("confirm_guardian_consent", { p_token_hash: sha(TOKEN), p_approve: true, p_verifier_name: "Sari Wulandari", p_revoke_token_hash: sha(body.withdraw_token) });

    adminResults.confirm_guardian_consent = { data: { status: "declined" }, error: null };
    const declined = await confirm(post("/api/v1/consent/guardian/confirm", { token: TOKEN, approve: false }));
    expect(await declined.json()).toEqual({ status: "declined" });
    adminResults.confirm_guardian_consent = { data: { error: "invalid_token" }, error: null };
    const used = await confirm(post("/api/v1/consent/guardian/confirm", { token: TOKEN, approve: true, verifier_name: "Sari", is_guardian: true }));
    expect(used.status).toBe(404);
    expect(await used.json()).not.toHaveProperty("withdraw_token");
  });

  it("withdraws with the withdrawal token", async () => {
    adminResults.withdraw_guardian_consent = { data: { status: "revoked" }, error: null };
    expect((await withdraw(post("/api/v1/consent/guardian/withdraw", { token: TOKEN }))).status).toBe(200);
    expect(adminRpc).toHaveBeenCalledWith("withdraw_guardian_consent", { p_revoke_token_hash: sha(TOKEN) });
    adminResults.withdraw_guardian_consent = { data: { error: "invalid_token" }, error: null };
    expect((await withdraw(post("/api/v1/consent/guardian/withdraw", { token: TOKEN }))).status).toBe(404);
  });

  it("is unavailable, not open, without the service role key", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect((await confirm(post("/api/v1/consent/guardian/confirm", { token: TOKEN, approve: true, verifier_name: "Sari", is_guardian: true }))).status).toBe(503);
    expect(adminRpc).not.toHaveBeenCalled();
  });
});

describe("routes that now depend on consent (FR-AUTH-07)", () => {
  const patch = (path: string, body: unknown) => new Request(origin + path, { method: "PATCH", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

  it("answers 403 when the database wants guardian consent", async () => {
    signedIn();
    results.complete_onboarding = { data: { error: "guardian_consent_required" }, error: null };
    const done = await complete(post("/api/v1/profile/onboarding/complete"));
    expect(done.status).toBe(403);
    expect((await done.json()).error.code).toBe("guardian_consent_required");
    results.set_ai_permission = { data: { error: "guardian_consent_required" }, error: null };
    const on = await patchPermission(patch("/api/v1/permissions", { category: "dokumen", allowed: true }));
    expect(on.status).toBe(403);
    expect((await on.json()).error.code).toBe("guardian_consent_required");
    results.set_ai_permission = { data: { error: "age_required" }, error: null };
    expect((await patchPermission(patch("/api/v1/permissions", { category: "dokumen", allowed: true }))).status).toBe(409);
  });

  it("answers 409 when a minor's birth year is changed to an adult's", async () => {
    signedIn();
    results.update_profile = { data: { error: "age_locked", field: "birth_year" }, error: null };
    const response = await patchProfile(patch("/api/v1/profile", { birth_year: 1990 }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatchObject({ code: "age_locked", field: "birth_year" });
  });
});

describe("canProcessAi", () => {
  it("is signed_out without a session, for another account, an anonymous user or no user id", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await canProcessAi("account-a", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
    signedIn("account-b");
    expect(await canProcessAi("account-a", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
    expect(await canProcessAi("", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
    auth.getUser.mockResolvedValue({ data: { user: { id: "account-a", is_anonymous: true } }, error: null });
    expect(await canProcessAi("account-a", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
    expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await canProcessAi("account-a", "tugas")).toEqual({ allowed: false, reason: "signed_out" });
  });

  it("returns the database's decision", async () => {
    signedIn();
    for (const data of [{ allowed: true }, { allowed: false, reason: "guardian_consent_required" }, { allowed: false, reason: "permission_off" }, { allowed: false, reason: "signed_out" }]) {
      results.can_process_ai = { data, error: null };
      expect(await canProcessAi("account-a", "dokumen")).toEqual(data);
    }
    expect(rpc).toHaveBeenLastCalledWith("can_process_ai", { p_category: "dokumen" });
  });

  it("refuses on anything unexpected", async () => {
    signedIn();
    // @ts-expect-error a category outside the contract
    expect(await canProcessAi("account-a", "rahasia")).toEqual({ allowed: false, reason: "permission_off" });
    for (const result of [{ data: null, error: { code: "x" } }, { data: null, error: null }, { data: { allowed: "true" }, error: null },
      { data: { allowed: 1 }, error: null }, { data: { allowed: false, reason: "lain" }, error: null }, { data: { allowed: true }, error: { code: "x" } }]) {
      results.can_process_ai = result;
      expect((await canProcessAi("account-a", "tugas")).allowed).toBe(false);
    }
    rpc.mockRejectedValue(new Error("network"));
    expect(await canProcessAi("account-a", "tugas")).toEqual({ allowed: false });
  });
});
