import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Session-bound BYOK key (blueprint 16 §3, FR-BYOK-02). Opening a stored key needs three things held in three
// places: the server's KEK (env), the 32-byte salt in the user's HttpOnly cookie, and the ciphertext row.
// The plaintext key exists only inside one request and is never written, logged or returned.

export const KEK_VERSION = 1;
export const CREDENTIAL_MAX_AGE_S = 12 * 60 * 60;
const KEK_ENV = "KEY_ENCRYPTION_SECRET";

export type Binding = { userId: string; sessionId: string; connectionId: string; providerId: string };
export type Sealed = { kekVersion: number; iv: string; ciphertext: string; tag: string };

/** Encryption is available only when the environment provides a real secret. There is no built-in fallback key. */
export function kek(version: number = KEK_VERSION): Buffer | null {
  const secret = version === KEK_VERSION ? process.env[KEK_ENV] : process.env[`${KEK_ENV}_V${version}`];
  return secret && secret.length >= 32 ? Buffer.from(secret, "utf8") : null;
}
export const credentialsAvailable = () => kek() !== null;

export const newSalt = () => randomBytes(32).toString("base64url");
export function validSalt(value: string | undefined): value is string {
  return !!value && /^[A-Za-z0-9_-]{43}$/.test(value);
}

const info = (b: Binding) => `ata-cred-v1|${b.userId}|${b.sessionId}|${b.connectionId}`;
const aad = (b: Binding) => Buffer.from(`${b.userId}|${b.sessionId}|${b.connectionId}|${b.providerId}`, "utf8");

function dek(key: Buffer, salt: string, binding: Binding): Buffer {
  return Buffer.from(hkdfSync("sha256", key, Buffer.from(salt, "base64url"), info(binding), 32));
}

export function seal(apiKey: string, salt: string, binding: Binding): Sealed | null {
  const key = kek();
  if (!key || !validSalt(salt)) return null;
  const derived = dek(key, salt, binding);
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", derived, iv);
    cipher.setAAD(aad(binding));
    const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
    return { kekVersion: KEK_VERSION, iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
  } finally {
    derived.fill(0);
  }
}

/** Null when anything does not match: wrong cookie, another session, a changed row, or a missing KEK. */
export function open(sealed: Sealed, salt: string | undefined, binding: Binding): string | null {
  const key = kek(sealed.kekVersion);
  if (!key || !validSalt(salt)) return null;
  const derived = dek(key, salt, binding);
  try {
    const decipher = createDecipheriv("aes-256-gcm", derived, Buffer.from(sealed.iv, "base64"));
    decipher.setAAD(aad(binding));
    decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  } finally {
    derived.fill(0);
  }
}

export const cookieName = (secure: boolean) => (secure ? "__Host-ata_kred" : "ata_kred");
export const cookieOptions = (secure: boolean) => ({ httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: CREDENTIAL_MAX_AGE_S });
