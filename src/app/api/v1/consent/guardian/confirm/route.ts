import { NextResponse } from "next/server";
import { guardianConfirmInput, newToken, sha256 } from "@/lib/account/consent";
import { guardianRequest, invalidLink } from "@/lib/account/consent-guardian";
import { accountUnavailable, privateHeaders } from "@/lib/account/http";

export const dynamic = "force-dynamic";

/**
 * The guardian's answer to a consent request or a birth date correction, given with the single-use link from
 * their inbox (FR-AUTH-07). The link proves access to that inbox; who answered is their own statement.
 * On approval the response carries a withdrawal token once; only its hash is stored.
 */
export async function POST(request: Request) {
  const ready = await guardianRequest(request, guardianConfirmInput);
  if ("response" in ready) return ready.response;
  const { body, admin } = ready;

  // The stored row, not the request, says what this link answers.
  const looked = await admin.rpc("guardian_consent_lookup", { p_token_hash: sha256(body.token) });
  const kind = (looked.data as { kind?: string } | null)?.kind;
  if (looked.error || !looked.data) return accountUnavailable();
  if (kind === "correction") {
    const result = await admin.rpc("confirm_birth_date_correction", {
      p_token_hash: sha256(body.token),
      p_approve: body.approve,
      p_verifier_name: body.approve ? body.verifier_name : null,
    });
    const data = result.data as { error?: string; status?: string } | null;
    if (result.error || !data) return accountUnavailable();
    if (data.error === "invalid_token") return invalidLink();
    if (data.error || (data.status !== "applied" && data.status !== "declined")) return accountUnavailable();
    return NextResponse.json({ status: data.status === "applied" ? "corrected" : "declined" }, { headers: privateHeaders });
  }
  if (kind !== "confirm") return invalidLink();

  const withdrawToken = body.approve ? newToken() : null;
  const result = await admin.rpc("confirm_guardian_consent", {
    p_token_hash: sha256(body.token),
    p_approve: body.approve,
    p_verifier_name: body.approve ? body.verifier_name : null,
    p_revoke_token_hash: withdrawToken ? sha256(withdrawToken) : null,
    p_request_deletion: !body.approve && body.request_deletion === true,
  });
  const data = result.data as { error?: string; status?: string; deletion_requested?: boolean } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "invalid_token") return invalidLink();
  if (data.error || (data.status !== "verified" && data.status !== "declined")) return accountUnavailable();
  return NextResponse.json(
    data.status === "verified"
      ? { status: "verified", withdraw_token: withdrawToken }
      : { status: "declined", deletion_requested: data.deletion_requested === true },
    { headers: privateHeaders },
  );
}
