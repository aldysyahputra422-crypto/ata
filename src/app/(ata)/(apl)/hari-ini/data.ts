// Typed boundary to the prototype's device-local store (localStorage "ata-bersama") and its pure rules.
// Slot, Peta Jalan and task data stay on the device until the per-account Slot tables exist (docs/ASSUMPTIONS.md).
import { cincin, tugasTelat } from "@/lib/prototype/masuk/logic/progres.js";
import { hitungXP, prioritasTugas, ATURAN_XP, XP } from "@/lib/prototype/shared/logic/xp.js";
import { bacaBersama, batasKini, dengarBersama, resetBersama, slotRingkas, tugasBersama, ubahStatusTugas, HARI_INI } from "@/lib/prototype/shared/bersama.js";
import { saranBerikut } from "@/lib/prototype/app/logic/saran.js";
import { LOMBA_NYATA } from "@/lib/prototype/lomba/data/lomba.js";
import { isiKertas } from "@/lib/prototype/shared/folder.js";
import { PROFIL } from "@/lib/prototype/tanya/data/profil.js";

export type StatusTugas = "belum" | "dikerjakan" | "selesai";
export type Tugas = { id: string; judul: string; tenggat: string; selesai: boolean; selesaiPada?: string; status: StatusTugas; slotNama: string };
export type Cincin = { label: string; persen: number; selesai: number; wajib: number; sisaHari: number | null };
export type Slot = { id: string; nama: string; disetujui: boolean; gambar?: string; c: Cincin; kertas: Kertas };
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
  batasLokal: number;
};

type SlotMentah = { id: string; nama: string; disetujui: boolean; wajib: number; selesai: number; tenggat: string };
type Peta = Record<string, { langkah?: unknown[] }>;

/** Reads the store and derives everything the screen shows; `batas` is the server's Slot limit when known. */
export function bacaHariIni(batas?: number): DataHariIni {
  const hariIni: string = HARI_INI;
  const peta = (bacaBersama().peta ?? {}) as Peta;
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
    batasLokal,
  };
}

export const prioritas = (t: Tugas, hariIni: string) => prioritasTugas(t, hariIni) as Prioritas;

export type HasilStatus = { ditolak?: string; baruSelesai?: boolean; xp: number };
/** Persists a task status in the store and returns the XP gained, so the screen can confirm it. */
export function aturStatus(id: string, status: StatusTugas): HasilStatus {
  const sebelum = (hitungXP(bacaBersama().peta, HARI_INI) as Progres).xp;
  const r = ubahStatusTugas(id, status) as { ditolak?: string; baruSelesai?: boolean; b: { peta: Peta } };
  if (r.ditolak) return { ditolak: r.ditolak, xp: 0 };
  return { baruSelesai: r.baruSelesai, xp: (hitungXP(r.b.peta, HARI_INI) as Progres).xp - sebelum };
}

export const dengar = (cb: () => void): (() => void) => dengarBersama(cb);
export const resetDemo = () => {
  resetBersama();
};
export { ATURAN_XP, XP };
