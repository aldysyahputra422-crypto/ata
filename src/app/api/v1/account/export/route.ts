import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, needsSignIn, privateHeaders } from "@/lib/account/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const { data, error } = await session.client.rpc("export_account_data");
  if (error?.code === "42501") return needsSignIn();
  if (error || !data) return accountUnavailable();
  if (data.error === "rate_limited") return accountError(429, "rate_limited", "Batas ekspor tercapai. Coba lagi nanti.", 3600);

  const { user } = session;
  return NextResponse.json({
    ...data,
    user: { id: user.id, email: user.email ?? null, created_at: user.created_at },
  }, {
    headers: { ...privateHeaders, "Content-Disposition": 'attachment; filename="ata-data-akun.json"' },
  });
}
