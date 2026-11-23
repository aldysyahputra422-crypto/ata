import type { Classification } from "./intent";
import type { Source } from "./context";

// Output validation (blueprint 02 §8). Provider output is data: it is checked, never executed, and the screen
// renders it through an escaping markdown renderer.

export const OUTPUT_CHAR_LIMIT = 40000;
export type FinishReason = "stop" | "length" | "filter" | "other";
export type Warning = "truncated" | "filtered" | "unknown_citation" | "uncited_context" | "unverified_rule" | "prompt_echo";
export type Validation = {
  ok: boolean;
  error?: "empty_output";
  warnings: Warning[];
  /** Source ids the answer cites and that were really supplied. */
  cited: string[];
  unknownCitations: string[];
};

export function validateOutput(text: string, input: { sources: Source[]; classification: Classification; finish: FinishReason }): Validation {
  const body = String(text ?? "").trim();
  if (!body) return { ok: false, error: "empty_output", warnings: input.finish === "filter" ? ["filtered"] : [], cited: [], unknownCitations: [] };

  const known = new Set(input.sources.map((s) => s.id));
  const mentioned = [...new Set([...body.matchAll(/\[(S\d{1,3})\]/g)].map((m) => m[1]))];
  const cited = mentioned.filter((id) => known.has(id));
  const unknownCitations = mentioned.filter((id) => !known.has(id));

  const warnings: Warning[] = [];
  if (input.finish === "length" || body.length >= OUTPUT_CHAR_LIMIT) warnings.push("truncated");
  if (input.finish === "filter") warnings.push("filtered");
  if (unknownCitations.length) warnings.push("unknown_citation");
  if (input.sources.length && !cited.length) warnings.push("uncited_context");
  // FR-CCH-04: a rules question answered with numbers while no competition data was supplied.
  if (input.classification.needsOfficialSource && !input.sources.some((s) => s.category === "lomba") && /\d/.test(body)) warnings.push("unverified_rule");
  if (/<\/?konteks_akun>/i.test(body)) warnings.push("prompt_echo");
  return { ok: true, warnings, cited, unknownCitations };
}

export const WARNING_TEXT: Record<Warning, string> = {
  truncated: "Jawaban terpotong karena batas panjang. Minta Ata melanjutkan bila perlu.",
  filtered: "Provider menghentikan jawaban ini karena filter kontennya.",
  unknown_citation: "Jawaban menyebut sumber yang tidak Ata kirim. Abaikan penanda itu.",
  uncited_context: "Jawaban tidak menandai bagian mana yang diambil dari datamu.",
  unverified_rule: "Angka atau aturan di jawaban ini tidak berasal dari data Ata. Cek panduan resmi lomba sebelum dipakai.",
  prompt_echo: "Jawaban memuat potongan instruksi internal. Periksa lagi isinya.",
};
