// Typed boundary to the prototype's device-local store (localStorage "ata-bersama") and its pure rules.
// Signed out, Slot, Peta Jalan and task data are the device's. Signed in, they are the account's, read from
// /api/v1/progress; the device store is not consulted and XP, level and streak are the server's (FR-PRG-03).
import { cincin, tugasTelat } from "@/lib/prototype/masuk/logic/progres.js";
import { aktivitasHarian, hitungXP, prioritasTugas, ATURAN_XP, XP } from "@/lib/prototype/shared/logic/xp.js";
import { bacaBersama, batasKini, dengarBersama, resetBersama, slotRingkas, tugasBersama, ubahStatusTugas, slotLebih, adaDataContoh, segarkanHari, aturZonaHari, HARI_INI } from "@/lib/prototype/shared/bersama.js";
import { saranBerikut } from "@/lib/prototype/app/logic/saran.js";
import { LOMBA_NYATA } from "@/lib/prototype/lomba/data/lomba.js";
import { isiKertas } from "@/lib/prototype/shared/folder.js";
import { PROFIL } from "@/lib/prototype/tanya/data/profil.js";
import { daftarTugas, pesanSlotLebih, ringkasSlot } from "@/lib/prototype/shared/logic/bersama.js";
import { LOMBA } from "@/lib/prototype/lomba/data/lomba.js";
import { denganSisaHari, sisaHari } from "@/lib/prototype/shared/logic/tenggat.js";
import { lupakanDasar } from "../lomba/sinkron";

export type StatusTugas = "belum" | "dikerjakan" | "selesai";
export type Tugas = { id: string; judul: string; tenggat: string; selesai: boolean; selesaiPada?: string; status: StatusTugas; slotNama: string };
export type Cincin = { label: string; persen: number; selesai: number; wajib: number; sisaHari: number | null; lewat: boolean };
export type Slot = { id: string; nama: string; disetujui: boolean; tenggat: string | null; gambar?: string; c: Cincin; kertas: Kertas };
export type Kertas = { judul: string; isi: string; meta: string; telat: boolean };
export type Saran = {
  id: string;
  jenis: string;
  judul: string;
  alasan: string;
  label: string;
  prioritas?: string;
  tugasId?: string;
  status?: StatusTugas;
  aksi: { tab: string; rute?: string };
};
export type Progres = { xp: number; level: number; xpLevel: number; streak: number; pencapaian: { nama: string; syarat: string; dapat: boolean }[] };
export type Prioritas = { tingkat: string; label: string };

export type DataHariIni = {
  hariIni: string;
  namaDemo: string;
  tugas: Tugas[];
  slot: Slot[];
  telat: number;
  saran: Saran[];
  progres: Progres;
  /** finished steps per day (YYYY-MM-DD) */
  aktivitas: Record<string, number>;
  batasLokal: number;
  lebih: SlotLebih | null;
  contoh: boolean;
};
export type SlotLebih = { jumlah: number; batas: number; ringkas: string; rinci: string; arahan: string };
export type Paket = "gratis" | "pro";

type SlotMentah = { id: string; nama: string; disetujui: boolean; wajib: number; selesai: number; tenggat: string | null };
type Peta = Record<string, { langkah?: unknown[] }>;

/** Reads the store and derives everything the screen shows; `batas` is the server's Slot limit when known. */
export function bacaHariIni(batas?: number, paket?: Paket): DataHariIni {
  const peta = (bacaBersama().peta ?? {}) as Peta;
  // read after the store: reading it refreshes the local date (page left open across midnight)
  const hariIni: string = HARI_INI;
  const tugas = tugasBersama() as Tugas[];
  const batasLokal = batasKini() as number;
  const slot = (slotRingkas() as SlotMentah[]).map((s) => ({
    ...s,
    gambar: (LOMBA_NYATA as { id: string; gambar?: string }[]).find((l) => l.id === s.id)?.gambar,
    // the JS default parameter hides the optional tenggat/hariIni fields from inference
    c: (cincin as (a: object) => unknown)({ wajib: s.wajib, selesai: s.selesai, tenggat: s.tenggat, hariIni }) as Cincin,
    kertas: isiKertas(peta[s.id]?.langkah ?? [], s.disetujui, hariIni) as Kertas,
  }));
  return {
    hariIni,
    namaDemo: PROFIL.nama,
    tugas,
    slot,
    telat: tugasTelat(tugas, hariIni).length,
    saran: saranBerikut({ slot, tugas, lombaNyata: LOMBA_NYATA, batas: batas ?? batasLokal, hariIni }) as Saran[],
    progres: hitungXP(peta, hariIni) as Progres,
    aktivitas: aktivitasHarian(peta) as Record<string, number>,
    batasLokal,
    // server limit and plan when known, the device's own otherwise; Slots are never changed here (K-23)
    lebih: (batas === undefined ? slotLebih() : slotLebih(batas, paket)) as SlotLebih | null,
    contoh: adaDataContoh() as boolean,
  };
}

/** Days from hariIni to a task's due date; the same rule as every countdown. */
export const sisaTugas = (t: Tugas, hariIni: string) => (sisaHari(t.tenggat, hariIni) ?? 0) as number;
export const prioritas = (t: Tugas, hariIni: string) => prioritasTugas(t, hariIni) as Prioritas;

export type HasilStatus = { ditolak?: string; baruSelesai?: boolean; xp: number };
/** Persists a task status in the store and returns the XP gained, so the screen can confirm it. */
export function aturStatus(id: string, status: StatusTugas): HasilStatus {
  const sebelum = (hitungXP(bacaBersama().peta, HARI_INI) as Progres).xp;
  const r = ubahStatusTugas(id, status) as { ditolak?: string; baruSelesai?: boolean; b: { peta: Peta } };
  if (r.ditolak) return { ditolak: r.ditolak, xp: 0 };
  return { baruSelesai: r.baruSelesai, xp: (hitungXP(r.b.peta, HARI_INI) as Progres).xp - sebelum };
}

type BarisAkun = { competition_key: string; source: string; state: string; deadline_on?: string | null; card: Record<string, unknown> | null; roadmap: { langkah?: unknown[]; disetujui?: boolean } | null };
type ProgresAkun = { today: string; timezone?: string; plan: string; slot_limit: number; competitions: BarisAkun[]; summary: Progres; activity: Record<string, number> };
const STATUS_SERVER = { belum: "todo", dikerjakan: "doing", selesai: "done" } as const;

/** The same screen data as bacaHariIni, built from the account's rows only. Pure. */
export function dataAkun(r: ProgresAkun): DataHariIni {
  const hariIni = r.today;
  const aktif = r.competitions.filter((c) => c.state === "slot");
  const b = {
    slot: aktif.map((c) => c.competition_key),
    peta: Object.fromEntries(aktif.filter((c) => Array.isArray(c.roadmap?.langkah)).map((c) => [c.competition_key, c.roadmap])) as Peta,
  };
  // Countdowns: the server's stored deadline date against the account's day. Neither a days-left number saved in a
  // card nor the device's clock is read (FR-PRG-01).
  const baris = new Map(aktif.map((c) => [c.competition_key, c]));
  const padaHariAkun = (l: { id: string }, tenggatIso: unknown) => denganSisaHari({ ...l, tenggatIso }, hariIni) as { id: string };
  const cari = (id: string) => {
    const c = baris.get(id);
    const l = c?.card ? { id, ...c.card } : (LOMBA as { id: string }[]).find((x) => x.id === id);
    return c && l ? padaHariAkun(l, c.deadline_on) : null;
  };
  const lombaNyata = (LOMBA_NYATA as { id: string; tenggatIso?: string | null }[]).map((l) => padaHariAkun(l, l.tenggatIso));
  const tugas = daftarTugas(b, cari) as Tugas[];
  const slot = (ringkasSlot(b, cari, { hariIni }) as SlotMentah[]).map((s) => ({
    ...s,
    gambar: (LOMBA_NYATA as { id: string; gambar?: string }[]).find((l) => l.id === s.id)?.gambar,
    c: (cincin as (a: object) => unknown)({ wajib: s.wajib, selesai: s.selesai, tenggat: s.tenggat, hariIni }) as Cincin,
    kertas: isiKertas(b.peta[s.id]?.langkah ?? [], s.disetujui, hariIni) as Kertas,
  }));
  return {
    hariIni,
    namaDemo: "kamu",
    tugas,
    slot,
    telat: tugasTelat(tugas, hariIni).length,
    saran: saranBerikut({ slot, tugas, lombaNyata, batas: r.slot_limit, hariIni }) as Saran[],
    progres: r.summary,
    aktivitas: r.activity,
    batasLokal: r.slot_limit,
    lebih: pesanSlotLebih(slot.length, r.slot_limit, r.plan === "pro" ? "Pro" : "Gratis") as SlotLebih | null,
    contoh: false,
  };
}

/** The account's Hari Ini from the server; null when it cannot be read. */
export async function bacaHariIniAkun(): Promise<DataHariIni | null> {
  try {
    const res = await fetch("/api/v1/progress", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    const r = (await res.json()) as ProgresAkun;
    // the day now changes at the account's midnight: dengarHari reloads this data then, so "today" never goes stale
    aturZonaHari(r.timezone ?? null);
    return dataAkun(r);
  } catch {
    return null;
  }
}

/** Sets a task status on the account. The XP shown is the difference between the server's totals; nothing is computed here. */
export async function aturStatusAkun(id: string, status: StatusTugas, xpSebelum: number): Promise<HasilStatus> {
  const i = id.indexOf("/");
  try {
    const res = await fetch("/api/v1/tasks/" + encodeURIComponent(id.slice(0, i)) + "/" + encodeURIComponent(id.slice(i + 1)), {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: STATUS_SERVER[status] }),
    });
    if (res.status === 404) return { ditolak: "tidak-ada", xp: 0 };
    if (res.status === 409) return { ditolak: "belum-disetujui", xp: 0 };
    if (!res.ok) return { ditolak: "gagal", xp: 0 };
    const body = (await res.json()) as { changed?: boolean; summary?: { xp?: number } };
    return { baruSelesai: body.changed === true && status === "selesai", xp: (body.summary?.xp ?? xpSebelum) - xpSebelum };
  } catch {
    return { ditolak: "gagal", xp: 0 };
  }
}

export const dengar = (cb: () => void): (() => void) => dengarBersama(cb);
/** Calls back when the calendar day changes while the page stays open: the device's day, or the account's once its zone is known. */
export function dengarHari(cb: () => void): () => void {
  const periksa = () => {
    if (segarkanHari()) cb();
  };
  const tampak = () => {
    if (!document.hidden) periksa();
  };
  const jeda = window.setInterval(periksa, 30_000);
  document.addEventListener("visibilitychange", tampak);
  window.addEventListener("focus", periksa);
  return () => {
    window.clearInterval(jeda);
    document.removeEventListener("visibilitychange", tampak);
    window.removeEventListener("focus", periksa);
  };
}
export const resetDemo = () => {
  resetBersama();
  lupakanDasar(); // the account's rows, not the sample data, win at the next Lomba sync
};
export { ATURAN_XP, XP };
