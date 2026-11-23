import { NextResponse } from "next/server";
import { GUARDIAN_CONSENT_VERSION, GUARDIAN_LINK_HOURS, consentRequestInput, guardianLink, mailbox, maskEmail, newToken, sha256 } from "@/lib/account/consent";
import { deliveryNotConfigured, guardianDelivery } from "@/lib/account/consent-delivery";
import { accountError, accountSession, accountUnavailable, appOrigin, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { readProfile } from "@/lib/account/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Opens a guardian consent request and sends the single-use link to the guardian (FR-AUTH-07).
 * The link goes only to the guardian's inbox: it is never returned to the account that asked for it.
 */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const body = consentRequestInput.safeParse(await parseJsonBody(request, 2 * 1024));
  if (!body.success) {
    const field = body.error.issues[0]?.path[0];
    return NextResponse.json(
      { error: { code: "validation", message: "Nama atau email wali tidak valid.", ...(typeof field === "string" ? { field } : {}) } },
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
  if (!delivery || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return deliveryNotConfigured();
  }

  const profile = await readProfile(session.client);
  if (!profile) return accountUnavailable();

  const token = newToken();
  const admin = createAdminClient();
  const created = await admin.rpc("create_guardian_consent_request", {
    p_user_id: session.user.id,
    p_guardian_name: body.data.guardian_name,
    p_contact_hash: sha256(body.data.guardian_email),
    p_contact_masked: maskEmail(body.data.guardian_email),
    p_token_hash: sha256(token),
    p_version: GUARDIAN_CONSENT_VERSION,
    p_ttl_hours: GUARDIAN_LINK_HOURS,
  });
  const data = created.data as { error?: string; id?: string; expires_at?: string } | null;
  if (created.error || !data) return accountUnavailable();
  if (data.error === "age_required") return accountError(409, "age_required", "Isi tahun lahir dulu.");
  if (data.error === "not_required") return accountError(409, "not_required", "Akun ini tidak memerlukan persetujuan wali.");
  if (data.error === "already_verified") return accountError(409, "already_verified", "Persetujuan wali sudah terverifikasi.");
  if (data.error === "rate_limited") return accountError(429, "rate_limited", "Terlalu banyak permintaan. Coba lagi besok.", 86_400);
  if (data.error === "guardian_mismatch") {
    return NextResponse.json(
      { error: { code: "guardian_mismatch", message: "Walimu meminta akun ini dihapus. Permintaan baru hanya bisa dikirim ke email wali yang sama.", field: "guardian_email" } },
      { status: 409, headers: privateHeaders },
    );
  }
  if (data.error === "validation") return accountError(422, "validation", "Nama atau email wali tidak valid.");
  if (data.error || !data.id || !data.expires_at) return accountUnavailable();

  const sent = await delivery.send({
    to: body.data.guardian_email,
    guardianName: body.data.guardian_name,
    studentName: profile.display_name ?? "Seorang siswa",
    link: guardianLink(appOrigin(request), "t", token),
    expiresAt: data.expires_at,
  });
  const recorded = await admin.rpc("record_guardian_consent_delivery", { p_id: data.id, p_sent: sent.sent, p_ref: sent.sent ? sent.ref : null });
  if (!sent.sent || recorded.error || (recorded.data as { error?: string } | null)?.error) {
    return accountError(502, "delivery_failed", "Email ke wali gagal dikirim. Periksa alamatnya lalu coba lagi.");
  }
  return NextResponse.json(
    { status: "pending", contact_masked: maskEmail(body.data.guardian_email), expires_at: data.expires_at },
    { status: 202, headers: privateHeaders },
  );
}
