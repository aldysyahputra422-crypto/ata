import "server-only";
import { accountError, accountUnavailable, checkOrigin, parseJsonBody } from "./http";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/env";
import type { z } from "zod";

export const invalidLink = () =>
  accountError(404, "invalid_token", "Tautan ini tidak berlaku: sudah dipakai, kedaluwarsa, atau dibatalkan.");

/**
 * Shared front of the guardian routes. The guardian has no account, so the token in the body is the only
 * credential; the service-role client is used only to call the token functions of migration 0008.
 */
type GuardianRequest<T> = { response: Response } | { body: T; admin: ReturnType<typeof createAdminClient> };

export async function guardianRequest<T>(request: Request, schema: z.ZodType<T>): Promise<GuardianRequest<T>> {
  const forbidden = checkOrigin(request);
  if (forbidden) return { response: forbidden };
  const body = schema.safeParse(await parseJsonBody(request, 2 * 1024));
  if (!body.success) return { response: accountError(422, "validation", "Permintaan tidak valid.") };
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { response: accountUnavailable() };
  return { body: body.data, admin: createAdminClient() };
}
