import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/user-competitions/route";
import { DELETE, PUT } from "@/app/api/v1/user-competitions/[key]/route";

const { auth, rpc, from } = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));

const origin = "https://ata.example";
const request = (method: string, key: string, body?: unknown, from = origin) =>
  new Request(`${origin}/api/v1/user-competitions/${key}`, {
    method,
    headers: { origin: from, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const context = (key: string) => ({ params: Promise.resolve({ key }) });
const row = { competition_key: "lomba-a", source: "catalog", state: "slot", card: null, roadmap: null, committed_at: null, created_at: "t", updated_at: "t" };

function signedIn() {
  auth.getUser.mockResolvedValue({ data: { user: { id: "account-a", is_anonymous: false } }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
}
const upsert = vi.fn();
const remove = vi.fn();
function table(result: { data?: unknown; error?: unknown }) {
  upsert.mockReturnValue({ select: () => ({ single: async () => result }) });
  remove.mockReturnValue({ eq: async () => result });
  from.mockReturnValue({ upsert, delete: remove });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("APP_ORIGIN", origin);
});

describe("/api/v1/user-competitions", () => {
  it("requires a session for every method", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET()).status).toBe(401);
    expect((await PUT(request("PUT", "lomba-a", { state: "saved" }), context("lomba-a"))).status).toBe(401);
    expect((await DELETE(request("DELETE", "lomba-a"), context("lomba-a"))).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects another origin before touching the account", async () => {
    signedIn();
    const response = await PUT(request("PUT", "lomba-a", { state: "saved" }, "https://lain.example"), context("lomba-a"));
    expect(response.status).toBe(403);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("lists the account's rows with the Slot limit of its plan", async () => {
    signedIn();
    from.mockImplementation((name: string) => {
      if (name === "user_competitions") return { select: () => ({ order: async () => ({ data: [row], error: null }) }) };
      if (name === "entitlements") return { select: () => ({ order: async () => ({ data: [], error: null }) }) };
      return { select: () => ({ eq: async () => ({ data: [{ feature: "activeSlots", enabled: true, limit: 1, period: null, status: "final", note: "K-23" }], error: null }) }) };
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ items: [row], plan: "free", slot_limit: 1 });
  });

  it("validates the key and the body", async () => {
    signedIn();
    table({ data: row, error: null });
    expect((await PUT(request("PUT", "x", { state: "saved" }), context("../x"))).status).toBe(422);
    expect((await PUT(request("PUT", "lomba-a", { state: "arsip" }), context("lomba-a"))).status).toBe(422);
    expect((await PUT(request("PUT", "lomba-a", { state: "saved", user_id: "account-b" }), context("lomba-a"))).status).toBe(422);
    expect((await PUT(request("PUT", "lomba-a", { state: "saved", card: { t: "x".repeat(100 * 1024) } }), context("lomba-a"))).status).toBe(422);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts without a client-chosen owner and keeps omitted columns", async () => {
    signedIn();
    table({ data: row, error: null });
    const response = await PUT(request("PUT", "lomba-a", { state: "slot", roadmap: { langkah: [] } }), context("lomba-a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(row);
    expect(upsert).toHaveBeenCalledWith(
      { competition_key: "lomba-a", state: "slot", source: "catalog", roadmap: { langkah: [] } },
      { onConflict: "user_id,competition_key" },
    );
  });

  it("answers 409 limit_reached when the database trigger rejects a new Slot", async () => {
    signedIn();
    table({ data: null, error: { code: "P0001", message: "slot_limit_reached" } });
    const response = await PUT(request("PUT", "lomba-b", { state: "slot" }), context("lomba-b"));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("limit_reached");
  });

  it("deletes one row and reports storage failures as unavailable", async () => {
    signedIn();
    table({ error: null });
    expect((await DELETE(request("DELETE", "lomba-a"), context("lomba-a"))).status).toBe(204);
    table({ error: { code: "XX000", message: "boom" } });
    expect((await DELETE(request("DELETE", "lomba-a"), context("lomba-a"))).status).toBe(503);
  });
});
