import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { aktivitasHarian, hitungXP } from "@/lib/prototype/shared/logic/xp.js";

// Task status per account (migration 0006). XP, level and streak are derived here from task_progress rows only:
// progress fields a client put into a roadmap document are dropped on write and replaced on read.
export const taskStatus = z.enum(["todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof taskStatus>;
export const stepId = z.string().min(1).max(80);
export const taskInput = z.strictObject({ status: taskStatus });
export const taskColumns = "competition_key,step_id,status,due_on,completed_on";
export type TaskRow = { competition_key: string; step_id: string; status: TaskStatus; due_on: string | null; completed_on: string | null };

const LOCAL = { todo: "belum", doing: "dikerjakan", done: "selesai" } as const;
type Roadmap = Record<string, unknown> | null;
type Step = Record<string, unknown>;
/** A step as planned: without the status fields. */
function planned(step: Step): Step {
  const plan = { ...step };
  delete plan.selesai;
  delete plan.status;
  delete plan.selesaiPada;
  return plan;
}
const steps = (roadmap: Roadmap): Step[] | null =>
  Array.isArray(roadmap?.langkah) ? (roadmap.langkah as unknown[]).filter((s): s is Step => !!s && typeof s === "object") : null;

/** The roadmap without the progress fields a client may have written into it. */
export function stripProgress<T extends Roadmap | undefined>(roadmap: T): T {
  const list = roadmap ? steps(roadmap) : null;
  if (!roadmap || !list) return roadmap;
  return { ...roadmap, langkah: list.map(planned) } as T;
}

/** The roadmap as screens read it: every step carries the account's status from task_progress. */
export function withProgress(key: string, roadmap: Roadmap, tasks: TaskRow[]): Roadmap {
  const list = steps(roadmap);
  if (!roadmap || !list) return roadmap;
  const own = new Map(tasks.filter((t) => t.competition_key === key).map((t) => [t.step_id, t]));
  return {
    ...roadmap,
    langkah: list.map((step) => {
      const plan = planned(step);
      const task = own.get(String(plan.id));
      const status = task?.status ?? "todo";
      return { ...plan, selesai: status === "done", status: LOCAL[status], selesaiPada: task?.completed_on ?? "" };
    }),
  };
}

export type Summary = {
  xp: number; level: number; xpLevel: number; keLevelBerikut: number; streak: number; selesai: number; tepat: number; tuntas: number;
  pencapaian: { id: string; nama: string; syarat: string; dapat: boolean }[];
};
type Rows = { competition_key: string; roadmap: Roadmap }[];
/** Every roadmap's steps with the account's completion state: the one input of XP, streak and the activity calendar. */
function finished(competitions: Rows, tasks: TaskRow[]): Record<string, { langkah: Step[] }> {
  const peta: Record<string, { langkah: Step[] }> = {};
  for (const c of competitions) {
    const list = steps(c.roadmap);
    if (!list?.length) continue;
    const own = new Map(tasks.filter((t) => t.competition_key === c.competition_key).map((t) => [t.step_id, t]));
    peta[c.competition_key] = {
      langkah: list.map((plan) => {
        const task = own.get(String(plan.id));
        const done = task?.status === "done";
        return { selesai: done, tanggal: (done ? task.due_on : null) ?? plan.tanggal, selesaiPada: done ? task.completed_on : "" };
      }),
    };
  }
  return peta;
}

/** XP, level and streak with the rules of shared/logic/xp.js. A finished step is judged against the due date it had when it was finished. */
export function summarize(competitions: Rows, tasks: TaskRow[], today: string): Summary {
  return hitungXP(finished(competitions, tasks), today) as Summary;
}

/** Steps finished per account day (YYYY-MM-DD), from the same rows the streak is counted from. */
export function activity(competitions: Rows, tasks: TaskRow[]): Record<string, number> {
  return aktivitasHarian(finished(competitions, tasks)) as Record<string, number>;
}

export async function readProgress(client: SupabaseClient) {
  const [tasks, day] = await Promise.all([client.from("task_progress").select(taskColumns), client.rpc("progress_today")]);
  const today = (day.data as { today?: unknown; timezone?: unknown } | null) ?? {};
  if (tasks.error || day.error || typeof today.today !== "string" || typeof today.timezone !== "string") return null;
  return { tasks: tasks.data as TaskRow[], today: today.today, timezone: today.timezone };
}
