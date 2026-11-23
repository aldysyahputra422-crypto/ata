import { AI_CATEGORIES, type AiCategory } from "@/lib/account/profile";

// The consent gate Tanya Ata asks before it reads or sends account data of a category (FR-AUTH-07, FR-AUTH-09).
// The decision itself is `canProcessAi` in src/lib/account/ai-gate.ts (age, guardian consent and the category
// permission, decided in Postgres); Tanya Ata has no age rule of its own. The type is injected so tests can mock it.
export type GateReason = "signed_out" | "guardian_consent_required" | "permission_off";
export type GateDecision = { allowed: boolean; reason?: GateReason };
export type CanProcessAi = (userId: string | null, category: AiCategory) => Promise<GateDecision>;

export { AI_CATEGORIES, type AiCategory };
