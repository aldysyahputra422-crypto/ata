import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "@/app/api/v1/tasks/[key]/[step]/route";
import { GET } from "@/app/api/v1/progress/route";

vi.mock("server-only", () => ({}));
const { auth, rpc, from } = vi.hoisted(() => ({ auth: { getUser: vi.fn() }, rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc, from }) }));

const origin = "https://ata.example";
const request = (body: unknown, from = origin) =>
  new Request(origin + "/api/v1/tasks/lomba-a/s1", { method: "PUT", headers: { origin: from, "content-type": "application/json" }, body: JSON.stringify(body) });
const context = (key = "lomba-a", step = "s1") => ({ params: Promise.resolve({ key, step }) });
const roadmap = { disetujui: true, langkah: [{ id: "s1", nama: "A", tanggal: "2026-11-25", selesai: true, selesaiPada: "2020-01-01" }] };
const competition = { competition_key: "lomba-a", source: "catalog", state: "slot", card: null, roadmap };
let tasks: unknown[] = [];
let status: unknown = { changed: true, task: { status: "done" } };

function signedIn() {
  auth.getUser.mockResolvedValue({ data: { user: { id: "account-a", is_anonymous: false } }, error: null });
  rpc.mockImplementation(async (name: string) => {
    if (name === "account_session_active") return { data: true, error: null };
    if (name === "progress_today") return { data: { today: "2026-11-23", timezone: "Asia/Jakarta" }, error: null };
    if (name === "set_task_status") return { data: status, error: null };
    return { data: null, error: { code: "x" } };
  });
  from.mockImplementation((name: string) => {
    if (name === "task_progress") return { select: async () => ({ data: tasks, error: null }) };
    if (name === "user_competitions") {
      const result = { data: [competition], error: null };
      return { select: () => Object.assign(Promise.resolve(result), { order: async () => result }) };
    }
    const data = name === "plan_features" ? [{ feature: "activeSlots", enabled: true, limit: 1, period: null, status: "final", note: null }] : [];
    const chain: Record<string, unknown> = {};
    for (const k of ["select", "eq", "in", "or", "lte", "gt", "is", "order", "limit"]) chain[k] = () => chain;
    return Object.assign(chain, { then: (ok: (v: unknown) => unknown) => ok({ data, error: null }), maybeSingle: async () => ({ data: null, error: null }) });
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-publishable");
  vi.stubEnv("APP_ORIGIN", origin);
  tasks = [];
  status = { changed: true, task: { status: "done" } };
});

describe("/api/v1/tasks and /api/v1/progress (FR-PRG-03)", () => {
  it("requires a session", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await PUT(request({ status: "done" }), context())).status).toBe(401);
    expect((await GET()).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects another origin before touching the account", async () => {
    signedIn();
    expect((await PUT(request({ status: "done" }, "https://lain.example"), context())).status).toBe(403);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("accepts a status only: XP, dates and unknown fields are refused", async () => {
    signedIn();
    for (const body of [{ status: "done", xp: 500 }, { status: "done", completed_on: "2020-01-01" }, { status: "selesai" }, {}, { xp: 10 }]) {
      expect((await PUT(request(body), context())).status).toBe(422);
    }
    expect((await PUT(request({ status: "done" }), context("../x"))).status).toBe(422);
    expect(rpc).not.toHaveBeenCalledWith("set_task_status", expect.anything());
  });

  it("passes only key, step and status to the database and answers with the server's summary", async () => {
    signedIn();
    tasks = [{ competition_key: "lomba-a", step_id: "s1", status: "done", due_on: "2026-11-25", completed_on: "2026-11-23" }];
    const response = await PUT(request({ status: "done" }), context());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("set_task_status", { p_competition_key: "lomba-a", p_step_id: "s1", p_status: "done" });
    const body = await response.json();
    expect(body).toMatchObject({ changed: true, today: "2026-11-23", summary: { xp: 30, level: 1, streak: 1 } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("maps database refusals to 404 and 409", async () => {
    signedIn();
    status = { error: "not_found" };
    expect((await PUT(request({ status: "done" }), context())).status).toBe(404);
    status = { error: "not_approved" };
    expect((await PUT(request({ status: "done" }), context())).status).toBe(409);
  });

  it("GET /progress ignores status a client stored in the roadmap", async () => {
    signedIn();
    const body = await (await GET()).json();
    expect(body.summary).toMatchObject({ xp: 0, streak: 0 });
    expect(body.competitions[0].roadmap.langkah[0]).toMatchObject({ selesai: false, status: "belum", selesaiPada: "" });
    expect(body.today).toBe("2026-11-23");
  });
});
