/**
 * Single source of plan limits (entitlements) for Ata. Blueprint: docs/blueprint/16-entitlement-dan-migrasi.md §1–2
 * in the prototype repository.
 *
 * Rules:
 * - Components never hard-code limits; they read `features` derived from this config (server-side, from the user's plan).
 * - The plan itself (free/pro) always comes from the server (entitlements table), never from the client.
 * - No feature grants AI or search usage paid by Ata. BYOK only: AI and search run on the user's own keys,
 *   or through prompts the user runs in external apps.
 * - `status: "proposed"` values are NOT final until the Product Owner approves the entitlement matrix (K-23).
 */

export const CONFIG_VERSION = 1;

export type Plan = "free" | "pro";
export type Status = "final" | "proposed";

/** `null` limit = unlimited. Booleans = feature on/off. */
export type Limit = { limit: number | null; period?: "month"; status: Status; note?: string };
export type Toggle = { enabled: boolean; status: Status };

export type PlanFeatures = {
  activeSlots: Limit;
  manualCompetitions: Limit;
  handoffPacks: Limit;
  fileValidations: Limit;
  savedPrompts: Limit;
  juryPacks: Limit;
  juryPersonas: Limit;
  juryHistoryVersions: Limit;
  portfolioItems: Limit;
  parentReports: Limit;
  analyticsWindowDays: Limit;
  fullPersonalContext: Toggle;
  adaptiveRoadmap: Toggle;
  multistepWorkflows: Toggle;
  panelJury: Toggle;
  redTeamJury: Toggle;
  officialRubrics: Toggle;
  multiConnectionWorkflows: Toggle;
  sourceMonitoring: Toggle;
  evaluationReportPdf: Toggle;
};

const p = (limit: number | null, status: Status = "proposed", extra: Partial<Limit> = {}): Limit => ({ limit, status, ...extra });
const on = (enabled: boolean, status: Status = "proposed"): Toggle => ({ enabled, status });

export const PLAN_FEATURES: Readonly<Record<Plan, PlanFeatures>> = Object.freeze({
  free: {
    // PO recommendation is 1 active Slot for Free; the prototype still runs 3 until the matrix is approved.
    activeSlots: p(3, "proposed", { note: "PO recommends 1; final after K-23 approval" }),
    manualCompetitions: p(10),
    handoffPacks: p(15, "proposed", { period: "month" }),
    fileValidations: p(3, "proposed", { period: "month" }),
    savedPrompts: p(10),
    juryPacks: p(5, "proposed", { period: "month" }),
    juryPersonas: p(1),
    juryHistoryVersions: p(3),
    portfolioItems: p(10),
    parentReports: p(1, "proposed", { period: "month" }),
    analyticsWindowDays: p(28),
    fullPersonalContext: on(false),
    adaptiveRoadmap: on(false),
    multistepWorkflows: on(false),
    panelJury: on(false),
    redTeamJury: on(false),
    officialRubrics: on(false),
    multiConnectionWorkflows: on(false),
    sourceMonitoring: on(false),
    evaluationReportPdf: on(false),
  },
  pro: {
    activeSlots: p(3, "final", { note: "K-03" }),
    manualCompetitions: p(null),
    handoffPacks: p(null),
    fileValidations: p(50, "proposed", { period: "month", note: "calibrate from real compute cost" }),
    savedPrompts: p(null),
    juryPacks: p(null),
    juryPersonas: p(null),
    juryHistoryVersions: p(null),
    portfolioItems: p(null),
    parentReports: p(null),
    analyticsWindowDays: p(null),
    fullPersonalContext: on(true),
    adaptiveRoadmap: on(true),
    multistepWorkflows: on(true),
    panelJury: on(true),
    redTeamJury: on(true),
    officialRubrics: on(true),
    multiConnectionWorkflows: on(true),
    sourceMonitoring: on(true),
    evaluationReportPdf: on(true),
  },
});

export const featuresFor = (plan: Plan): PlanFeatures => PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;

/** true when `used` more items would still be inside the plan's limit */
export function withinLimit(plan: Plan, feature: keyof PlanFeatures, used: number): boolean {
  const f = featuresFor(plan)[feature];
  if ("enabled" in f) return f.enabled;
  return f.limit === null || used < f.limit;
}
