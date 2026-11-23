import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, privateHeaders } from "@/lib/account/http";

/** The account cancels an open request or withdraws a verified consent; every AI category goes off (FR-AUTH-07). */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const result = await session.client.rpc("revoke_guardian_consent");
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; status?: string } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "not_found") return accountError(404, "not_found", "Tidak ada persetujuan wali yang aktif.");
  if (data.status !== "revoked") return accountUnavailable();
  return NextResponse.json({ status: "revoked" }, { headers: privateHeaders });
}
