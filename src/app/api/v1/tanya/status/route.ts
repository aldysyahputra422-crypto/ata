import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, privateHeaders } from "@/lib/account/http";
import { credentialsAvailable } from "@/lib/tanya/credentials";
import { publicProviders } from "@/lib/tanya/providers";
import { gateFor, gateSummary, readConnection } from "@/lib/tanya/server";

export const dynamic = "force-dynamic";

/** What the Tanya Ata screen needs before the first question: sign-in state, AI connection, and what each data category may be used for. */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  const providers = publicProviders();
  if (session.state === "signed_out") {
    return NextResponse.json({
      signed_in: false, byok_available: false, connection: null, providers,
      permissions: await gateSummary(gateFor(null), null),
    }, { headers: privateHeaders });
  }
  const [stored, permissions] = await Promise.all([readConnection(session.client), gateSummary(gateFor(session.client), session.user.id)]);
  if (!stored) return accountUnavailable();
  // An account that needs guardian consent cannot use a provider: a key left from before goes, and none can be added.
  const guardian = permissions.profil?.reason === "guardian_consent_required";
  if (guardian && stored.connection) await session.client.rpc("ai_credential_delete").then(() => {}, () => {});
  return NextResponse.json({
    signed_in: true, byok_available: credentialsAvailable() && !guardian, connection: guardian ? null : stored.connection, providers, permissions,
  }, { headers: privateHeaders });
}
