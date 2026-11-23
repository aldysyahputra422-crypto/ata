import { NextResponse } from "next/server";
import { guardianConfirmInput, newToken, sha256 } from "@/lib/account/consent";
import { guardianRequest, invalidLink } from "@/lib/account/consent-guardian";
import { accountUnavailable, privateHeaders } from "@/lib/account/http";

export const dynamic = "force-dynamic";

/**
 * The guardian's answer to a request, given with the single-use link from their inbox (FR-AUTH-07).
 * On approval the response carries a withdrawal token once; only its hash is stored.
 */
export async function POST(request: Request) {
  const ready = await guardianRequest(request, guardianConfirmInput);
  if ("response" in ready) return ready.response;
  const { body, admin } = ready;

  const withdrawToken = body.approve ? newToken() : null;
  const result = await admin.rpc("confirm_guardian_consent", {
    p_token_hash: sha256(body.token),
    p_approve: body.approve,
    p_verifier_name: body.approve ? body.verifier_name : null,
    p_revoke_token_hash: withdrawToken ? sha256(withdrawToken) : null,
  });
  const data = result.data as { error?: string; status?: string } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "invalid_token") return invalidLink();
  if (data.error || (data.status !== "verified" && data.status !== "declined")) return accountUnavailable();
  return NextResponse.json(
    data.status === "verified" ? { status: "verified", withdraw_token: withdrawToken } : { status: "declined" },
    { headers: privateHeaders },
  );
}
