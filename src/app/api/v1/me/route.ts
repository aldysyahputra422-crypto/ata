import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, canSignInWithGoogle, privateHeaders } from "@/lib/account/http";
import { configSlotLimits, currentPlan, freePlan, slotLimits } from "@/lib/account/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const [session, google] = await Promise.all([accountSession(), canSignInWithGoogle()]);
  if (session.state === "unavailable") return accountUnavailable();

  const account = { config: { google, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
  if (session.state === "signed_out") {
    return NextResponse.json({ ...account, signed_in: false, plan: freePlan, slot_limits: configSlotLimits }, { headers: privateHeaders });
  }

  const { user, client } = session;
  const [plan, slot_limits] = await Promise.all([currentPlan(client), slotLimits(client)]);
  if (!plan || !slot_limits) return accountUnavailable();
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return NextResponse.json({
    ...account,
    signed_in: true,
    user: {
      id: user.id,
      email: user.email ?? null,
      display_name: typeof name === "string" ? name : null,
      role: ["admin", "mentor", "support"].includes(user.app_metadata?.role) ? user.app_metadata.role : "user",
    },
    plan,
    slot_limits,
  }, { headers: privateHeaders });
}
