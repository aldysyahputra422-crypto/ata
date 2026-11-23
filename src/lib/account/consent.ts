import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { AI_CATEGORIES, birthDateInput } from "./profile";

/** Version of the consent text shown to the guardian. Change it whenever that text changes. */
export const GUARDIAN_CONSENT_VERSION = "2026-11-wali-1";
export const GUARDIAN_LINK_HOURS = 72;
export const GUARDIAN_PAGE = "/wali/persetujuan";

const name = z.string().trim().min(2).max(80).regex(/^[^\p{C}<>]+$/u);
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const consentRequestInput = z.strictObject({ guardian_name: name, guardian_email: email });
/** A birth date correction from under 18 to adult: the corrected date and the parent/guardian who will confirm it. */
export const correctionRequestInput = z.strictObject({ birth_date: birthDateInput, guardian_name: name, guardian_email: email });
export const guardianTokenInput = z.strictObject({ token });
export const guardianConfirmInput = z.discriminatedUnion("approve", [
  // The guardian types their own name and states they are the parent/guardian; a bare click is not accepted.
  z.strictObject({ token, approve: z.literal(true), verifier_name: name, is_guardian: z.literal(true) }),
  // a refusal may ask for the child's account to be deleted after the notice period
  z.strictObject({ token, approve: z.literal(false), request_deletion: z.boolean().optional() }),
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

const ACCOUNT_STATES = ["age_unknown", "not_required", "pending", "granted"] as const;

/** The account's view of its own guardian consent. Hashes and tokens never leave the server. */
export function publicConsent(row: Record<string, unknown> | null, deliveryConfigured: boolean) {
  const status = STATUSES.find((s) => s === row?.status);
  const accountState = ACCOUNT_STATES.find((s) => s === row?.account_state);
  if (!row || !status || !accountState) return null;
  const correction = row.correction && typeof row.correction === "object" ? (row.correction as Record<string, unknown>) : null;
  return {
    status,
    /** pending: under 18 without verified consent; every AI permission is off */
    account_state: accountState,
    required: row.required === true,
    /** not_configured: no email provider is set up here, so no link can be sent and nothing counts as sent */
    delivery: deliveryConfigured ? ("configured" as const) : ("not_configured" as const),
    birth_date: text(row.birth_date),
    birth_date_known: row.birth_date_known === true,
    corrections_left: typeof row.corrections_left === "number" ? row.corrections_left : 0,
    correction: correction && {
      birth_date: text(correction.birth_date),
      guardian_name: text(correction.guardian_name),
      contact_masked: text(correction.contact_masked),
      expires_at: text(correction.expires_at),
    },
    verification_method: text(row.verification_method),
    deletion_due_at: text(row.deletion_due_at),
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
