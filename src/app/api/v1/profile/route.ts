import { NextResponse } from "next/server";
import { accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { profileInput, publicProfile, readProfile } from "@/lib/account/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const profile = await readProfile(session.client);
  if (!profile) return accountUnavailable();
  return NextResponse.json({ profile }, { headers: privateHeaders });
}

/** Saves the given profile fields of the account (FR-AUTH-04). Fields left out keep their value. */
export async function PATCH(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const body = profileInput.safeParse(await parseJsonBody(request, 8 * 1024));
  if (!body.success) {
    const field = body.error.issues[0]?.path[0];
    return NextResponse.json(
      { error: { code: "validation", message: "Data profil tidak valid.", ...(typeof field === "string" ? { field } : {}) } },
      { status: 422, headers: privateHeaders },
    );
  }

  const result = await session.client.rpc("update_profile", { p_patch: body.data });
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; field?: string; profile?: Record<string, unknown> } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "validation") {
    return NextResponse.json(
      { error: { code: "validation", message: "Data profil tidak valid.", ...(data.field ? { field: data.field } : {}) } },
      { status: 422, headers: privateHeaders },
    );
  }
  // FR-AUTH-07: a correction from under 18 to adult needs the guardian's confirmation; corrections are limited
  if (data.error === "guardian_verification_required" || data.error === "correction_limit") {
    const message = data.error === "correction_limit"
      ? "Batas koreksi tanggal lahir sudah habis. Hubungi tim Ata untuk memperbaikinya."
      : "Koreksi ini mengubah statusmu menjadi dewasa, jadi perlu dikonfirmasi orang tua/wali lewat email.";
    if (data.field === "timezone") {
      return NextResponse.json(
        { error: { code: data.error, message: "Zona waktu ini membuat usiamu terhitung 18 tahun lebih awal. Ganti zona waktu setelah ulang tahunmu.", field: "timezone" } },
        { status: 409, headers: privateHeaders },
      );
    }
    return NextResponse.json(
      { error: { code: data.error, message, field: "birth_date" } },
      { status: 409, headers: privateHeaders },
    );
  }
  if (data.error || !data.profile) return accountUnavailable();
  return NextResponse.json({ profile: publicProfile(data.profile) }, { headers: privateHeaders });
}
