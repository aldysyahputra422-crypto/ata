import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLAN_FEATURES, type Plan } from "@/lib/entitlements/config";

export const freePlan = { plan: "free", status: "free", sources: [], features: PLAN_FEATURES.free } as const;

/** Active-Slot limit of every plan, so the plan screen can compare them without hard-coding numbers. */
export const configSlotLimits = { free: PLAN_FEATURES.free.activeSlots.limit, pro: PLAN_FEATURES.pro.activeSlots.limit };

export async function slotLimits(client: SupabaseClient) {
  const rows = await client.from("plan_features").select("plan,limit").eq("feature", "activeSlots");
  if (rows.error) return null;
  const limit = (plan: Plan) => rows.data.find((row) => row.plan === plan)?.limit;
  const [free, pro] = [limit("free"), limit("pro")];
  return typeof free === "number" && typeof pro === "number" ? { free, pro } : null;
}

export async function currentPlan(client: SupabaseClient) {
  const entitlements = await client.from("entitlements").select("status,source,starts_at,ends_at")
    .order("ends_at", { ascending: false });
  if (entitlements.error) return null;

  const time = Date.now();
  const active = entitlements.data.filter((row) =>
    row.status === "active" && Date.parse(row.starts_at) <= time && time < Date.parse(row.ends_at)
  );
  const plan: Plan = active.length ? "pro" : "free";
  const rows = await client.from("plan_features").select("feature,enabled,limit,period,status,note").eq("plan", plan);
  if (rows.error) return null;

  const definitions = PLAN_FEATURES[plan];
  const features = Object.fromEntries(rows.data.flatMap((row) => {
    if (!Object.hasOwn(definitions, row.feature)) return [];
    const definition = definitions[row.feature as keyof typeof definitions];
    const setting = "enabled" in definition
      ? { enabled: row.enabled }
      : { limit: row.limit, ...(row.period ? { period: row.period } : {}), ...(row.note ? { note: row.note } : {}) };
    return [[row.feature, { status: row.status, ...setting }]];
  }));
  return {
    plan,
    status: active.length ? "active" : entitlements.data.length ? "expired" : "free",
    sources: [...new Set(active.map((row) => row.source))].sort(),
    ...(active.length ? { ends_at: active[0].ends_at } : {}),
    features,
  };
}
