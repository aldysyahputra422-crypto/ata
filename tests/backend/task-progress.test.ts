import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const migrations = new URL("../../supabase/migrations/", import.meta.url);
const db = new PGlite();
const a = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const sessions: Record<string, string> = { [a]: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001", [b]: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002" };
const roadmap = (approved = true) => JSON.stringify({
  disetujui: approved,
  langkah: [{ id: "s1", nama: "Baca panduan", tanggal: "2020-01-01" }, { id: "s2", nama: "Kerangka", tanggal: "2999-01-01" }],
});

async function as(userId: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessions[userId] })]);
  await db.exec("set role authenticated");
}
const admin = () => db.exec("reset role");
type Result = { error?: string; changed?: boolean; today?: string; timezone?: string; task?: { status: string; completed_at: string | null; completed_on: string | null; due_on: string | null } };
const set = async (key: string, step: string, status: string) =>
  (await db.query<{ r: Result }>("select public.set_task_status($1, $2, $3) as r", [key, step, status])).rows[0].r;
const rows = async () => {
  await admin();
  return (await db.query<{ user_id: string; step_id: string; status: string; completed_on: string | null }>(
    "select user_id, step_id, status, completed_on::text from public.task_progress order by user_id, step_id")).rows;
};
const slot = (key: string, state = "slot", plan = roadmap()) =>
  db.query("insert into public.user_competitions (competition_key, state, roadmap) values ($1, $2, $3)", [key, state, plan]);

describe("0006 task_progress (FR-PRG-03)", () => {
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
    await db.exec("delete from public.user_competitions; update public.profiles set timezone = null");
    await as(a);
    await slot("lomba-a");
  });

  afterAll(async () => { await db.close(); });

  it("has RLS on; clients can read their own rows and write none", async () => {
    await admin();
    const { rows: meta } = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid = 'public.task_progress'::regclass");
    expect(meta[0].relrowsecurity).toBe(true);
    await as(a);
    await set("lomba-a", "s1", "done");
    expect((await db.query("select 1 from public.task_progress")).rows).toHaveLength(1);
    await expect(db.query("insert into public.task_progress (user_id, competition_key, step_id, status) values ($1, 'lomba-a', 's2', 'todo')", [a])).rejects.toThrow(/permission denied/);
    await expect(db.query("update public.task_progress set completed_on = '2020-01-01'")).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.task_progress")).rejects.toThrow(/permission denied/);
    await admin();
    await db.exec("set role anon");
    await expect(db.query("select 1 from public.task_progress")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.set_task_status('lomba-a', 's1', 'done')")).rejects.toThrow(/permission denied/);
  });

  it("isolates accounts: another account cannot read or change a task, even with the same competition key", async () => {
    await set("lomba-a", "s1", "done");
    await as(b);
    expect((await db.query("select 1 from public.task_progress")).rows).toHaveLength(0);
    expect((await set("lomba-a", "s1", "todo")).error).toBe("not_found");
    await slot("lomba-a");
    expect((await set("lomba-a", "s1", "doing")).task?.status).toBe("doing");
    expect((await rows()).map((r) => [r.user_id, r.status])).toEqual([[a, "done"], [b, "doing"]]);
  });

  it("accepts only steps of an approved roadmap in an active Slot of the account", async () => {
    expect((await set("lomba-a", "tidak-ada", "done")).error).toBe("not_found");
    expect((await set("lomba-lain", "s1", "done")).error).toBe("not_found");
    expect((await set("lomba-a", "s1", "selesai")).error).toBe("validation");
    await slot("usulan", "saved", roadmap(false));
    expect((await set("usulan", "s1", "done")).error).toBe("not_found");
    await db.query("update public.user_competitions set state = 'released' where competition_key = 'lomba-a'");
    expect((await set("lomba-a", "s1", "done")).error).toBe("not_found");
    await db.query("update public.user_competitions set state = 'slot', roadmap = $1 where competition_key = 'lomba-a'", [roadmap(false)]);
    expect((await set("lomba-a", "s1", "done")).error).toBe("not_approved");
    expect(await rows()).toEqual([]);
  });

  it("is idempotent: the same status again changes nothing and keeps the first completion", async () => {
    const first = await set("lomba-a", "s1", "done");
    expect(first.changed).toBe(true);
    expect(first.task?.due_on).toBe("2020-01-01");
    const again = await set("lomba-a", "s1", "done");
    expect(again.changed).toBe(false);
    expect(again.task?.completed_at).toBe(first.task?.completed_at);
    expect((await set("lomba-a", "s2", "todo")).changed).toBe(false);
    expect(await rows()).toHaveLength(1);
  });

  it("reversal clears the completion; completing again stamps a new one", async () => {
    await set("lomba-a", "s1", "done");
    const undone = await set("lomba-a", "s1", "doing");
    expect(undone.changed).toBe(true);
    expect(undone.task).toMatchObject({ status: "doing", completed_at: null, completed_on: null, due_on: null });
    expect((await set("lomba-a", "s1", "doing")).changed).toBe(false);
    const redone = await set("lomba-a", "s1", "done");
    expect(redone.task?.status).toBe("done");
    expect(await rows()).toHaveLength(1);
  });

  it("stamps the completion day in the account's timezone, never a client value", async () => {
    await admin();
    await db.query("update public.profiles set timezone = 'Pacific/Kiritimati' where user_id = $1", [a]);
    await db.query("update public.profiles set timezone = 'Pacific/Pago_Pago' where user_id = $1", [b]);
    await as(a);
    const east = await set("lomba-a", "s1", "done");
    await as(b);
    await slot("lomba-a");
    const west = await set("lomba-a", "s1", "done");
    expect(east.timezone).toBe("Pacific/Kiritimati");
    // UTC+14 and UTC-11 are never on the same calendar day
    expect(Date.parse(east.task!.completed_on!) - Date.parse(west.task!.completed_on!)).toBe(864e5);
    expect((await db.query<{ r: { today: string } }>("select public.progress_today() as r")).rows[0].r.today).toBe(west.today);
  });

  it("falls back to Asia/Jakarta for an empty or unknown timezone", async () => {
    expect((await set("lomba-a", "s1", "done")).timezone).toBe("Asia/Jakarta");
    await admin();
    await db.query("update public.profiles set timezone = 'Bukan/Zona' where user_id = $1", [a]);
    await as(a);
    expect((await set("lomba-a", "s2", "done")).timezone).toBe("Asia/Jakarta");
  });

  it("is exported with the account and removed with the competition row and the account", async () => {
    await set("lomba-a", "s1", "done");
    const exported = (await db.query<{ r: { task_progress: { step_id: string }[] } }>("select public.export_account_data() as r")).rows[0].r;
    expect(exported.task_progress.map((t) => t.step_id)).toEqual(["s1"]);
    await as(b);
    expect((await db.query<{ r: { task_progress: unknown[] } }>("select public.export_account_data() as r")).rows[0].r.task_progress).toEqual([]);
    await as(a);
    await db.query("delete from public.user_competitions where competition_key = 'lomba-a'");
    expect(await rows()).toEqual([]);
  });
});
