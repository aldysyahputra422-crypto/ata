// Client access to the account API (/api/v1). Mirrors the prototype's shared/akun.js: every call resolves, never throws.
import type { Plan } from "@/lib/entitlements/config";
import { KUNCI_BERSAMA } from "@/lib/prototype/shared/logic/bersama.js";

export type Akun = {
  signed_in: boolean;
  config: { google: boolean; payments: boolean };
  user?: { id: string; email: string | null; display_name: string | null; role: string };
  /** active-Slot limit per plan, from the server's entitlement config */
  slot_limits: { free: number; pro: number };
  plan: {
    plan: Plan;
    status: "free" | "active" | "expired";
    sources: readonly string[];
    ends_at?: string;
    features: { activeSlots?: { limit: number | null } };
  };
};

export type Hasil<T> = { ok: true; data: T } | { ok: false; pesan: string; status?: number; bidang?: string; kode?: string };

const OFFLINE = "Server akun tidak bisa dihubungi. Periksa koneksi lalu coba lagi.";

async function panggil<T>(path: string, init?: RequestInit): Promise<Hasil<T>> {
  try {
    const res = await fetch(path, { cache: "no-store", credentials: "same-origin", ...init });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: body as T };
    const pesan = body?.error?.message;
    const bidang = body?.error?.field;
    const kode = body?.error?.code;
    return {
      ok: false, pesan: typeof pesan === "string" ? pesan : OFFLINE, status: res.status,
      ...(typeof bidang === "string" ? { bidang } : {}), ...(typeof kode === "string" ? { kode } : {}),
    };
  } catch {
    return { ok: false, pesan: OFFLINE };
  }
}

export const bacaAkun = () => panggil<Akun>("/api/v1/me");
export const keluar = () => panggil<null>("/api/v1/auth/logout", { method: "POST" });
// The sheet's explicit confirm button is the confirmation the DELETE handler asks for.
export const hapusAkun = () =>
  panggil<null>("/api/v1/account", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm: "HAPUS" }),
  });
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

/** The account's profile as /api/v1/profile returns it (FR-AUTH-04). The server is the only copy. */
export type Profil = {
  display_name: string | null;
  jenjang: string | null;
  /** YYYY-MM-DD. Accounts from before FR-AUTH-07 may only have the year until they complete the date. */
  birth_date: string | null;
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
export type UbahProfil = Partial<Omit<Profil, "onboarding_done" | "updated_at" | "birth_year">>;
export const bacaProfil = () => panggil<{ profile: Profil }>("/api/v1/profile");
export const simpanProfil = (ubah: UbahProfil) => panggil<{ profile: Profil }>("/api/v1/profile", json("PATCH", ubah));
export const selesaikanOnboarding = () => panggil<{ done: true }>("/api/v1/profile/onboarding/complete", json("POST"));

/** Data categories AI features may read (FR-AUTH-09). All off until the account turns one on. */
export const KATEGORI_IZIN = [
  { id: "profil", nama: "Profil", isi: "Nama panggilan, jenjang, dan sekolah atau kampus." },
  { id: "akademik", nama: "Akademik", isi: "Jurusan, minat lomba, kemampuan, dan target." },
  { id: "lomba", nama: "Lomba", isi: "Lomba yang kamu simpan dan Slot aktif." },
  { id: "tugas", nama: "Tugas", isi: "Langkah Peta Jalan dan statusnya." },
  { id: "progres", nama: "Progres", isi: "XP, level, streak, dan pencapaian." },
  { id: "evaluasi", nama: "Evaluasi", isi: "Hasil simulasi juri dan catatan revisi." },
  { id: "ingatan", nama: "Ingatan Ata", isi: "Hal yang Ata ingat dari percakapan." },
  { id: "dokumen", nama: "Dokumen", isi: "Berkas karya yang kamu unggah." },
] as const;
export type Izin = Record<(typeof KATEGORI_IZIN)[number]["id"], boolean>;
export const bacaIzin = () => panggil<{ categories: Izin }>("/api/v1/permissions");
export const ubahIzin = (category: keyof Izin, allowed: boolean) =>
  panggil<{ categories: Izin }>("/api/v1/permissions", json("PATCH", { category, allowed }));

/** Guardian consent of an account under 18 (FR-AUTH-07), as /api/v1/consent returns it. */
export type Persetujuan = {
  status: "age_unknown" | "not_required" | "none" | "pending" | "expired" | "verified" | "declined" | "revoked";
  /** pending: under 18 without verified consent. Every AI permission is off and only the request flow is open. */
  account_state: "age_unknown" | "not_required" | "pending" | "granted";
  required: boolean;
  /** not_configured: no email provider is set up on this deployment, so no request can be sent */
  delivery: "configured" | "not_configured";
  birth_date: string | null;
  birth_date_known: boolean;
  /** how many more times the account may correct its birth date */
  corrections_left: number;
  /** an open correction waiting for the guardian's confirmation */
  correction: { birth_date: string | null; guardian_name: string | null; contact_masked: string | null; expires_at: string | null } | null;
  /** set when a guardian who declined asked for the account to be deleted */
  deletion_due_at: string | null;
  guardian_name: string | null;
  contact_masked: string | null;
  version: string | null;
  scope: string[];
  expires_at: string | null;
  verified_at: string | null;
  revoked_by: string | null;
};
export const bacaPersetujuan = () => panggil<{ consent: Persetujuan }>("/api/v1/consent");
export const mintaPersetujuan = (guardian_name: string, guardian_email: string) =>
  panggil<{ status: "pending" }>("/api/v1/consent/request", json("POST", { guardian_name, guardian_email }));
export const cabutPersetujuan = () => panggil<{ status: "revoked" }>("/api/v1/consent/revoke", json("POST"));
/** A birth date correction from under 18 to adult: it applies only when the guardian confirms it by email. */
export const mintaKoreksiLahir = (birth_date: string, guardian_name: string, guardian_email: string) =>
  panggil<{ status: "pending" }>("/api/v1/consent/birth-date", json("POST", { birth_date, guardian_name, guardian_email }));
export const batalKoreksiLahir = () => panggil<{ status: "cancelled" }>("/api/v1/consent/birth-date", json("DELETE"));

/** What a guardian's link opens (no account involved): the token is the only credential. */
export type TautanWali = {
  kind: "confirm" | "withdraw" | "correction";
  /** kind correction: the date the guardian is asked to confirm */
  birth_date: string | null;
  student_name: string | null;
  guardian_name: string | null;
  version: string | null;
  scope: string[];
  expires_at: string | null;
  verified_at: string | null;
};
export const lihatTautanWali = (token: string) => panggil<TautanWali>("/api/v1/consent/guardian/lookup", json("POST", { token }));
export const jawabWali = (token: string, jawaban: { approve: true; verifier_name: string; is_guardian: true } | { approve: false; request_deletion?: boolean }) =>
  panggil<{ status: "verified"; withdraw_token: string } | { status: "corrected" } | { status: "declined"; deletion_requested?: boolean }>(
    "/api/v1/consent/guardian/confirm", json("POST", { token, ...jawaban }));
export const tarikWali = (token: string) => panggil<{ status: "revoked" }>("/api/v1/consent/guardian/withdraw", json("POST", { token }));

export const TAHUN_LAHIR_MIN = 1940;
export const tahunLahirMaks = () => new Date().getFullYear() - 5;
/** Bounds of the birth date input, YYYY-MM-DD. */
export const TANGGAL_LAHIR_MIN = `${TAHUN_LAHIR_MIN}-01-01`;
export const tanggalLahirMaks = () => `${tahunLahirMaks()}-12-31`;
/** null when the text is a real calendar date inside the bounds. */
export function periksaTanggalLahir(teks: string): string | null {
  const t = new Date(`${teks}T00:00:00Z`);
  const sah = /^\d{4}-\d{2}-\d{2}$/.test(teks) && !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === teks;
  return sah && teks >= TANGGAL_LAHIR_MIN && teks <= tanggalLahirMaks()
    ? null : `Isi tanggal lahir lengkap, antara tahun ${TAHUN_LAHIR_MIN} dan ${tahunLahirMaks()}.`;
}
export const tanggalLahir = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const ekspor = () => panggil<unknown>("/api/v1/account/export");
export const tukarKode = (code: string) =>
  panggil<{ days: number }>("/api/v1/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ code: code.trim() }),
  });

/** Active Slots of the signed-in account, counted from its rows on the server. "gagal" when the server cannot say. */
export async function slotTerpakai(): Promise<number | "gagal"> {
  const r = await panggil<{ items?: { state?: string }[] }>("/api/v1/user-competitions");
  if (!r.ok || !Array.isArray(r.data?.items)) return "gagal";
  return r.data.items.filter((b) => b.state === "slot").length;
}

/** Active Slots kept on this device (signed out only). Read-only: never seeds the demo store. */
export function slotPerangkat(): number {
  try {
    const b = JSON.parse(localStorage.getItem(KUNCI_BERSAMA) ?? "null") as { slot?: unknown } | null;
    return Array.isArray(b?.slot) ? b.slot.length : 0;
  } catch {
    return 0;
  }
}

export const tanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

// "Use without an account" marker, kept on this device only (prototype: state.sesi.metode === 'lokal').
const KUNCI_LOKAL = "ata.sesi-lokal";
export const sesiLokal = () => {
  try {
    return localStorage.getItem(KUNCI_LOKAL) === "1";
  } catch {
    return false;
  }
};
export const simpanSesiLokal = (aktif: boolean) => {
  try {
    if (aktif) localStorage.setItem(KUNCI_LOKAL, "1");
    else localStorage.removeItem(KUNCI_LOKAL);
  } catch {
    /* storage unavailable: the choice simply is not remembered */
  }
};
