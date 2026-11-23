import "server-only";
import { accountError } from "./http";

export type GuardianMessage = {
  to: string; guardianName: string; studentName: string; link: string; expiresAt: string;
  /** set for a birth date correction: the date the guardian is asked to confirm, YYYY-MM-DD */
  correctedBirthDate?: string;
};
export type DeliveryResult = { sent: true; ref: string | null } | { sent: false };

/** Sends the confirmation link to the guardian's own inbox. A link that was not sent can never verify a consent. */
export type GuardianDelivery = { channel: "email"; send(message: GuardianMessage): Promise<DeliveryResult> };

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Resend's HTTP API (free tier), used only when both variables are set. */
function resendDelivery(apiKey: string, from: string): GuardianDelivery {
  return {
    channel: "email",
    async send({ to, guardianName, studentName, link, expiresAt, correctedBirthDate }) {
      const until = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(expiresAt));
      const text = [
        `Halo ${guardianName},`,
        correctedBirthDate
          ? `${studentName} memakai Ata dan mencantumkan Anda sebagai orang tua/wali. Ia meminta tanggal lahir di akunnya dikoreksi menjadi ${correctedBirthDate}. Koreksi ini membuat akunnya berstatus dewasa, jadi Ata hanya mengubahnya bila Anda mengonfirmasi.`
          : `${studentName} mendaftar di Ata dan mencantumkan Anda sebagai orang tua/wali. Karena usianya di bawah 18 tahun, Ata memerlukan persetujuan Anda sebelum fitur AI boleh memproses datanya.`,
        `Baca dan putuskan di tautan ini (berlaku sampai ${until} WIB, sekali pakai):`,
        link,
        correctedBirthDate
          ? "Jika Anda tidak mengenal nama tersebut atau tanggalnya salah, abaikan email ini atau tolak di tautan itu. Tidak ada yang berubah tanpa konfirmasi Anda."
          : "Jika Anda tidak mengenal nama tersebut, abaikan email ini. Tanpa persetujuan Anda, tidak ada data yang diproses AI.",
      ].join("\n\n");
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [to], subject: correctedBirthDate ? "Konfirmasi koreksi tanggal lahir di Ata" : "Persetujuan orang tua/wali untuk Ata", text,
            html: text.split("\n\n").map((p) => `<p>${escapeHtml(p)}</p>`).join(""),
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) return { sent: false };
        const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
        return { sent: true, ref: typeof body?.id === "string" ? `resend:${body.id}` : null };
      } catch {
        return { sent: false };
      }
    },
  };
}

/** What every route answers while no provider is configured: nothing is opened, nothing counts as sent. */
export const deliveryNotConfigured = () =>
  accountError(503, "delivery_not_configured", "Pengiriman email ke orang tua/wali belum dikonfigurasi di lingkungan ini, jadi permintaan belum bisa dikirim.");

/**
 * The configured channel, or null when it is not configured (no API key or no sender address).
 * With null no request is opened and minors stay pending. Resend is the first provider; the key comes from env only.
 */
export function guardianDelivery(): GuardianDelivery | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GUARDIAN_CONSENT_EMAIL_FROM;
  return apiKey && from ? resendDelivery(apiKey, from) : null;
}
