import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CATEGORIES, type AiCategory } from "@/lib/account/profile";

// Integration contract with the guardian-consent workstream (FR-AUTH-07). Tanya Ata asks this before it reads or
// sends account data of a category. The signature matches `canProcessAi` in src/lib/account/ai-gate.ts, which is
// owned by that workstream: swapping it in is a one-line change in server.ts.
export type GateReason = "signed_out" | "guardian_consent_required" | "permission_off";
export type GateDecision = { allowed: boolean; reason?: GateReason };
export type CanProcessAi = (userId: string | null, category: AiCategory) => Promise<GateDecision>;

export { AI_CATEGORIES, type AiCategory };

const ADULT_AGE = 18;

/** True unless the birth year proves the account holder is an adult. A missing year counts as a minor. */
export function mayBeMinor(birthYear: unknown, now: Date = new Date()): boolean {
  if (typeof birthYear !== "number" || !Number.isInteger(birthYear)) return true;
  // Only the year is stored: someone who turns 18 this year may still be 17.
  return now.getUTCFullYear() - birthYear <= ADULT_AGE;
}

/**
 * Default gate until the guardian-consent module is integrated. It fails closed: no account, a read error,
 * a possible minor, or a category that is not switched on all mean "do not process".
 */
export function defaultGate(client: SupabaseClient | null, now: () => Date = () => new Date()): CanProcessAi {
  let loaded: Promise<{ minor: boolean; categories: Record<string, unknown> } | null> | undefined;
  const load = async () => {
    if (!client) return null;
    try {
      const [profile, permissions] = await Promise.all([
        client.from("profiles").select("birth_year").maybeSingle(),
        client.from("ai_permissions").select("categories").maybeSingle(),
      ]);
      if (profile.error || permissions.error) return null;
      return {
        minor: mayBeMinor((profile.data as { birth_year?: unknown } | null)?.birth_year, now()),
        categories: ((permissions.data as { categories?: unknown } | null)?.categories ?? {}) as Record<string, unknown>,
      };
    } catch {
      return null;
    }
  };

  return async (userId, category) => {
    if (!userId || !client) return { allowed: false, reason: "signed_out" };
    if (!(AI_CATEGORIES as readonly string[]).includes(category)) return { allowed: false, reason: "permission_off" };
    const state = await (loaded ??= load());
    if (!state) return { allowed: false, reason: "permission_off" };
    if (state.minor) return { allowed: false, reason: "guardian_consent_required" };
    return state.categories[category] === true ? { allowed: true } : { allowed: false, reason: "permission_off" };
  };
}
