import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { takeRequest } from "@/lib/tanya/server";
import { CONNECTION_BODY_BYTES, keyInput, providerFailure, resolveTarget } from "../shared";

export const dynamic = "force-dynamic";

/** FR-BYOK-01/05: tests a key against its provider and returns the models it can use. The key is not stored. */
export async function POST(request: Request) {
  const forbidden = checkOrigin(request);
  if (forbidden) return forbidden;
  const session = await accountSession();
  if (session.state === "unavailable") return accountUnavailable();
  if (session.state === "signed_out") return needsSignIn();
  const parsed = keyInput.safeParse(await parseJsonBody(request, CONNECTION_BODY_BYTES));
  if (!parsed.success) return accountError(400, "validation", "Periksa provider dan key-mu.");
  const limited = await takeRequest(session.client);
  if (limited) return limited;
  const target = await resolveTarget(parsed.data);
  if ("error" in target) return target.error;

  try {
    const models = await target.adapter.listModels({ providerId: target.provider.id, apiKey: parsed.data.api_key, baseUrl: target.baseUrl, model: "" });
    return NextResponse.json({ ok: true, models: models.map((m) => m.id) }, { headers: privateHeaders });
  } catch (error) {
    const failure = target.adapter.mapError(error);
    // No model list is not a bad key: the user can still type a model name.
    if (["model_unavailable", "bad_request", "bad_response"].includes(failure.code)) {
      return NextResponse.json({ ok: true, models: [] }, { headers: privateHeaders });
    }
    return providerFailure(failure);
  }
}
