import "server-only";
import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const privateHeaders = { "Cache-Control": "private, no-store" };

export function accountError(status: number, code: string, message: string, retryAfter?: number) {
  const headers = retryAfter ? { ...privateHeaders, "Retry-After": String(retryAfter) } : privateHeaders;
  const error = retryAfter ? { code, message, retry_after_s: retryAfter } : { code, message };
  return NextResponse.json({ error }, { status, headers });
}

export const accountUnavailable = () => accountError(503, "unavailable", "Layanan akun belum tersedia. Coba lagi nanti.");
export const needsSignIn = () => accountError(401, "unauthenticated", "Masuk dulu untuk melanjutkan.");

export function appOrigin(request: Request): string {
  if (process.env.APP_ORIGIN) return new URL(process.env.APP_ORIGIN).origin;

  const url = new URL(request.url);
  const host = request.headers.get("host");
  // Next can normalize a loopback request URL to localhost even when the browser used 127.0.0.1.
  if (process.env.NODE_ENV !== "production" && host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) {
    url.host = host;
  }
  return url.origin;
}

export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin(request)) {
    return accountError(403, "forbidden_origin", "Asal permintaan tidak diizinkan.");
  }
}

export async function accountSession() {
  if (!hasSupabaseEnv()) return { state: "signed_out" } as const;

  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && ![400, 401, 403].includes(error.status ?? 0)) {
    return { state: "unavailable" } as const;
  }
  if (!data.user || data.user.is_anonymous || error) return { state: "signed_out" } as const;

  const session = await client.rpc("account_session_active");
  if (session.error) return { state: "unavailable" } as const;
  if (session.data !== true) return { state: "signed_out" } as const;
  return { state: "signed_in", client, user: data.user } as const;
}

export async function canSignInWithGoogle(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;

  try {
    const response = await fetch(new URL("/auth/v1/settings", process.env.NEXT_PUBLIC_SUPABASE_URL), {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok && (await response.json()).external?.google === true;
  } catch {
    return false;
  }
}

export async function parseJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return undefined;
  const reader = request.body?.getReader();
  if (!reader) return undefined;

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let text = "";
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }
}
