import { NextResponse } from "next/server";
import { guardianTokenInput, sha256 } from "@/lib/account/consent";
import { guardianRequest, invalidLink } from "@/lib/account/consent-guardian";
import { accountUnavailable, privateHeaders } from "@/lib/account/http";

export const dynamic = "force-dynamic";

/** The guardian withdraws a consent with the withdrawal link they kept; every AI category goes off. */
export async function POST(request: Request) {
  const ready = await guardianRequest(request, guardianTokenInput);
  if ("response" in ready) return ready.response;

  const result = await ready.admin.rpc("withdraw_guardian_consent", { p_revoke_token_hash: sha256(ready.body.token) });
  const data = result.data as { error?: string; status?: string } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error || data.status !== "revoked") return invalidLink();
  return NextResponse.json({ status: "revoked" }, { headers: privateHeaders });
}
