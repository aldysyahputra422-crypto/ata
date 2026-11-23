import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, needsSignIn, privateHeaders } from "@/lib/account/http";
import { competitionColumns, withDeadline } from "@/lib/account/competitions";
import { currentPlan } from "@/lib/account/plan";
import { readProgress, withProgress } from "@/lib/account/progress";

export const dynamic = "force-dynamic";

/** The account's saved, skipped, released and active-Slot competitions, with the Slot limit of its current plan. */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const [rows, plan, progress] = await Promise.all([
    session.client.from("user_competitions").select(competitionColumns).order("created_at"),
    currentPlan(session.client),
    readProgress(session.client),
  ]);
  const limit = plan?.features.activeSlots.limit;
  if (rows.error || !plan || !progress || typeof limit !== "number") return accountUnavailable();
  // step status comes from task_progress, never from what a client wrote into the roadmap document
  // deadline_on/days_left are derived from the stored deadline date on the account's day, never from a saved offset
  const items = rows.data.map((row) => withDeadline({ ...row, roadmap: withProgress(row.competition_key, row.roadmap, progress.tasks) }, progress.today));
  return NextResponse.json({ items, plan: plan.plan, slot_limit: limit, today: progress.today, timezone: progress.timezone }, { headers: privateHeaders });
}
