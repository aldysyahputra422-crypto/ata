import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { AI_CATEGORIES } from "./profile";

/** Version of the consent text shown to the guardian. Change it whenever that text changes. */
export const GUARDIAN_CONSENT_VERSION = "2026-11-wali-1";
export const GUARDIAN_LINK_HOURS = 72;
export const GUARDIAN_PAGE = "/wali/persetujuan";

const name = z.string().trim().min(2).max(80).regex(/^[^\p{C}<>]+$/u);
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const consentRequestInput = z.strictObject({
  guardian_name: name,
  guardian_email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});
export const guardianTokenInput = z.strictObject({ token });
export const guardianConfirmInput = z.discriminatedUnion("approve", [
  // The guardian types their own name and states they are the parent/guardian; a bare click is not accepted.
  z.strictObject({ token, approve: z.literal(true), verifier_name: name, is_guardian: z.literal(true) }),
  z.strictObject({ token, approve: z.literal(false) }),
]);

export const newToken = () => randomBytes(32).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

/**
 * One mailbox behind several spellings: plus tags everywhere, dots and googlemail.com at Gmail.
 * It only stops the obvious alias of the account's own inbox; a second inbox the student owns cannot be told apart.
 */
export function mailbox(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  const domain = lower.slice(at + 1).replace(/^googlemail\.com$/, "gmail.com");
  const local = lower.slice(0, at).split("+")[0] ?? "";
  return `${domain === "gmail.com" ? local.replaceAll(".", "") : local}@${domain}`;
}

/** The link carries the token in the fragment, so it is not sent to servers in the URL or kept in access logs. */
export const guardianLink = (origin: string, kind: "t" | "c", value: string) => `${origin}${GUARDIAN_PAGE}#${kind}=${value}`;

const STATUSES = ["age_unknown", "not_required", "none", "pending", "expired", "verified", "declined", "revoked"] as const;
export type ConsentStatus = (typeof STATUSES)[number];

const text = (value: unknown) => (typeof value === "string" ? value : null);

/** The account's view of its own guardian consent. Hashes and tokens never leave the server. */
export function publicConsent(row: Record<string, unknown> | null, deliveryAvailable: boolean) {
  const status = STATUSES.find((s) => s === row?.status);
  if (!row || !status) return null;
  return {
    status,
    required: row.required === true,
    delivery_available: deliveryAvailable,
    guardian_name: text(row.guardian_name),
    contact_masked: text(row.contact_masked),
    version: text(row.version),
    scope: Array.isArray(row.scope) ? AI_CATEGORIES.filter((c) => (row.scope as unknown[]).includes(c)) : [],
    requested_at: text(row.requested_at),
    expires_at: text(row.expires_at),
    delivery_status: text(row.delivery_status),
    verified_at: text(row.verified_at),
    declined_at: text(row.declined_at),
    revoked_at: text(row.revoked_at),
    revoked_by: text(row.revoked_by),
  };
}
