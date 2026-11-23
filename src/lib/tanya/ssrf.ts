import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// FR-BYOK-04: a custom base URL must be https and must not point at a private, loopback or link-local address.

export type Resolve = (host: string) => Promise<string[]>;
const systemResolve: Resolve = async (host) => (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

function v4Blocked(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function addressBlocked(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return v4Blocked(ip);
  if (kind !== 6) return true;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return v4Blocked(mapped[1]);
  // Only global unicast (2000::/3) is allowed, minus ranges that embed or tunnel an IPv4 address or are documentation-only.
  if (!/^[23]/.test(lower)) return true;
  return lower.startsWith("2002:") || lower.startsWith("2001:db8:") || /^2001:0?:/.test(lower) || lower.startsWith("64:ff9b:");
}

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: "invalid" | "not_https" | "private_address" | "unresolvable" };

export async function checkBaseUrl(input: string, resolve: Resolve = systemResolve): Promise<UrlCheck> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (url.protocol !== "https:") return { ok: false, reason: "not_https" };
  if (url.username || url.password || url.search || url.hash || input.length > 300) return { ok: false, reason: "invalid" };
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, reason: "private_address" };
  }
  let addresses: string[];
  if (isIP(host)) addresses = [host];
  else {
    try {
      addresses = await resolve(host);
    } catch {
      return { ok: false, reason: "unresolvable" };
    }
  }
  if (!addresses.length) return { ok: false, reason: "unresolvable" };
  if (addresses.some(addressBlocked)) return { ok: false, reason: "private_address" };
  return { ok: true, url: `${url.origin}${url.pathname.replace(/\/+$/, "")}` };
}
