// Category taxonomy (PRD 5.10) and its gem tone + temporary sticker glyph (DESIGN-SYSTEM 9.2).
// Gems stand for CATEGORY (and mentor identity), never for status.

export type GemTone = "mint" | "lavender" | "apricot" | "sky" | "rose" | "lemon";

export const CATEGORY_CODES = [
  "business_plan",
  "pkm",
  "kti_essay",
  "olympiad",
  "hackathon",
  "poster",
  "design",
  "photo",
  "creative_writing",
  "video",
  "speech",
  "other",
] as const;

export type CategoryCode = (typeof CATEGORY_CODES)[number];

export type CategoryMeta = {
  code: CategoryCode;
  label: string;
  tone: GemTone;
  /** lucide-react icon name (kebab-case), temporary until designer stickers arrive */
  icon: string;
  tier: "P0" | "P1" | "P2";
};

export const CATEGORIES: Record<CategoryCode, CategoryMeta> = {
  business_plan: { code: "business_plan", label: "Business plan", tone: "mint", icon: "briefcase-business", tier: "P0" },
  pkm: { code: "pkm", label: "PKM", tone: "lavender", icon: "flask-conical", tier: "P0" },
  kti_essay: { code: "kti_essay", label: "Karya tulis", tone: "lavender", icon: "file-text", tier: "P0" },
  olympiad: { code: "olympiad", label: "Olimpiade", tone: "sky", icon: "atom", tier: "P0" },
  hackathon: { code: "hackathon", label: "Hackathon", tone: "sky", icon: "code-xml", tier: "P1" },
  poster: { code: "poster", label: "Poster", tone: "apricot", icon: "image", tier: "P0" },
  design: { code: "design", label: "Desain", tone: "apricot", icon: "pen-tool", tier: "P1" },
  photo: { code: "photo", label: "Fotografi", tone: "apricot", icon: "camera", tier: "P1" },
  creative_writing: { code: "creative_writing", label: "Menulis kreatif", tone: "rose", icon: "feather", tier: "P0" },
  video: { code: "video", label: "Video", tone: "rose", icon: "clapperboard", tier: "P1" },
  speech: { code: "speech", label: "Pidato", tone: "lemon", icon: "mic", tier: "P1" },
  other: { code: "other", label: "Lainnya", tone: "lemon", icon: "sparkles", tier: "P2" },
};

export function categoryMeta(code: string | null | undefined): CategoryMeta {
  return (code && (CATEGORIES as Record<string, CategoryMeta>)[code]) || CATEGORIES.other;
}

const MENTOR_TONES: GemTone[] = ["lavender", "apricot", "sky", "rose", "mint"];

/** Deterministic tone per mentor so the same mentor always has the same colour. */
export function mentorTone(mentorId: string): GemTone {
  let h = 0;
  for (let i = 0; i < mentorId.length; i++) h = (h * 31 + mentorId.charCodeAt(i)) >>> 0;
  return MENTOR_TONES[h % MENTOR_TONES.length];
}

/** Hex of each tone's "bot" colour: fallback poster tint when competitions.tint_hex is empty. */
export const TONE_TINT: Record<GemTone, string> = {
  mint: "#B4F08F",
  lavender: "#C4B0FF",
  apricot: "#FFCB85",
  sky: "#A7D3FF",
  rose: "#FFB3C6",
  lemon: "#FFE87A",
};
