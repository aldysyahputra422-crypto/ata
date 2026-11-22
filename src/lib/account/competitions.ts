import "server-only";
import { z } from "zod";

export const competitionColumns = "competition_key,source,state,card,roadmap,committed_at,created_at,updated_at";
export const competitionKey = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/);
/** Upper bound of one PUT body: a manual card plus a full roadmap. The database checks each column again. */
export const competitionBodyBytes = 96 * 1024;

const jsonObject = z.record(z.string(), z.unknown());
export const competitionInput = z.strictObject({
  state: z.enum(["saved", "skipped", "slot", "released"]),
  source: z.enum(["catalog", "manual", "search"]).default("catalog"),
  card: jsonObject.nullable().optional(),
  roadmap: jsonObject.nullable().optional(),
});
