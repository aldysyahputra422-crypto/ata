// Client access to the account API (/api/v1). Mirrors the prototype's shared/akun.js: every call resolves, never throws.
import type { Plan } from "@/lib/entitlements/config";

export type Akun = {
  signed_in: boolean;
  config: { google: boolean; payments: boolean };
  user?: { id: string; email: string | null; display_name: string | null; role: string };
  plan: {
    plan: Plan;
    status: "free" | "active" | "expired";
    sources: readonly string[];
    ends_at?: string;
    features: { activeSlots?: { limit: number | null } };
  };
};

export type Hasil<T> = { ok: true; data: T } | { ok: false; pesan: string };

const OFFLINE = "Server akun tidak bisa dihubungi. Periksa koneksi lalu coba lagi.";

async function panggil<T>(path: string, init?: RequestInit): Promise<Hasil<T>> {
  try {
    const res = await fetch(path, { cache: "no-store", credentials: "same-origin", ...init });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: body as T };
    const pesan = body?.error?.message;
    return { ok: false, pesan: typeof pesan === "string" ? pesan : OFFLINE };
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
export const ekspor = () => panggil<unknown>("/api/v1/account/export");
export const tukarKode = (code: string) =>
  panggil<{ days: number }>("/api/v1/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ code: code.trim() }),
  });

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
