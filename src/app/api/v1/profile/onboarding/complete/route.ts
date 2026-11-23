import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, privateHeaders } from "@/lib/account/http";

/** Marks onboarding as done once name, jenjang and birth year are saved (FR-AUTH-04). Repeating it changes nothing. */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const result = await session.client.rpc("complete_onboarding");
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; done?: boolean } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "incomplete") return accountError(409, "incomplete", "Isi nama, jenjang, dan tahun lahir dulu.");
  if (data.error === "guardian_consent_required") {
    return accountError(403, "guardian_consent_required", "Persetujuan orang tua/wali belum terverifikasi.");
  }
  if (data.done !== true) return accountUnavailable();
  return NextResponse.json({ done: true }, { headers: privateHeaders });
}
