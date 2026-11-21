import { NextResponse } from "next/server";
import { returnCookie, safeReturnPath } from "@/lib/account/google";
import { accountError, appOrigin, canSignInWithGoogle, privateHeaders } from "@/lib/account/http";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await canSignInWithGoogle()) {
    return accountError(503, "google_unavailable", "Login Google belum dikonfigurasi.");
  }

  const origin = appOrigin(request);
  const client = await createClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/api/v1/auth/google/callback", origin).href },
  });
  if (error || !data.url) return accountError(503, "google_unavailable", "Login Google belum tersedia.");

  const response = NextResponse.redirect(data.url, { status: 302, headers: privateHeaders });
  response.cookies.set(returnCookie, safeReturnPath(new URL(request.url).searchParams.get("return_to")), {
    httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 600,
  });
  return response;
}
