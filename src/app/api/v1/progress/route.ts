import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, needsSignIn, privateHeaders } from "@/lib/account/http";
import { withDeadline } from "@/lib/account/competitions";
import { currentPlan } from "@/lib/account/plan";
import { activity, readProgress, summarize, withProgress } from "@/lib/account/progress";

export const dynamic = "force-dynamic";

/** What Hari Ini and Progres show for an account: its competitions with a roadmap, each step's status, XP/level/streak and finished steps per day (FR-PRG-03). */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const [rows, progress, plan] = await Promise.all([
    session.client.from("user_competitions").select("competition_key,source,state,card,roadmap").order("created_at"),
    readProgress(session.client),
    currentPlan(session.client),
  ]);
  const limit = plan?.features.activeSlots.limit;
  if (rows.error || !progress || !plan || typeof limit !== "number") return accountUnavailable();

  const competitions = rows.data.filter((row) => row.state === "slot" || row.roadmap);
  return NextResponse.json({
    today: progress.today,
    timezone: progress.timezone,
    plan: plan.plan,
    slot_limit: limit,
    competitions: competitions.map((row) => withDeadline({ ...row, roadmap: withProgress(row.competition_key, row.roadmap, progress.tasks) }, progress.today)),
    summary: summarize(competitions, progress.tasks, progress.today),
    activity: activity(competitions, progress.tasks),
  }, { headers: privateHeaders });
}
