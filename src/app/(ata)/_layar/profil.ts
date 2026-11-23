// Pure rules shared by onboarding (Kenalan) and the Profil form: how answers map to the account's profile fields.
import { periksaTanggalLahir, type Profil, type UbahProfil } from "./akun";
import { LANGKAH } from "@/lib/prototype/masuk/data/onboarding.js";
import { validasiLangkah } from "@/lib/prototype/masuk/logic/onboarding.js";

export type Langkah = { id: string; judul: string; tanya: string; jenis: string; wajib: boolean; kunci: string; contoh?: string; opsi?: string[] };
export type Jawaban = { nama: string; jenjang: string; /** the full birth date, YYYY-MM-DD (the step keeps the prototype's key) */ tahunLahir: string; sekolah: string; minat: string[]; target: string[]; jam: string };
// FR-AUTH-07: the age gate needs the full date, so the prototype's birth-year step asks for it.
export const SEMUA = (LANGKAH as Langkah[]).map((l) => l.kunci === "tahunLahir"
  ? { ...l, judul: "Tanggal lahirmu?", tanya: "Dipakai untuk gerbang usia: di bawah 18 tahun perlu persetujuan orang tua/wali. Isi tanggal yang sebenarnya." }
  : l);
const JAM = (SEMUA.find((l) => l.kunci === "jam")?.opsi ?? []) as string[];
// the middle of each weekly range the step offers
const JAM_ANGKA = [3, 6, 9, 12];

export const jamKeOpsi = (jam: number | null) =>
  jam === null ? "" : JAM[jam <= 4 ? 0 : jam <= 7 ? 1 : jam <= 10 ? 2 : 3] ?? "";

export const dariProfil = (p: Profil): Jawaban => ({
  nama: p.display_name ?? "", jenjang: p.jenjang ?? "", tahunLahir: p.birth_date ?? "", sekolah: p.institution ?? "",
  minat: p.interests, target: p.targets, jam: jamKeOpsi(p.weekly_hours),
});

/** Where onboarding resumes: the first required answer still missing, else the first optional step left empty. */
export function langkahAwal(d: Jawaban): number {
  const wajib = SEMUA.findIndex((l) => l.wajib && periksa(l, d));
  if (wajib >= 0) return wajib;
  const kosong = SEMUA.findIndex((l) => !l.wajib && [d[l.kunci as keyof Jawaban]].flat().join("") === "");
  return kosong < 0 ? SEMUA.length - 1 : kosong;
}

/** The one profile field a step saves. `jamTersimpan` keeps exact saved hours when their range is left as it was. */
export function ubahLangkah(kunci: string, d: Jawaban, jamTersimpan: number | null = null): UbahProfil {
  switch (kunci) {
    case "nama": return { display_name: d.nama.trim() };
    case "jenjang": return { jenjang: d.jenjang };
    case "tahunLahir": return { birth_date: d.tahunLahir };
    case "sekolah": return { institution: d.sekolah.trim() || null };
    case "minat": return { interests: d.minat };
    case "target": return { targets: d.target };
    default:
      if (d.jam && jamKeOpsi(jamTersimpan) === d.jam) return { weekly_hours: jamTersimpan };
      return { weekly_hours: JAM.includes(d.jam) ? JAM_ANGKA[JAM.indexOf(d.jam)] : null };
  }
}

/** The prototype's step rules; the birth date follows the server's rule instead of the prototype's year. */
export function periksa(l: Langkah, d: Jawaban): string | null {
  if (l.kunci === "tahunLahir") return periksaTanggalLahir(d.tahunLahir);
  const hasil = validasiLangkah(l, d) as { ok: boolean; galat: Record<string, string> };
  return hasil.ok ? null : Object.values(hasil.galat)[0];
}

export type Isian = {
  display_name: string; jenjang: string; birth_date: string; institution: string; major: string; timezone: string;
  interests: string[]; targets: string[]; skills: string; goals_text: string; weekly_hours: string;
};
export const keIsian = (p: Profil): Isian => ({
  display_name: p.display_name ?? "", jenjang: p.jenjang ?? "", birth_date: p.birth_date ?? "",
  institution: p.institution ?? "", major: p.major ?? "", timezone: p.timezone ?? "Asia/Jakarta", interests: p.interests, targets: p.targets,
  skills: p.skills.join(", "), goals_text: p.goals_text ?? "", weekly_hours: p.weekly_hours === null ? "" : String(p.weekly_hours),
});
const daftar = (teks: string) => [...new Set(teks.split(",").map((x) => x.trim()).filter(Boolean))];
const sama = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Only the fields that differ from the saved profile, in the shape PATCH /api/v1/profile takes. */
export function selisih(p: Profil, f: Isian): UbahProfil {
  const baru: UbahProfil = {
    display_name: f.display_name.trim() || null, jenjang: f.jenjang || null, birth_date: f.birth_date || null,
    institution: f.institution.trim() || null, major: f.major.trim() || null, timezone: f.timezone || null, interests: f.interests,
    targets: f.targets, skills: daftar(f.skills), goals_text: f.goals_text.trim() || null,
    weekly_hours: f.weekly_hours === "" ? null : Number(f.weekly_hours),
  };
  // an account that never chose a timezone keeps none until it picks one other than the default shown
  if (p.timezone === null && baru.timezone === "Asia/Jakarta") delete baru.timezone;
  return Object.fromEntries(Object.entries(baru).filter(([k, v]) => !sama(v, p[k as keyof Profil]))) as UbahProfil;
}

export function periksaIsian(f: Isian, tersimpan?: Profil): { bidang: string; pesan: string } | null {
  const nama = f.display_name.trim();
  if (nama.length < 2 || nama.length > 30) return { bidang: "display_name", pesan: "Nama panggilan dua sampai tiga puluh huruf." };
  if (!f.jenjang) return { bidang: "jenjang", pesan: "Pilih jenjangmu dulu." };
  // an account from before the full date was asked for can still save its other fields
  const lahir = f.birth_date === "" && tersimpan?.birth_date === null ? null : periksaTanggalLahir(f.birth_date);
  if (lahir) return { bidang: "birth_date", pesan: lahir };
  const jam = Number(f.weekly_hours);
  if (f.weekly_hours !== "" && (!Number.isInteger(jam) || jam < 0 || jam > 80)) return { bidang: "weekly_hours", pesan: "Jam belajar antara 0 dan 80 per minggu." };
  const mampu = daftar(f.skills);
  if (mampu.length > 10 || mampu.some((x) => x.length > 40)) return { bidang: "skills", pesan: "Maksimal sepuluh kemampuan, masing-masing empat puluh huruf." };
  return null;
}
