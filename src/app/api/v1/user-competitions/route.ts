import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, needsSignIn, privateHeaders } from "@/lib/account/http";
import { competitionColumns } from "@/lib/account/competitions";
import { currentPlan } from "@/lib/account/plan";

export const dynamic = "force-dynamic";

/** The account's saved, skipped, released and active-Slot competitions, with the Slot limit of its current plan. */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const [rows, plan] = await Promise.all([
    session.client.from("user_competitions").select(competitionColumns).order("created_at"),
    currentPlan(session.client),
  ]);
  const limit = plan?.features.activeSlots.limit;
  if (rows.error || !plan || typeof limit !== "number") return accountUnavailable();
  return NextResponse.json({ items: rows.data, plan: plan.plan, slot_limit: limit }, { headers: privateHeaders });
}
