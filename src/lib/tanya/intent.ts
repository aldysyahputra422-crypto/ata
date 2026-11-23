import type { AiCategory } from "@/lib/account/profile";

// Deterministic intent and task classification (blueprint 02 §2). No model call: the same question always
// gives the same result, and the screen can show why a data category was asked for.
export const INTENTS = [
  "cek_aturan", "review_ide", "pecah_tugas", "simulasi_juri", "mentok", "rekomendasi_lomba", "progres", "umum",
] as const;
export type Intent = (typeof INTENTS)[number];
export type TaskType = "tanya_fakta" | "kritik" | "perencanaan" | "latihan" | "dukungan" | "rekomendasi" | "ringkasan" | "percakapan";

export type Classification = {
  intent: Intent;
  task: TaskType;
  /** Account data categories that would make the answer better, most useful first. */
  categories: AiCategory[];
  /** The answer depends on official rules that Ata must not make up (FR-CCH-04). */
  needsOfficialSource: boolean;
  confidence: "tinggi" | "sedang" | "rendah";
};

const RULES: { intent: Intent; task: TaskType; categories: AiCategory[]; official?: boolean; pattern: RegExp }[] = [
  { intent: "simulasi_juri", task: "latihan", categories: ["lomba", "profil"], pattern: /(simulasi juri|tanya juri|pertanyaan juri|latihan presentasi|jadi juri)/i },
  { intent: "review_ide", task: "kritik", categories: ["lomba", "profil"], pattern: /(review|nilai(?:kan)? |kritik|cek ide|masukan|feedback|koreksi)/i },
  // Saying outright that you are stuck asks for support even when a plan word follows ("mentok, kasih langkah kecil").
  // The softer words stay below planning, so "susun jadwal supaya tidak ketinggalan" is still a plan.
  { intent: "mentok", task: "dukungan", categories: ["tugas", "progres"], pattern: /(mentok|kewalahan|stuck|putus asa)/i },
  { intent: "pecah_tugas", task: "perencanaan", categories: ["tugas", "lomba", "profil"], pattern: /(pecah|bagi tugas|langkah kecil|mulai dari mana|jadwal|rencana|timeline)/i },
  { intent: "mentok", task: "dukungan", categories: ["tugas", "progres"], pattern: /(bingung|ketinggalan|capek|malas)/i },
  { intent: "progres", task: "ringkasan", categories: ["progres", "tugas"], pattern: /(progres|progress|streak|\bxp\b|level|sudah sejauh|pencapaian)/i },
  { intent: "rekomendasi_lomba", task: "rekomendasi", categories: ["profil", "akademik", "lomba"], pattern: /(rekomendasi|cocok|lomba apa|kompetisi apa|sebaiknya ikut|pilih lomba)/i },
  {
    intent: "cek_aturan", task: "tanya_fakta", categories: ["lomba"], official: true,
    pattern: /(aturan|juknis|batas|maksimal|minimal|jumlah\s+(halaman|kata|lembar)|halaman|format|font|margin|biaya|harga|tanggal|deadline|tenggat|ketentuan|syarat|kapan|berapa)/i,
  },
];

export function classify(question: string): Classification {
  const text = String(question ?? "");
  const hits = RULES.filter((rule) => rule.pattern.test(text));
  if (!hits.length) return { intent: "umum", task: "percakapan", categories: [], needsOfficialSource: false, confidence: "rendah" };
  const [first] = hits;
  const categories = [...new Set(hits.flatMap((rule) => rule.categories))];
  return {
    intent: first.intent,
    task: first.task,
    categories,
    needsOfficialSource: hits.some((rule) => rule.official),
    confidence: hits.length === 1 ? "tinggi" : "sedang",
  };
}

export const INTENT_LABEL: Record<Intent, string> = {
  cek_aturan: "Cek aturan lomba",
  review_ide: "Review ide",
  pecah_tugas: "Pecah tugas",
  simulasi_juri: "Simulasi juri",
  mentok: "Lagi mentok",
  rekomendasi_lomba: "Rekomendasi lomba",
  progres: "Progres",
  umum: "Pertanyaan umum",
};
