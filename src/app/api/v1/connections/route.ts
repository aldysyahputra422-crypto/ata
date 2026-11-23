import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { cookieName, cookieOptions, credentialsAvailable, newSalt, seal } from "@/lib/tanya/credentials";
import { publicProviders } from "@/lib/tanya/providers";
import { publicConnection, readConnection, secureRequest, takeRequest } from "@/lib/tanya/server";
import { CONNECTION_BODY_BYTES, connectionInput, providerFailure, resolveTarget, verifyConnection } from "./shared";

export const dynamic = "force-dynamic";

const noByok = () => accountError(503, "byok_unavailable", "Penyimpanan key belum disiapkan di server ini. Pakai Mode Tanpa Key dulu.");

export async function GET() {
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const stored = await readConnection(session.client);
  if (!stored) return accountUnavailable();
  return NextResponse.json({ byok_available: credentialsAvailable(), connection: stored.connection, providers: publicProviders() }, { headers: privateHeaders });
}

/** FR-BYOK-01/02: tests the key with its provider, then stores it encrypted for this sign-in session only. */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  if (!credentialsAvailable()) return noByok();
  const parsed = connectionInput.safeParse(await parseJsonBody(request, CONNECTION_BODY_BYTES));
  if (!parsed.success) return accountError(400, "validation", "Periksa provider, key, dan model-mu.");
  const limited = await takeRequest(session.client);
  if (limited) return limited;
  const target = await resolveTarget(parsed.data);
  if ("error" in target) return target.error;

  const { api_key: apiKey, model } = parsed.data;
  try {
    await verifyConnection(target.adapter, { providerId: target.provider.id, apiKey, baseUrl: target.baseUrl, model });
  } catch (error) {
    return providerFailure(error);
  }

  const begun = await session.client.rpc("ai_credential_begin");
  const ids = begun.data as { user_id?: string; session_id?: string; connection_id?: string } | null;
  if (begun.error || !ids?.user_id || !ids.session_id || !ids.connection_id) return accountUnavailable();
  const salt = newSalt();
  const sealed = seal(apiKey, salt, { userId: ids.user_id, sessionId: ids.session_id, connectionId: ids.connection_id, providerId: target.provider.id });
  if (!sealed) return noByok();
  const saved = await session.client.rpc("ai_credential_put", {
    p_connection_id: ids.connection_id, p_provider_id: target.provider.id, p_base_url: target.storedUrl, p_model: model,
    p_last4: apiKey.slice(-4), p_kek_version: sealed.kekVersion, p_iv: sealed.iv, p_ciphertext: sealed.ciphertext, p_tag: sealed.tag,
  });
  const connection = saved.error ? null : publicConnection(saved.data);
  if (!connection) return accountUnavailable();

  const response = NextResponse.json({ connection }, { status: 201, headers: privateHeaders });
  const secure = secureRequest(request);
  response.cookies.set(cookieName(secure), salt, cookieOptions(secure));
  return response;
}

/** FR-BYOK-08: removes the key now. */
export async function DELETE(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const removed = await session.client.rpc("ai_credential_delete");
  if (removed.error) return accountUnavailable();
  const response = NextResponse.json({ connection: null }, { headers: privateHeaders });
  const secure = secureRequest(request);
  response.cookies.set(cookieName(secure), "", { ...cookieOptions(secure), maxAge: 0 });
  return response;
}
