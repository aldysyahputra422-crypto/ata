import { NextResponse } from "next/server";
import { guardianTokenInput, sha256 } from "@/lib/account/consent";
import { guardianRequest, invalidLink } from "@/lib/account/consent-guardian";
import { accountUnavailable, privateHeaders } from "@/lib/account/http";
import { AI_CATEGORIES } from "@/lib/account/profile";

export const dynamic = "force-dynamic";

/** What the guardian's link is for: confirming an open request, or withdrawing a consent already given. */
export async function POST(request: Request) {
  const ready = await guardianRequest(request, guardianTokenInput);
  if ("response" in ready) return ready.response;

  const result = await ready.admin.rpc("guardian_consent_lookup", { p_token_hash: sha256(ready.body.token) });
  const data = result.data as Record<string, unknown> | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error || (data.kind !== "confirm" && data.kind !== "withdraw")) return invalidLink();
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return NextResponse.json(
    {
      kind: data.kind,
      student_name: text(data.student_name),
      guardian_name: text(data.guardian_name),
      version: text(data.version),
      scope: Array.isArray(data.scope) ? AI_CATEGORIES.filter((c) => (data.scope as unknown[]).includes(c)) : [],
      expires_at: text(data.expires_at),
      verified_at: text(data.verified_at),
    },
    { headers: privateHeaders },
  );
}
