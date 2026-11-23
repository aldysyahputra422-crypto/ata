import "server-only";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { AI_CATEGORIES, type AiCategory } from "./profile";

export type AiGateReason = "signed_out" | "guardian_consent_required" | "permission_off";
export type AiGateResult = { allowed: boolean; reason?: AiGateReason };

const REASONS: readonly string[] = ["signed_out", "guardian_consent_required", "permission_off"];

/**
 * The one check every AI feature makes before it reads account data of `category` (FR-AUTH-07, FR-AUTH-09).
 * The decision is taken by the database (`can_process_ai`, migration 0008) for the session of this request:
 * - `signed_out`: no active session, or the session belongs to another account than `userId`.
 * - `guardian_consent_required`: the account is under 18 (or its age is unknown) without verified guardian consent.
 * - `permission_off`: the account has not turned this category on.
 * Anything unexpected (unknown category, database error) is refused; `allowed` is true only on an explicit yes.
 */
export async function canProcessAi(userId: string, category: AiCategory): Promise<AiGateResult> {
  if (!userId || !hasSupabaseEnv()) return { allowed: false, reason: "signed_out" };
  if (!AI_CATEGORIES.includes(category)) return { allowed: false, reason: "permission_off" };

  try {
    const client = await createClient();
    const { data: auth, error } = await client.auth.getUser();
    if (error || !auth.user || auth.user.is_anonymous || auth.user.id !== userId) return { allowed: false, reason: "signed_out" };

    const gate = await client.rpc("can_process_ai", { p_category: category });
    const data = gate.data as { allowed?: unknown; reason?: unknown } | null;
    if (gate.error || !data) return { allowed: false };
    if (data.allowed === true) return { allowed: true };
    return typeof data.reason === "string" && REASONS.includes(data.reason)
      ? { allowed: false, reason: data.reason as AiGateReason }
      : { allowed: false };
  } catch {
    return { allowed: false };
  }
}
