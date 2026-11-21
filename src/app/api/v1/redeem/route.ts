import { NextResponse } from "next/server";
import { z } from "zod";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";

const input = z.strictObject({ code: z.string().trim().min(1).max(64) });
const requestKey = z.uuid();

export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();

  const body = input.safeParse(await parseJsonBody(request, 1024));
  const key = requestKey.nullable().safeParse(request.headers.get("idempotency-key"));
  if (!body.success || !key.success) {
    return accountError(422, "validation", "Periksa kode dan kunci idempotensi.");
  }

  const { data, error } = await session.client.rpc("redeem_code", { code: body.data.code, request_key: key.data });
  if (error?.code === "42501") return needsSignIn();
  if (error || !data) return accountUnavailable();
  if (data.error === "rate_limited") return accountError(429, "rate_limited", "Terlalu banyak percobaan. Coba lagi nanti.", 900);
  if (data.error === "invalid_code") return accountError(422, "invalid_code", "Kode tidak dapat digunakan. Periksa kode dan coba lagi.");
  if (data.error === "already_redeemed") return accountError(409, "already_redeemed", "Kamu sudah menukarkan kode ini.");
  return NextResponse.json(data, { headers: privateHeaders });
}
