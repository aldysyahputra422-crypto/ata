import { cookies } from "next/headers";
import { z } from "zod";
import { recordAuthEvent } from "@/lib/account/audit";
import { oauthResult, returnCookie, safeReturnPath } from "@/lib/account/google";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const callbackQuery = z.object({ code: z.string().min(1).max(1024), error: z.never().optional() });

export async function GET(request: Request) {
  const query = callbackQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success || !hasSupabaseEnv()) return oauthResult(request, "/?galat=oauth");
  const { code } = query.data;

  const cookieStore = await cookies();
  const returnTo = cookieStore.get(returnCookie)?.value ?? null;
  const client = await createClient();
  // Supabase verifies the OAuth response and exchanges the code using the PKCE verifier cookie.
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user || !data.session) return oauthResult(request, "/?galat=oauth");

  await recordAuthEvent(data.user.id, "login");
  return oauthResult(request, safeReturnPath(returnTo));
}
