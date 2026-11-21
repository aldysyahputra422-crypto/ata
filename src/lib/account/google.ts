import "server-only";
import { NextResponse } from "next/server";
import { appOrigin, privateHeaders } from "@/lib/account/http";

export const returnCookie = "ata-oauth-return";

export function safeReturnPath(path: string | null): string {
  if (!path || path[0] !== "/" || path[1] === "/" || path.length > 1024 || path.includes("\\") || /[\r\n\t]/.test(path)) {
    return "/hari-ini";
  }
  const url = new URL(path, "https://ata.invalid");
  if (url.origin !== "https://ata.invalid" || url.pathname.startsWith("//")) return "/hari-ini";
  return url.pathname + url.search + url.hash;
}

export function oauthResult(request: Request, path: string) {
  const response = NextResponse.redirect(new URL(path, appOrigin(request)), { status: 302, headers: privateHeaders });
  response.cookies.delete(returnCookie);
  return response;
}
