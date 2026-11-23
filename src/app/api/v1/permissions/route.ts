import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { permissionInput, publicPermissions } from "@/lib/account/profile";

export const dynamic = "force-dynamic";

/** Data categories the account lets AI features read. Every category starts off (FR-AUTH-09). */
export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const { data, error } = await session.client.from("ai_permissions").select("categories,updated_at").maybeSingle();
  if (error) return accountUnavailable();
  return NextResponse.json(
    { categories: publicPermissions(data?.categories), updated_at: data?.updated_at ?? null },
    { headers: privateHeaders },
  );
}

/** Turns one category on or off. The body names one category, so two toggles in flight cannot overwrite each other. */
export async function PATCH(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const body = permissionInput.safeParse(await parseJsonBody(request, 1024));
  if (!body.success) return accountError(422, "validation", "Kategori izin tidak valid.");

  const result = await session.client.rpc("set_ai_permission", { p_category: body.data.category, p_allowed: body.data.allowed });
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; categories?: unknown; updated_at?: string } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error) return accountError(422, "validation", "Kategori izin tidak valid.");
  return NextResponse.json(
    { categories: publicPermissions(data.categories), updated_at: data.updated_at ?? null },
    { headers: privateHeaders },
  );
}
