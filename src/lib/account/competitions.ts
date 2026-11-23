import "server-only";
import { z } from "zod";
import { LOMBA } from "@/lib/prototype/lomba/data/lomba.js";
import { sisaHari, tanggalSah } from "@/lib/prototype/shared/logic/tenggat.js";

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

const catalogDeadline = new Map((LOMBA as { id: string; tenggatIso?: string | null }[]).map((l) => [l.id, tanggalSah(l.tenggatIso) as string | null]));
const cardDeadline = z.object({ tenggatIso: z.iso.date() }).transform((card) => card.tenggatIso);

/**
 * The stored deadline date (YYYY-MM-DD) of one competition row: the date on the account's own card, otherwise the
 * catalogue's. null when no date is stored. A "days left" number saved in the card is never read: it is stale the next day.
 */
export function deadlineOn(row: { competition_key: string; card: unknown }): string | null {
  const own = cardDeadline.safeParse(row.card);
  if (own.success) return own.data;
  return row.card ? null : (catalogDeadline.get(row.competition_key) ?? null);
}

/** Deadline fields every competition response carries: the stored date and the days left on the account's day `today`. */
export function withDeadline<T extends { competition_key: string; card: unknown }>(row: T, today: string) {
  const deadline_on = deadlineOn(row);
  return { ...row, deadline_on, days_left: sisaHari(deadline_on, today) as number | null };
}
