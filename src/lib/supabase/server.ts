import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseBaseUrl } from "./url";

/** Server client bound to the request cookies (FR-AUTH-04). Runs as the signed-in user, under RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Use a Route Handler when persisting a session.
        }
      },
    },
  });
}
