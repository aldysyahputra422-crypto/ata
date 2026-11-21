import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as me } from "@/app/api/v1/me/route";
import { GET as exportAccount } from "@/app/api/v1/account/export/route";
import { GET as googleStart } from "@/app/api/v1/auth/google/start/route";
import { GET as googleCallback } from "@/app/api/v1/auth/google/callback/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as redeem } from "@/app/api/v1/redeem/route";
import { DELETE as deleteAccount } from "@/app/api/v1/account/route";

const { auth, rpc, from, getCookie, deleteUser, recordAudit } = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(), exchangeCodeForSession: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
  getCookie: vi.fn(),
  deleteUser: vi.fn(),
  recordAudit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ auth: { admin: { deleteUser } } }) }));
vi.mock("@/lib/account/audit", () => ({ recordAuthEvent: recordAudit }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));

const origin = "https://ata.example";
const user = { id: "account-a", email: "a@example.com", app_metadata: {}, user_metadata: { name: "Aldi", role: "admin" } };
const key = "01b00000-0000-4000-b000-000000000000";
const request = (method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) =>
  new Request(`${origin}/api/v1${path}`, {
    method,
    headers: { origin, ...(body === undefined ? {} : { "content-type": "application/json" }), ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
  vi.stubEnv("APP_ORIGIN", origin);
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ external: { google: false } })));
  auth.getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("R0.1 HTTP contract", () => {
  it("shows the signed-out account and denies protected actions with a forged cookie", async () => {
    auth.getUser.mockResolvedValue({ error: { status: 401 }, data: { user: null } });
    const status = await me();
    expect(status.headers.get("cache-control")).toBe("private, no-store");
    expect(await status.json()).toMatchObject({
      signed_in: false, plan: { plan: "free" }, config: { google: false, payments: false }, ai: { mode: "B" },
    });
    expect((await exportAccount()).status).toBe(401);
    expect((await redeem(request("POST", "/redeem", { code: "abc" }))).status).toBe(401);
    expect((await deleteAccount(request("DELETE", "/account", { confirm: "HAPUS" }))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("treats a revoked or expired session as signed out even if the Auth server still returns a user", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await (await me()).json()).toMatchObject({ signed_in: false });
    expect((await exportAccount()).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns only active grants, seeded feature values, and a trusted role", async () => {
    const order = vi.fn(async () => ({
      data: [
        { status: "active", source: "grant", starts_at: "2080-01-01", ends_at: "2090-01-01" },
        { status: "active", source: "redeem", starts_at: "2020-01-01", ends_at: "2070-01-01" },
        { status: "active", source: "partner", starts_at: "2019-01-01", ends_at: "2020-01-01" },
      ],
    }));
    const eq = vi.fn(async () => ({ data: [{ feature: "activeSlots", limit: 3, status: "final" }] }));
    from.mockReturnValueOnce({ select: () => ({ order }) }).mockReturnValueOnce({ select: () => ({ eq }) });
    expect(await (await me()).json()).toMatchObject({
      signed_in: true, user: { id: user.id, role: "user" },
      plan: { plan: "pro", ends_at: "2070-01-01", sources: ["redeem"], features: { activeSlots: { limit: 3, status: "final" } } },
    });
    expect(eq).toHaveBeenCalledWith("plan", "pro");
  });

  it("enforces request origin and controls redeem inputs and error codes", async () => {
    expect((await redeem(request("POST", "/redeem", { code: "abc" }, { origin: "https://other.example" }))).status).toBe(403);
    expect((await redeem(request("POST", "/redeem", { code: "abc", user_id: "account-b" }))).status).toBe(422);
    expect((await redeem(request("POST", "/redeem", { code: "abc" }, { "idempotency-key": "invalid" }))).status).toBe(422);
    const call = () => redeem(request("POST", "/redeem", { code: "  abc  " }, { "idempotency-key": key }));
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { error: "already_redeemed" } });
    expect((await call()).status).toBe(409);
    expect(rpc).toHaveBeenCalledWith("redeem_code", { code: "abc", request_key: key });
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { error: "invalid_code" } });
    expect((await call()).status).toBe(422);
  });

  it("exports identity from the session, requires deletion confirmation, and revokes only the current session on logout", async () => {
    rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: { profile: { user_id: user.id } } });
    const exported = await exportAccount();
    expect(exported.headers.get("content-disposition")).toContain("attachment");
    expect(await exported.json()).toMatchObject({ user: { id: user.id }, profile: { user_id: user.id } });
    expect(rpc).toHaveBeenLastCalledWith("export_account_data");
    expect((await deleteAccount(request("DELETE", "/account?user_id=B", { confirm: "wrong" }))).status).toBe(422);
    expect((await deleteAccount(request("DELETE", "/account", { confirm: "HAPUS", user_id: "B" }))).status).toBe(422);
    expect(deleteUser).not.toHaveBeenCalled();
    auth.signOut.mockResolvedValue({ error: null });
    expect((await logout(request("POST", "/auth/logout"))).status).toBe(204);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    deleteUser.mockResolvedValue({ error: null });
    expect((await deleteAccount(request("DELETE", "/account?user_id=B", { confirm: "HAPUS" }))).status).toBe(204);
    expect(deleteUser).toHaveBeenCalledWith(user.id);
  });

  it("reports a disabled provider and delegates Google OAuth to Supabase with an exact callback", async () => {
    expect((await googleStart(request("GET", "/auth/google/start"))).status).toBe(503);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ external: { google: true } })));
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example/auth/v1/authorize" }, error: null });
    const result = await googleStart(request("GET", "/auth/google/start?return_to=//other.example"));
    expect(result.status).toBe(302);
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google", options: { redirectTo: `${origin}/api/v1/auth/google/callback` },
    });
    expect(result.headers.get("set-cookie")).toMatch(/ata-oauth-return=.*hari-ini.*Secure.*HttpOnly/i);
  });

  it("refuses a failed callback and redirects after a successful PKCE code exchange", async () => {
    expect((await googleCallback(request("GET", "/auth/google/callback?error=access_denied"))).headers.get("location"))
      .toBe(`${origin}/?galat=oauth`);
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: { status: 400 } });
    expect((await googleCallback(request("GET", "/auth/google/callback?code=wrong-state"))).headers.get("location"))
      .toBe(`${origin}/?galat=oauth`);
    expect(recordAudit).not.toHaveBeenCalled();
    auth.exchangeCodeForSession.mockResolvedValueOnce({ data: { user, session: {} }, error: null });
    getCookie.mockReturnValue({ value: "/lomba?tab=radar" });
    expect((await googleCallback(request("GET", "/auth/google/callback?code=good"))).headers.get("location"))
      .toBe(`${origin}/lomba?tab=radar`);
    expect(recordAudit).toHaveBeenCalledWith(user.id, "login");
  });
});
