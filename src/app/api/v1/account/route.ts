import { z } from "zod";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { createAdminClient } from "@/lib/supabase/admin";

const confirmation = z.strictObject({ confirm: z.literal("HAPUS") });

export async function DELETE(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  if (!confirmation.safeParse(await parseJsonBody(request, 1024)).success) {
    return accountError(422, "validation", "Ketik HAPUS untuk mengonfirmasi penghapusan akun.");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return accountUnavailable();

  const { error } = await createAdminClient().auth.admin.deleteUser(session.user.id);
  if (error) return accountUnavailable();
  // GoTrue already deleted the refresh sessions. Sign out also clears the browser cookies.
  await session.client.auth.signOut({ scope: "local" });
  return new Response(null, { status: 204, headers: privateHeaders });
}
