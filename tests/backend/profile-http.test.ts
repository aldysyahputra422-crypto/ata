import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getProfile, PATCH as patchProfile } from "@/app/api/v1/profile/route";
import { POST as complete } from "@/app/api/v1/profile/onboarding/complete/route";
import { GET as getPermissions, PATCH as patchPermission } from "@/app/api/v1/permissions/route";

vi.mock("server-only", () => ({}));
const { auth, rpc, from } = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));

const origin = "https://ata.example";
const request = (path: string, method: string, body?: unknown, source = origin) =>
  new Request(origin + path, {
    method,
    headers: { origin: source, "content-type": "application/json" },
    body: typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body),
  });
const row = {
  user_id: "account-a", display_name: "Raka", jenjang: "SMA/SMK", birth_year: 2009, institution: null, major: null, timezone: null,
  interests: [], targets: [], skills: [], goals_text: null, weekly_hours: null, onboarding_done: false, fee_max_idr: 9, updated_at: "2026-11-23T00:00:00Z",
};
let results: Record<string, unknown> = {};

function signedIn() {
  auth.getUser.mockResolvedValue({ data: { user: { id: "account-a", is_anonymous: false } }, error: null });
  rpc.mockImplementation(async (name: string) => {
    if (name === "account_session_active") return { data: true, error: null };
    return name in results ? results[name] : { data: null, error: { code: "x" } };
  });
  from.mockImplementation((name: string) => {
    const result = { data: name === "profiles" ? row : name === "ai_permissions" ? { categories: { tugas: true, lain: true }, updated_at: null } : null, error: null };
    const chain: Record<string, unknown> = {};
    for (const k of ["select", "eq", "limit"]) chain[k] = () => chain;
    return Object.assign(chain, { maybeSingle: async () => result, single: async () => result });
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("APP_ORIGIN", origin);
  results = {};
});

describe("/api/v1/profile and /api/v1/permissions (FR-ONB-02, FR-AUTH-08)", () => {
  it("requires a session on every route", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const responses = [
      await getProfile(), await patchProfile(request("/api/v1/profile", "PATCH", { major: "x" })),
      await complete(request("/api/v1/profile/onboarding/complete", "POST")),
      await getPermissions(), await patchPermission(request("/api/v1/permissions", "PATCH", { category: "tugas", allowed: true })),
    ];
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects another origin before touching the account", async () => {
    signedIn();
    const lain = "https://lain.example";
    expect((await patchProfile(request("/api/v1/profile", "PATCH", { major: "x" }, lain))).status).toBe(403);
    expect((await complete(request("/api/v1/profile/onboarding/complete", "POST", undefined, lain))).status).toBe(403);
    expect((await patchPermission(request("/api/v1/permissions", "PATCH", { category: "tugas", allowed: true }, lain))).status).toBe(403);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("returns only documented profile fields, uncached", async () => {
    signedIn();
    const response = await getProfile();
    const { profile } = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(profile.display_name).toBe("Raka");
    expect(profile).not.toHaveProperty("user_id");
    expect(profile).not.toHaveProperty("fee_max_idr");
  });

  it("refuses malformed JSON, unknown fields and server-owned fields without calling the database", async () => {
    signedIn();
    for (const body of ["{", {}, { onboarding_done: true }, { user_id: "account-b" }, { birth_year: 1900 }, { interests: "KTI" }]) {
      expect((await patchProfile(request("/api/v1/profile", "PATCH", body))).status).toBe(422);
    }
    expect(rpc).not.toHaveBeenCalledWith("update_profile", expect.anything());
  });

  it("saves a patch and reports the field the database refused", async () => {
    signedIn();
    results.update_profile = { data: { profile: { ...row, major: "Statistika" } }, error: null };
    const ok = await patchProfile(request("/api/v1/profile", "PATCH", { major: " Statistika " }));
    expect(rpc).toHaveBeenCalledWith("update_profile", { p_patch: { major: "Statistika" } });
    expect((await ok.json()).profile).toMatchObject({ major: "Statistika" });
    results.update_profile = { data: { error: "validation", field: "timezone" }, error: null };
    const bad = await patchProfile(request("/api/v1/profile", "PATCH", { timezone: "Mars/Olympus" }));
    expect(bad.status).toBe(422);
    expect((await bad.json()).error.field).toBe("timezone");
    results.update_profile = { data: null, error: { code: "42501" } };
    expect((await patchProfile(request("/api/v1/profile", "PATCH", { major: "x" }))).status).toBe(401);
    results.update_profile = { data: null, error: { code: "XX000" } };
    expect((await patchProfile(request("/api/v1/profile", "PATCH", { major: "x" }))).status).toBe(503);
  });

  it("completes onboarding only when the database agrees", async () => {
    signedIn();
    results.complete_onboarding = { data: { error: "incomplete" }, error: null };
    expect((await complete(request("/api/v1/profile/onboarding/complete", "POST"))).status).toBe(409);
    results.complete_onboarding = { data: { done: true }, error: null };
    const ok = await complete(request("/api/v1/profile/onboarding/complete", "POST"));
    expect(await ok.json()).toEqual({ done: true });
  });

  it("lists eight categories and changes one at a time", async () => {
    signedIn();
    const { categories } = await (await getPermissions()).json();
    expect(Object.keys(categories)).toHaveLength(8);
    expect(categories).toMatchObject({ tugas: true, profil: false });
    expect(categories).not.toHaveProperty("lain");
    for (const body of ["{", { category: "lain", allowed: true }, { category: "tugas", allowed: "ya" }, { category: "tugas", allowed: true, semua: true }, { tugas: true }]) {
      expect((await patchPermission(request("/api/v1/permissions", "PATCH", body))).status).toBe(422);
    }
    expect(rpc).not.toHaveBeenCalledWith("set_ai_permission", expect.anything());
    results.set_ai_permission = { data: { categories: { dokumen: true }, updated_at: "2026-11-23T00:00:00Z" }, error: null };
    const ok = await patchPermission(request("/api/v1/permissions", "PATCH", { category: "dokumen", allowed: true }));
    expect(rpc).toHaveBeenCalledWith("set_ai_permission", { p_category: "dokumen", p_allowed: true });
    expect((await ok.json()).categories).toMatchObject({ dokumen: true, tugas: false });
  });
});
