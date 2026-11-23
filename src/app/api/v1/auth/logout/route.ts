import { recordAuthEvent } from "@/lib/account/audit";
import { accountSession, accountUnavailable, checkOrigin, needsSignIn, privateHeaders } from "@/lib/account/http";

export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  // FR-BYOK-02: the stored AI key goes with the login session. Deleted here explicitly; the session row's cascade is the backstop.
  await session.client.rpc("ai_credential_delete");
  const { error } = await session.client.auth.signOut({ scope: "local" });
  if (error) return accountUnavailable();
  await recordAuthEvent(session.user.id, "logout");
  return new Response(null, { status: 204, headers: privateHeaders });
}
