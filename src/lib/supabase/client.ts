import { createBrowserClient } from "@supabase/ssr";
import { supabaseBaseUrl } from "./url";

/** Browser client. Uses the anon key only; every table it touches is protected by RLS. */
export function createClient() {
  return createBrowserClient(supabaseBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
