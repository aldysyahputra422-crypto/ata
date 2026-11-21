import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appOrigin, privateHeaders } from "@/lib/account/http";

export const returnCookie = "ata-oauth-return";

const returnPath = z.string().max(1024).regex(/^\/(?!\/)[^\\\r\n\t]*$/);

export function safeReturnPath(path: string | null): string {
  const parsed = returnPath.safeParse(path);
  if (!parsed.success) return "/hari-ini";
  const url = new URL(parsed.data, "https://ata.invalid");
  if (url.origin !== "https://ata.invalid" || url.pathname.startsWith("//")) return "/hari-ini";
  return url.pathname + url.search + url.hash;
}

export function oauthResult(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin(request)), { status: 302, headers: privateHeaders });
  response.cookies.delete(returnCookie);
  return response;
}
