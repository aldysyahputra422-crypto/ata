import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { JENJANG } from "@/lib/prototype/masuk/data/onboarding.js";

// Account profile, onboarding and AI data permissions (FR-AUTH-04, FR-AUTH-09). The database functions of
// migration 0007 repeat every limit here, so a direct PostgREST call is held to the same rules.

export const BIRTH_YEAR_MIN = 1940;
export const birthYearMax = () => new Date().getUTCFullYear() - 5;

/** A full calendar date, YYYY-MM-DD (FR-AUTH-07). The database decides the age from it; a bare year is not accepted. */
export const birthDateInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    && date.getUTCFullYear() >= BIRTH_YEAR_MIN && date.getUTCFullYear() <= birthYearMax();
});

export const AI_CATEGORIES = ["profil", "akademik", "lomba", "tugas", "progres", "evaluasi", "ingatan", "dokumen"] as const;
export type AiCategory = (typeof AI_CATEGORIES)[number];

const text = (max: number) => z.string().trim().max(max).nullable();
const list = (items: number) => z.array(z.string().trim().min(1).max(40)).max(items);

export const profileInput = z.strictObject({
  display_name: z.string().trim().min(2).max(30).nullable(),
  jenjang: z.enum(JENJANG as [string, ...string[]]).nullable(),
  birth_date: birthDateInput,
  institution: text(120),
  major: text(120),
  timezone: text(64),
  interests: list(5),
  targets: list(6),
  skills: list(10),
  goals_text: text(280),
  weekly_hours: z.number().int().min(0).max(80).nullable(),
}).partial().refine((patch) => Object.keys(patch).length > 0);

export const permissionInput = z.strictObject({ category: z.enum(AI_CATEGORIES), allowed: z.boolean() });

export const profileColumns =
  "display_name,jenjang,birth_date,birth_year,institution,major,timezone,interests,targets,skills,goals_text,weekly_hours,onboarding_done,updated_at";

export type Profile = {
  display_name: string | null;
  jenjang: string | null;
  birth_date: string | null;
  /** derived from the birth date; older accounts may hold only this */
  birth_year: number | null;
  institution: string | null;
  major: string | null;
  timezone: string | null;
  interests: string[];
  targets: string[];
  skills: string[];
  goals_text: string | null;
  weekly_hours: number | null;
  onboarding_done: boolean;
  updated_at: string;
};

/** Only the documented fields leave the server, whatever the row holds. */
export function publicProfile(row: Record<string, unknown>): Profile {
  const keys = profileColumns.split(",");
  return Object.fromEntries(keys.map((key) => [key, row[key] ?? null])) as Profile;
}

export async function readProfile(client: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select(profileColumns).maybeSingle();
  return error || !data ? null : publicProfile(data);
}

export function publicPermissions(categories: unknown): Record<AiCategory, boolean> {
  const stored = (categories ?? {}) as Record<string, unknown>;
  return Object.fromEntries(AI_CATEGORIES.map((key) => [key, stored[key] === true])) as Record<AiCategory, boolean>;
}
