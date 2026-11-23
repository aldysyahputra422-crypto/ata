import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Session-bound BYOK key (blueprint 16 §3, FR-BYOK-02). Envelope encryption with node:crypto only:
//   - a random 256-bit data key (DEK) encrypts the API key with AES-256-GCM;
//   - the DEK is wrapped with AES-256-GCM under a key derived (HKDF-SHA256) from the server's KEK (env only)
//     and the 32-byte salt in the user's HttpOnly cookie.
// Both layers authenticate the same binding: user, session, connection, provider, KEK version and expiry.
// Opening needs the KEK, the cookie and the row together; a row moved to another account, session or provider,
// given a later expiry or another key version, fails authentication. The plaintext key exists only inside one
// request and is never written, logged or returned.

export const KEK_VERSION = 1;
export const CREDENTIAL_MAX_AGE_S = 12 * 60 * 60;
const KEK_ENV = "KEY_ENCRYPTION_SECRET";

export type Binding = { userId: string; sessionId: string; connectionId: string; providerId: string };
/** `expiresAt` is the absolute expiry in epoch seconds; `wrappedKey` is base64(iv | wrapped DEK | tag). */
export type Sealed = { kekVersion: number; expiresAt: number; iv: string; ciphertext: string; tag: string; wrappedKey: string };

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

const bound = (b: Binding, kekVersion: number, expiresAt: number) =>
  [b.userId, b.sessionId, b.connectionId, b.providerId, `v${kekVersion}`, `exp${expiresAt}`];
/** Length-prefixed so no field can borrow characters from its neighbour. */
const aad = (layer: "dek" | "key", b: Binding, kekVersion: number, expiresAt: number) =>
  Buffer.from([`ata-cred-v2-${layer}`, ...bound(b, kekVersion, expiresAt)].map((part) => `${part.length}:${part}`).join("|"), "utf8");

function wrappingKey(key: Buffer, salt: string, b: Binding, kekVersion: number): Buffer {
  return Buffer.from(hkdfSync("sha256", key, Buffer.from(salt, "base64url"), `ata-cred-v2|${kekVersion}|${b.userId}|${b.sessionId}|${b.connectionId}`, 32));
}

const validExpiry = (value: number) => Number.isSafeInteger(value) && value > 0;

/** Encrypts a key so that it opens only with this cookie, for this account, session, connection and provider, until `expiresAt`. */
export function seal(apiKey: string, salt: string, binding: Binding, expiresAt: number): Sealed | null {
  const key = kek();
  if (!key || !validSalt(salt) || !validExpiry(expiresAt)) return null;
  const wrapping = wrappingKey(key, salt, binding, KEK_VERSION);
  const dek = randomBytes(32);
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", dek, iv);
    cipher.setAAD(aad("key", binding, KEK_VERSION, expiresAt));
    const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
    const wrapIv = randomBytes(12);
    const wrap = createCipheriv("aes-256-gcm", wrapping, wrapIv);
    wrap.setAAD(aad("dek", binding, KEK_VERSION, expiresAt));
    const wrapped = Buffer.concat([wrap.update(dek), wrap.final()]);
    return {
      kekVersion: KEK_VERSION, expiresAt, iv: iv.toString("base64"), ciphertext: ciphertext.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"), wrappedKey: Buffer.concat([wrapIv, wrapped, wrap.getAuthTag()]).toString("base64"),
    };
  } finally {
    dek.fill(0);
    wrapping.fill(0);
  }
}

/** Returns the plaintext key, or null when anything does not match: cookie, binding, version, expiry, KEK, or the clock is past expiry. */
export function open(sealed: Sealed, salt: string | undefined, binding: Binding, now: () => Date = () => new Date()): string | null {
  const key = kek(sealed.kekVersion);
  if (!key || !validSalt(salt) || !validExpiry(sealed.expiresAt) || now().getTime() >= sealed.expiresAt * 1000) return null;
  const wrapping = wrappingKey(key, salt, binding, sealed.kekVersion);
  let dek: Buffer | null = null;
  try {
    const packed = Buffer.from(sealed.wrappedKey, "base64");
    if (packed.length !== 12 + 32 + 16) return null;
    const unwrap = createDecipheriv("aes-256-gcm", wrapping, packed.subarray(0, 12));
    unwrap.setAAD(aad("dek", binding, sealed.kekVersion, sealed.expiresAt));
    unwrap.setAuthTag(packed.subarray(44));
    dek = Buffer.concat([unwrap.update(packed.subarray(12, 44)), unwrap.final()]);
    const tag = Buffer.from(sealed.tag, "base64");
    if (tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(sealed.iv, "base64"));
    decipher.setAAD(aad("key", binding, sealed.kekVersion, sealed.expiresAt));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  } finally {
    dek?.fill(0);
    wrapping.fill(0);
  }
}

/** Absolute expiry for a key stored now, in whole epoch seconds. */
export const expiryFrom = (now: Date = new Date()) => Math.floor(now.getTime() / 1000) + CREDENTIAL_MAX_AGE_S;

export const cookieName = (secure: boolean) => (secure ? "__Host-ata_kred" : "ata_kred");
export const cookieOptions = (secure: boolean) => ({ httpOnly: true, secure, sameSite: "strict" as const, path: "/", maxAge: CREDENTIAL_MAX_AGE_S });
