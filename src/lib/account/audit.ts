import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function recordAuthEvent(userId: string, action: "login" | "logout") {
  try {
    await createAdminClient().from("audit_log").insert({ actor_id: userId, action, target_type: "session" });
  } catch {
    // A failed audit write must not undo an Auth response.
  }
}
