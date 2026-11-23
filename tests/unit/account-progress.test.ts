import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { activity, stripProgress, summarize, withProgress, type TaskRow } from "@/lib/account/progress";

const plan = { disetujui: true, langkah: [{ id: "s1", nama: "A", tanggal: "2026-11-20" }, { id: "s2", nama: "B", tanggal: "2026-11-25" }] };
const task = (step_id: string, status: TaskRow["status"], completed_on: string | null = null, due_on: string | null = null): TaskRow =>
  ({ competition_key: "lomba-a", step_id, status, completed_on, due_on });
const xp = (tasks: TaskRow[], today = "2026-11-23") => summarize([{ competition_key: "lomba-a", roadmap: plan }], tasks, today);

describe("account progress (FR-PRG-03)", () => {
  it("drops status fields a client wrote into a roadmap", () => {
    const dirty = { ...plan, langkah: plan.langkah.map((s) => ({ ...s, selesai: true, status: "selesai", selesaiPada: "2020-01-01" })) };
    expect(stripProgress(dirty)).toEqual(plan);
    expect(stripProgress(null)).toBeNull();
  });

  it("shows only the account's task rows as step status", () => {
    const dirty = { ...plan, langkah: plan.langkah.map((s) => ({ ...s, selesai: true, selesaiPada: "2020-01-01" })) };
    const shown = withProgress("lomba-a", dirty, [task("s2", "doing"), { ...task("s1", "done", "2026-11-22"), competition_key: "lomba-lain" }]);
    expect(shown?.langkah).toEqual([
      { ...plan.langkah[0], selesai: false, status: "belum", selesaiPada: "" },
      { ...plan.langkah[1], selesai: false, status: "dikerjakan", selesaiPada: "" },
    ]);
  });

  it("derives XP from task rows: 10 on time, 5 late, 20 for a finished roadmap; client fields count for nothing", () => {
    const dirty = { ...plan, langkah: plan.langkah.map((s) => ({ ...s, selesai: true, selesaiPada: "2026-11-01" })) };
    expect(summarize([{ competition_key: "lomba-a", roadmap: dirty }], [], "2026-11-23")).toMatchObject({ xp: 0, level: 1, streak: 0 });
    expect(xp([task("s1", "done", "2026-11-20", "2026-11-20")]).xp).toBe(10);
    expect(xp([task("s1", "done", "2026-11-22", "2026-11-20")]).xp).toBe(5);
    expect(xp([task("s1", "done", "2026-11-22", "2026-11-20"), task("s2", "done", "2026-11-23", "2026-11-25")]).xp).toBe(35);
    expect(xp([task("s1", "doing")]).xp).toBe(0);
  });

  it("judges a finished step against the due date it had when it was finished", () => {
    // due date moved earlier afterwards: the step stays on time
    expect(xp([task("s2", "done", "2026-11-24", "2026-11-25")]).xp).toBe(10);
  });

  it("counts the streak over consecutive completion days up to today or yesterday", () => {
    const days = [task("s1", "done", "2026-11-22"), task("s2", "done", "2026-11-23")];
    expect(xp(days, "2026-11-23").streak).toBe(2);
    expect(xp(days, "2026-11-24").streak).toBe(2);
    expect(xp(days, "2026-11-25").streak).toBe(0);
    expect(xp([task("s1", "done", "2026-11-21"), task("s2", "done", "2026-11-23")], "2026-11-23").streak).toBe(1);
  });

  it("activity counts finished steps per completion day, from the same rows as the streak", () => {
    const rows = [{ competition_key: "lomba-a", roadmap: plan }];
    const tasks = [task("s1", "done", "2026-11-22"), task("s2", "done", "2026-11-22"), task("s3", "doing")];
    expect(activity(rows, tasks)).toEqual({ "2026-11-22": 2 });
    expect(activity(rows, [])).toEqual({});
    // rows of a competition without a roadmap, or of another account's key, add nothing
    expect(activity(rows, [{ ...task("s1", "done", "2026-11-22"), competition_key: "lomba-lain" }])).toEqual({});
  });
});
