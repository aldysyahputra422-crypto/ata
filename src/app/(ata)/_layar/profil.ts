// Pure rules shared by onboarding (Kenalan) and the Profil form: how answers map to the account's profile fields.
import { TAHUN_LAHIR_MIN, tahunLahirMaks, type Profil, type UbahProfil } from "./akun";
import { LANGKAH } from "@/lib/prototype/masuk/data/onboarding.js";
import { validasiLangkah } from "@/lib/prototype/masuk/logic/onboarding.js";

export type Langkah = { id: string; judul: string; tanya: string; jenis: string; wajib: boolean; kunci: string; contoh?: string; opsi?: string[] };
export type Jawaban = { nama: string; jenjang: string; tahunLahir: number | ""; sekolah: string; minat: string[]; target: string[]; jam: string };
export const SEMUA = LANGKAH as Langkah[];
const JAM = (SEMUA.find((l) => l.kunci === "jam")?.opsi ?? []) as string[];
// the middle of each weekly range the step offers
const JAM_ANGKA = [3, 6, 9, 12];

export const jamKeOpsi = (jam: number | null) =>
  jam === null ? "" : JAM[jam <= 4 ? 0 : jam <= 7 ? 1 : jam <= 10 ? 2 : 3] ?? "";

export const dariProfil = (p: Profil): Jawaban => ({
  nama: p.display_name ?? "", jenjang: p.jenjang ?? "", tahunLahir: p.birth_year ?? "", sekolah: p.institution ?? "",
  minat: p.interests, target: p.targets, jam: jamKeOpsi(p.weekly_hours),
});

/** The one profile field a step saves. */
export function ubahLangkah(kunci: string, d: Jawaban): UbahProfil {
  switch (kunci) {
    case "nama": return { display_name: d.nama.trim() };
    case "jenjang": return { jenjang: d.jenjang };
    case "tahunLahir": return { birth_year: Number(d.tahunLahir) };
    case "sekolah": return { institution: d.sekolah.trim() || null };
    case "minat": return { interests: d.minat };
    case "target": return { targets: d.target };
    default: return { weekly_hours: JAM.includes(d.jam) ? JAM_ANGKA[JAM.indexOf(d.jam)] : null };
  }
}

/** The prototype's step rules; the birth year follows the server's range instead of the prototype's fixed years. */
export function periksa(l: Langkah, d: Jawaban): string | null {
  if (l.kunci === "tahunLahir") {
    const t = Number(d.tahunLahir);
    return Number.isInteger(t) && t >= TAHUN_LAHIR_MIN && t <= tahunLahirMaks()
      ? null : `Tahun lahir harus antara ${TAHUN_LAHIR_MIN} dan ${tahunLahirMaks()}.`;
  }
  const hasil = validasiLangkah(l, d) as { ok: boolean; galat: Record<string, string> };
  return hasil.ok ? null : Object.values(hasil.galat)[0];
}

export type Isian = {
  display_name: string; jenjang: string; birth_year: string; institution: string; major: string; timezone: string;
  interests: string[]; targets: string[]; skills: string; goals_text: string; weekly_hours: string;
};
export const keIsian = (p: Profil): Isian => ({
  display_name: p.display_name ?? "", jenjang: p.jenjang ?? "", birth_year: p.birth_year === null ? "" : String(p.birth_year),
  institution: p.institution ?? "", major: p.major ?? "", timezone: p.timezone ?? "Asia/Jakarta", interests: p.interests, targets: p.targets,
  skills: p.skills.join(", "), goals_text: p.goals_text ?? "", weekly_hours: p.weekly_hours === null ? "" : String(p.weekly_hours),
});
const daftar = (teks: string) => [...new Set(teks.split(",").map((x) => x.trim()).filter(Boolean))];
const sama = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Only the fields that differ from the saved profile, in the shape PATCH /api/v1/profile takes. */
export function selisih(p: Profil, f: Isian): UbahProfil {
  const baru: UbahProfil = {
    display_name: f.display_name.trim() || null, jenjang: f.jenjang || null, birth_year: f.birth_year === "" ? null : Number(f.birth_year),
    institution: f.institution.trim() || null, major: f.major.trim() || null, timezone: f.timezone || null, interests: f.interests,
    targets: f.targets, skills: daftar(f.skills), goals_text: f.goals_text.trim() || null,
    weekly_hours: f.weekly_hours === "" ? null : Number(f.weekly_hours),
  };
  // an account that never chose a timezone keeps none until it picks one other than the default shown
  if (p.timezone === null && baru.timezone === "Asia/Jakarta") delete baru.timezone;
  return Object.fromEntries(Object.entries(baru).filter(([k, v]) => !sama(v, p[k as keyof Profil]))) as UbahProfil;
}

export function periksaIsian(f: Isian): { bidang: string; pesan: string } | null {
  const nama = f.display_name.trim();
  if (nama.length < 2 || nama.length > 30) return { bidang: "display_name", pesan: "Nama panggilan dua sampai tiga puluh huruf." };
  if (!f.jenjang) return { bidang: "jenjang", pesan: "Pilih jenjangmu dulu." };
  const tahun = Number(f.birth_year);
  if (f.birth_year === "" || !Number.isInteger(tahun) || tahun < TAHUN_LAHIR_MIN || tahun > tahunLahirMaks()) {
    return { bidang: "birth_year", pesan: `Tahun lahir harus antara ${TAHUN_LAHIR_MIN} dan ${tahunLahirMaks()}.` };
  }
  const jam = Number(f.weekly_hours);
  if (f.weekly_hours !== "" && (!Number.isInteger(jam) || jam < 0 || jam > 80)) return { bidang: "weekly_hours", pesan: "Jam belajar antara 0 dan 80 per minggu." };
  const mampu = daftar(f.skills);
  if (mampu.length > 10 || mampu.some((x) => x.length > 40)) return { bidang: "skills", pesan: "Maksimal sepuluh kemampuan, masing-masing empat puluh huruf." };
  return null;
}
