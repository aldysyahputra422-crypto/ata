import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CATEGORIES, type AiCategory } from "@/lib/account/profile";
import type { CanProcessAi, GateReason } from "./gate";

// Permission-aware context retrieval (FR-CCH-02, FR-AUTH-09). A category is read from the database only after
// the gate allows it, so data the user did not share never reaches this process's prompt, logs or provider.

export type Source = { id: string; category: AiCategory; label: string; text: string };
export type Blocked = { category: AiCategory; reason: GateReason };
export type ContextPack = {
  sources: Source[];
  blocked: Blocked[];
  /** Allowed categories that had nothing stored. */
  empty: AiCategory[];
  /** Categories dropped to stay inside the token budget. */
  trimmed: AiCategory[];
  tokens: number;
};

/** Reads one category of account data as plain text lines. Null or empty means "nothing stored". */
export type CategoryReader = (category: AiCategory) => Promise<{ label: string; text: string }[] | null>;

export const CONTEXT_TOKEN_BUDGET = 6000;
const FIELD_LIMIT = 400;
const MAX_ITEMS = 8;

export const estimateTokens = (text: string) => Math.ceil(String(text).trim().length / 4);

/** One line of stored text: control characters removed, length capped. Stored text is data, never instructions. */
export function clean(value: unknown, limit = FIELD_LIMIT): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
}
const list = (value: unknown) => (Array.isArray(value) ? value.map((item) => clean(item, 80)).filter(Boolean).slice(0, 12) : []);
const line = (label: string, value: string) => (value ? `${label}: ${value}` : "");
const join = (lines: string[]) => lines.filter(Boolean).join("\n");

type Row = Record<string, unknown>;
type Step = { id: string; name: string; due: string; competition: string };

function steps(rows: Row[]): Step[] {
  return rows.flatMap((row) => {
    const roadmap = row.roadmap as { langkah?: unknown } | null;
    if (row.state !== "slot" || !Array.isArray(roadmap?.langkah)) return [];
    const competition = clean((row.card as Row | null)?.nama, 120) || clean(row.competition_key, 80);
    return roadmap.langkah.filter((s): s is Row => !!s && typeof s === "object")
      .map((s) => ({ id: clean(s.id, 80), name: clean(s.nama, 160), due: clean(s.tanggal, 10), competition }));
  });
}

/** Reads account data through the signed-in user's own client, so RLS still applies to every query. */
export function accountReader(client: SupabaseClient): CategoryReader {
  let competitions: Promise<Row[] | null> | undefined;
  let tasks: Promise<Row[] | null> | undefined;
  const loadCompetitions = () => (competitions ??= (async () => {
    const { data, error } = await client.from("user_competitions").select("competition_key,state,card,roadmap").order("created_at");
    return error ? null : (data as Row[]);
  })());
  const loadTasks = () => (tasks ??= (async () => {
    const { data, error } = await client.from("task_progress").select("competition_key,step_id,status,due_on,completed_on");
    return error ? null : (data as Row[]);
  })());
  // The account's calendar day, from the same function Hari Ini uses (profiles.timezone, Asia/Jakarta when unset).
  const loadToday = async (): Promise<string> => {
    try {
      const { data, error } = await client.rpc("progress_today");
      const today = error ? "" : clean((data as Row | null)?.today, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(today)) return today;
    } catch {
      // fall through to the default zone
    }
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  };
  const profile = async (columns: string) => {
    const { data, error } = await client.from("profiles").select(columns).maybeSingle();
    return error ? null : (data as Row | null);
  };

  return async (category) => {
    if (category === "profil") {
      // Field split follows the permission text shown in /profil (KATEGORI_IZIN).
      const row = await profile("display_name,jenjang,institution,goals_text,weekly_hours");
      if (!row) return null;
      const text = join([
        line("Nama panggilan", clean(row.display_name, 80)),
        line("Jenjang", clean(row.jenjang, 40)),
        line("Sekolah/kampus", clean(row.institution, 120)),
        line("Tujuan", clean(row.goals_text)),
        line("Waktu per minggu", row.weekly_hours == null ? "" : `${clean(row.weekly_hours)} jam`),
      ]);
      return text ? [{ label: "Profil", text }] : [];
    }
    if (category === "akademik") {
      const row = await profile("major,interests,skills,targets");
      if (!row) return null;
      const text = join([
        line("Jurusan", clean(row.major, 120)),
        line("Minat lomba", list(row.interests).join(", ")),
        line("Kemampuan", list(row.skills).join(", ")),
        line("Target", list(row.targets).join(", ")),
      ]);
      return text ? [{ label: "Akademik", text }] : [];
    }
    if (category === "lomba") {
      const rows = await loadCompetitions();
      if (!rows) return null;
      return rows.filter((row) => row.state === "slot" || row.state === "saved").sort((x, y) => Number(y.state === "slot") - Number(x.state === "slot")).slice(0, MAX_ITEMS).map((row) => {
        const card = (row.card ?? {}) as Row;
        const name = clean(card.nama, 120) || clean(row.competition_key, 80);
        return {
          label: `${row.state === "slot" ? "Slot" : "Disimpan"}: ${name}`,
          text: join([
            line("Lomba", name),
            line("Status", row.state === "slot" ? "Slot aktif" : "disimpan"),
            line("Penyelenggara", clean(card.penyelenggara, 120)),
            line("Kategori", clean(card.kategori, 60)),
            line("Tenggat", clean(card.tenggatIso, 10) || "belum tertulis"),
            line("Biaya", card.biaya === 0 ? "gratis" : typeof card.biaya === "number" ? `Rp${card.biaya}` : "belum tertulis"),
            line("Sumber", clean(card.sumber, 200)),
          ]),
        };
      });
    }
    if (category === "tugas" || category === "progres") {
      const [rows, progress] = await Promise.all([loadCompetitions(), loadTasks()]);
      if (!rows || !progress) return null;
      const status = new Map(progress.map((t) => [`${t.competition_key}/${t.step_id}`, t]));
      const all = rows.flatMap((row) => steps([row]).map((step) => ({ ...step, task: status.get(`${row.competition_key}/${step.id}`) })));
      if (!all.length) return [];
      if (category === "tugas") {
        // Upcoming steps first (nearest date), then overdue ones (most recent), then undated ones.
        const today = await loadToday();
        const rank = (due: string) => (!due ? 2 : due >= today ? 0 : 1);
        const open = all
          .filter((s) => s.task?.status !== "done")
          .sort((a, b) => rank(a.due) - rank(b.due) || (rank(a.due) === 1 ? b.due.localeCompare(a.due) : a.due.localeCompare(b.due)))
          .slice(0, MAX_ITEMS);
        if (!open.length) return [];
        return [{
          label: "Tugas terbuka",
          text: open.map((s) => `- ${s.name} (${s.competition}${s.due ? `, tenggat ${s.due}` : ""}${s.task?.status === "doing" ? ", sedang dikerjakan" : ""})`).join("\n"),
        }];
      }
      const done = all.filter((s) => s.task?.status === "done");
      const latest = done.map((s) => clean(s.task?.completed_on, 10)).filter(Boolean).sort().at(-1);
      return [{
        label: "Progres",
        text: join([`Langkah selesai: ${done.length} dari ${all.length}.`, line("Terakhir menyelesaikan langkah", latest ?? "")]),
      }];
    }
    // evaluasi, ingatan, dokumen: nothing is stored for these yet, so there is nothing to retrieve.
    return [];
  };
}

/**
 * Builds the context for one question. Order of `wanted` is priority: when the budget is exceeded the least
 * important category goes first. Every source gets an id (S1, S2, …) the answer can cite.
 */
export async function retrieveContext(input: {
  userId: string | null;
  wanted: AiCategory[];
  gate: CanProcessAi;
  read: CategoryReader;
  budget?: number;
}): Promise<ContextPack> {
  const wanted = [...new Set(input.wanted)].filter((c) => (AI_CATEGORIES as readonly string[]).includes(c));
  const blocked: Blocked[] = [];
  const empty: AiCategory[] = [];
  const kept: { category: AiCategory; items: { label: string; text: string }[] }[] = [];

  for (const category of wanted) {
    let decision;
    try {
      decision = await input.gate(input.userId, category);
    } catch {
      decision = { allowed: false, reason: "permission_off" as const };
    }
    if (decision.allowed !== true) {
      blocked.push({ category, reason: decision.reason ?? "permission_off" });
      continue;
    }
    let items: { label: string; text: string }[] | null = null;
    try {
      items = await input.read(category);
    } catch {
      items = null;
    }
    const usable = (items ?? []).map((item) => ({ label: clean(item.label, 160), text: String(item.text).slice(0, 4000) })).filter((item) => item.text.trim());
    if (usable.length) kept.push({ category, items: usable });
    else empty.push(category);
  }

  const budget = input.budget ?? CONTEXT_TOKEN_BUDGET;
  const size = () => kept.reduce((n, group) => n + group.items.reduce((m, item) => m + estimateTokens(item.text), 0), 0);
  const trimmed: AiCategory[] = [];
  while (kept.length && size() > budget) trimmed.unshift(kept.pop()!.category);

  const sources = kept.flatMap((group) => group.items.map((item) => ({ category: group.category, ...item })))
    .map((item, index) => ({ id: `S${index + 1}`, ...item }));
  return { sources, blocked, empty, trimmed, tokens: size() };
}
