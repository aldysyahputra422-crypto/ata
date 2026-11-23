import { NextResponse } from "next/server";
import { publicConsent } from "@/lib/account/consent";
import { guardianDelivery } from "@/lib/account/consent-delivery";
import { accountSession, accountUnavailable, needsSignIn, privateHeaders } from "@/lib/account/http";

export const dynamic = "force-dynamic";

/** Whether this account needs guardian consent and where that consent stands (FR-AUTH-07). */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const result = await session.client.rpc("guardian_consent_status");
  if (result.error?.code === "42501") return needsSignIn();
  const consent = result.error ? null : publicConsent(result.data as Record<string, unknown> | null, guardianDelivery() !== null);
  if (!consent) return accountUnavailable();
  return NextResponse.json({ consent }, { headers: privateHeaders });
}
