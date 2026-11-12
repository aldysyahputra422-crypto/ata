import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Liveness check that touches the database once (PRD Lampiran D.3): a daily GitHub Actions
 * ping keeps the free Supabase project from pausing. Returns no data, only { ok }.
 */
export async function GET() {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("system_flags").select("key").limit(1);
    if (error) return NextResponse.json({ ok: false, reason: "db_error" }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "db_unreachable" }, { status: 503 });
  }
}
