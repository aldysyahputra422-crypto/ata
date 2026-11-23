import { NextResponse } from "next/server";
import { GUARDIAN_LINK_HOURS, correctionRequestInput, guardianLink, mailbox, maskEmail, newToken, sha256 } from "@/lib/account/consent";
import { deliveryNotConfigured, guardianDelivery } from "@/lib/account/consent-delivery";
import { accountError, accountSession, accountUnavailable, appOrigin, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { readProfile } from "@/lib/account/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Asks for a birth date correction that would make an account under 18 an adult (FR-AUTH-07). The account
 * cannot make that change itself: the date changes only when the parent/guardian confirms it from the
 * single-use link sent to their inbox. Other corrections go through PATCH /api/v1/profile.
 */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const body = correctionRequestInput.safeParse(await parseJsonBody(request, 2 * 1024));
  if (!body.success) {
    const field = body.error.issues[0]?.path[0];
    return NextResponse.json(
      { error: { code: "validation", message: "Tanggal lahir, nama, atau email wali tidak valid.", ...(typeof field === "string" ? { field } : {}) } },
      { status: 422, headers: privateHeaders },
    );
  }
  if (session.user.email && mailbox(body.data.guardian_email) === mailbox(session.user.email)) {
    return NextResponse.json(
      { error: { code: "validation", message: "Email wali tidak boleh sama dengan email akunmu.", field: "guardian_email" } },
      { status: 422, headers: privateHeaders },
    );
  }

  const delivery = guardianDelivery();
  if (!delivery || !process.env.SUPABASE_SERVICE_ROLE_KEY) return deliveryNotConfigured();

  const profile = await readProfile(session.client);
  if (!profile) return accountUnavailable();

  const token = newToken();
  const admin = createAdminClient();
  const created = await admin.rpc("create_birth_date_correction", {
    p_user_id: session.user.id,
    p_birth_date: body.data.birth_date,
    p_guardian_name: body.data.guardian_name,
    p_contact_hash: sha256(body.data.guardian_email),
    p_contact_masked: maskEmail(body.data.guardian_email),
    p_token_hash: sha256(token),
    p_ttl_hours: GUARDIAN_LINK_HOURS,
  });
  const data = created.data as { error?: string; id?: string; expires_at?: string } | null;
  if (created.error || !data) return accountUnavailable();
  if (data.error === "not_required") return accountError(409, "not_required", "Koreksi ini tidak memerlukan konfirmasi wali. Ubah tanggal lahir langsung di profil.");
  if (data.error === "correction_limit") return accountError(409, "correction_limit", "Batas koreksi tanggal lahir sudah habis. Hubungi tim Ata untuk memperbaikinya.");
  if (data.error === "guardian_mismatch") {
    return NextResponse.json(
      { error: { code: "guardian_mismatch", message: "Konfirmasi hanya bisa dikirim ke email wali yang sudah tercatat di akunmu.", field: "guardian_email" } },
      { status: 409, headers: privateHeaders },
    );
  }
  if (data.error === "rate_limited") return accountError(429, "rate_limited", "Terlalu banyak permintaan. Coba lagi besok.", 86_400);
  if (data.error === "validation") return accountError(422, "validation", "Tanggal lahir, nama, atau email wali tidak valid.");
  if (data.error || !data.id || !data.expires_at) return accountUnavailable();

  const sent = await delivery.send({
    to: body.data.guardian_email,
    guardianName: body.data.guardian_name,
    studentName: profile.display_name ?? "Seorang siswa",
    link: guardianLink(appOrigin(request), "t", token),
    expiresAt: data.expires_at,
    correctedBirthDate: body.data.birth_date,
  });
  const recorded = await admin.rpc("record_birth_date_correction_delivery", { p_id: data.id, p_sent: sent.sent, p_ref: sent.sent ? sent.ref : null });
  if (!sent.sent || recorded.error || (recorded.data as { error?: string } | null)?.error) {
    return accountError(502, "delivery_failed", "Email ke wali gagal dikirim. Periksa alamatnya lalu coba lagi.");
  }
  return NextResponse.json(
    { status: "pending", birth_date: body.data.birth_date, contact_masked: maskEmail(body.data.guardian_email), expires_at: data.expires_at },
    { status: 202, headers: privateHeaders },
  );
}

/** The account withdraws its open correction request; the link in the guardian's inbox stops working. */
export async function DELETE(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const result = await session.client.rpc("cancel_birth_date_correction");
  if (result.error?.code === "42501") return needsSignIn();
  const data = result.data as { error?: string; status?: string } | null;
  if (result.error || !data) return accountUnavailable();
  if (data.error === "not_found") return accountError(404, "not_found", "Tidak ada permintaan koreksi yang terbuka.");
  if (data.status !== "cancelled") return accountUnavailable();
  return NextResponse.json({ status: "cancelled" }, { headers: privateHeaders });
}
