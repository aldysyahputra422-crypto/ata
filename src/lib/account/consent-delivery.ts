import "server-only";

export type GuardianMessage = { to: string; guardianName: string; studentName: string; link: string; expiresAt: string };
export type DeliveryResult = { sent: true; ref: string | null } | { sent: false };

/** Sends the confirmation link to the guardian's own inbox. A link that was not sent can never verify a consent. */
export type GuardianDelivery = { channel: "email"; send(message: GuardianMessage): Promise<DeliveryResult> };

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Resend's HTTP API (free tier), used only when both variables are set. */
function resendDelivery(apiKey: string, from: string): GuardianDelivery {
  return {
    channel: "email",
    async send({ to, guardianName, studentName, link, expiresAt }) {
      const until = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(expiresAt));
      const text = [
        `Halo ${guardianName},`,
        `${studentName} mendaftar di Ata dan mencantumkan Anda sebagai orang tua/wali. Karena usianya di bawah 18 tahun, Ata memerlukan persetujuan Anda sebelum fitur AI boleh memproses datanya.`,
        `Baca dan putuskan di tautan ini (berlaku sampai ${until} WIB, sekali pakai):`,
        link,
        "Jika Anda tidak mengenal nama tersebut, abaikan email ini. Tanpa persetujuan Anda, tidak ada data yang diproses AI.",
      ].join("\n\n");
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from, to: [to], subject: "Persetujuan orang tua/wali untuk Ata", text,
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

/** The configured channel, or null when none is wired. With null no request is opened and minors stay blocked. */
export function guardianDelivery(): GuardianDelivery | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GUARDIAN_CONSENT_EMAIL_FROM;
  return apiKey && from ? resendDelivery(apiKey, from) : null;
}
