import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { competitionKey } from "@/lib/account/competitions";
import { readProgress, stepId, summarize, taskInput } from "@/lib/account/progress";

type Context = { params: Promise<{ key: string; step: string }> };

/**
 * Sets the status of one Peta Jalan step of the account (FR-PRG-03). The database stamps the completion time and day;
 * the body carries a status only. Repeating a request changes nothing, so XP is never granted twice.
 */
export async function PUT(request: Request, context: Context) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const params = await context.params;
  const key = competitionKey.safeParse(params.key);
  const step = stepId.safeParse(params.step);
  const body = taskInput.safeParse(await parseJsonBody(request, 1024));
  if (!key.success || !step.success || !body.success) return accountError(422, "validation", "Status tugas tidak valid.");

  const result = await session.client.rpc("set_task_status", {
    p_competition_key: key.data, p_step_id: step.data, p_status: body.data.status,
  });
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; changed?: boolean; task?: unknown } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "not_found") return accountError(404, "not_found", "Tugas tidak ditemukan di Slot aktif akunmu.");
  if (data.error === "not_approved") return accountError(409, "not_approved", "Setujui Peta Jalan dulu di tab Lomba.");
  if (data.error) return accountError(422, "validation", "Status tugas tidak valid.");

  const [rows, progress] = await Promise.all([
    session.client.from("user_competitions").select("competition_key,roadmap"),
    readProgress(session.client),
  ]);
  if (rows.error || !progress) return accountUnavailable();
  return NextResponse.json({
    task: data.task,
    changed: data.changed === true,
    today: progress.today,
    summary: summarize(rows.data, progress.tasks, progress.today),
  }, { headers: privateHeaders });
}
