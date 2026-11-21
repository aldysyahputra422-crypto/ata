import { recordAuthEvent } from "@/lib/account/audit";
import { accountSession, accountUnavailable, checkOrigin, needsSignIn, privateHeaders } from "@/lib/account/http";

export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const { error } = await session.client.auth.signOut({ scope: "local" });
  if (error) return accountUnavailable();
  await recordAuthEvent(session.user.id, "logout");
  return new Response(null, { status: 204, headers: privateHeaders });
}
