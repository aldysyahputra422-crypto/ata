/* Store demo bersama (kunci localStorage `ata-bersama`). Semua tab di app.html adalah iframe dari origin yang sama,
   jadi mereka berbagi localStorage; event `storage` memberi tahu iframe LAIN saat satu iframe menulis.
   Aturan isinya ada di logic/bersama.js (diuji). Berkas ini hanya baca, tulis, dan dengar. */
import { LOMBA } from '../lomba/data/lomba.js';
import { usulkanLangkah, tambahHari } from '../lomba/logic/peta.js';
import { denganSisaHari, tanggalSah } from './logic/tenggat.js';
import { HARI_INI, segarkanHari } from './hari.js';
import {
  KUNCI_BERSAMA, pesanSlotLebih, slotContoh, awalBersama, rapikanBersama, lengkapiPeta, ringkasSlot, daftarTugas, batasSlot, aturStatusTugas, aturIzinAI,
} from './logic/bersama.js';

/* "Hari ini" (binding hidup) ada di hari.js: tanggal lokal perangkat, atau tanggal di zona waktu akun saat masuk. */
export { HARI_INI, segarkanHari, aturZonaHari } from './hari.js';
const waktu = { get hariIni() { return HARI_INI; }, tambahHari };
/* app only: the stores hold one account's copy (ata-lingkup, see _layar/lingkup.ts). No sample Slot or sample progress then. */
const akunAktif = () => { try { const l = localStorage.getItem('ata-lingkup'); return !!l && l !== 'lokal'; } catch (e) { return false; } };
const awal = () => (akunAktif() ? { ...awalBersama(), slot: [] } : awalBersama());
let cache = null;
let cadangan = null; /* bila localStorage diblokir: tetap jalan di memori (tanpa sinkron antar tab) */

/* a card only stores the deadline DATE; its days left are counted from that date at every read, never saved */
const katalog = (b) => (id) => LOMBA.find((l) => l.id === id) || (b.kartu[id] ? denganSisaHari({ id, ...b.kartu[id] }, HARI_INI) : null);
const dikenal = (id) => LOMBA.some((l) => l.id === id);

/* Cards saved before deadlines were stored as dates only hold a days-left number, which is stale by now.
   The date the user typed is still in Lomba's own store: take it from there, otherwise the card has no deadline. */
function pulihkanTenggat(s) {
  if (!s || typeof s !== 'object' || !s.kartu || typeof s.kartu !== 'object') return s;
  const tanpa = Object.entries(s.kartu).filter(([, k]) => k && typeof k === 'object' && !tanggalSah(k.tenggatIso) && Number.isFinite(k.hariLagi));
  if (!tanpa.length) return s;
  let unggahan = [];
  try { unggahan = JSON.parse(localStorage.getItem('ata-demo-lomba') || 'null')?.unggahan || []; } catch (e) { /* no date to recover */ }
  const kartu = { ...s.kartu };
  for (const [id, k] of tanpa) kartu[id] = { ...k, tenggatIso: tanggalSah(unggahan.find((u) => u && u.id === id)?.tenggatIso) };
  return { ...s, kartu };
}

function mentah() {
  try {
    const s = localStorage.getItem(KUNCI_BERSAMA);
    return s === null ? undefined : pulihkanTenggat(JSON.parse(s));
  } catch (e) {
    return cadangan ?? undefined;
  }
}

function tulis(b) {
  cache = b;
  cadangan = b;
  try { localStorage.setItem(KUNCI_BERSAMA, JSON.stringify(b)); } catch (e) { /* demo tetap jalan */ }
}

/* Store saat ini (sudah dirapikan, Peta Jalan tiap Slot sudah ada). Jangan diubah langsung: pakai ubahBersama(). */
export function bacaBersama() {
  segarkanHari();
  if (cache) return cache;
  const s = mentah();
  const rapi = rapikanBersama(s === undefined ? awal() : s, dikenal);
  const b = lengkapiPeta(rapi, katalog(rapi), usulkanLangkah, waktu, !akunAktif());
  if (s === undefined || JSON.stringify(s) !== JSON.stringify(b)) tulis(b); else cache = b;
  return b;
}

/* Isi awal sekali saja: hanya bila belum ada store (dipakai Lomba untuk memindahkan Slot & Peta Jalan lamanya). */
export function benihBersama(isi) {
  if (mentah() !== undefined) return bacaBersama();
  cache = null;
  tulis(rapikanBersama({ ...awal(), ...isi }, dikenal));
  cache = null;
  return bacaBersama();
}

/* fn menerima store dan mengembalikan store baru, ATAU hasil fungsi logic { b, ditolak?, … }.
   Selalu mengembalikan { b, … }; bila store tidak berubah (mis. ditolak), tidak ada yang ditulis. */
export function ubahBersama(fn) {
  const kini = bacaBersama();
  const r = fn(kini);
  const info = r && r.v === undefined ? r : { b: r };
  if (!info.b || info.b === kini) return { ...info, b: kini };
  const b = lengkapiPeta(rapikanBersama(info.b, (id) => dikenal(id) || !!info.b.kartu?.[id]), katalog(info.b), usulkanLangkah, waktu, !akunAktif());
  b.diperbarui = new Date().toISOString(); /* kapan data progres terakhir berubah (ditampilkan di Data Progres) */
  tulis(b);
  return { ...info, b };
}

export function resetBersama({ simpanPaket = false } = {}) {
  const paket = bacaBersama().paket;
  cache = null;
  tulis({ ...awal(), paket: simpanPaket ? paket : 'gratis' });
  cache = null;
  return bacaBersama();
}

/* Dipanggil saat iframe LAIN mengubah store (atau shell menghapusnya saat reset). */
export function dengarBersama(cb) {
  const h = (e) => {
    if (e.key !== KUNCI_BERSAMA && e.key !== null) return;
    cache = null;
    cb(bacaBersama());
  };
  window.addEventListener('storage', h);
  return () => window.removeEventListener('storage', h);
}

/* Turunan siap pakai untuk layar */
export const cariLomba = (id) => katalog(bacaBersama())(id);
export const slotRingkas = () => { const b = bacaBersama(); return ringkasSlot(b, katalog(b), waktu); };
export const tugasBersama = () => { const b = bacaBersama(); return daftarTugas(b, katalog(b)); };
/* app only: the server's activeSlots limit for this account wins over the built-in table (null: signed out or unknown) */
let batasServer = null;
export const aturBatasServer = (n) => { batasServer = Number.isInteger(n) && n >= 0 ? n : null; };
export const batasKini = () => batasServer ?? batasSlot(bacaBersama().paket);
const NAMA_PAKET = { gratis: 'Gratis', pro: 'Pro' };
export const namaPaketKini = () => NAMA_PAKET[bacaBersama().paket] || NAMA_PAKET.gratis;
/* batas boleh diisi dari server (app); tanpa itu memakai paket di store */
export const slotLebih = (batas = batasKini(), paket = bacaBersama().paket) =>
  pesanSlotLebih(bacaBersama().slot.length, batas, NAMA_PAKET[paket] || NAMA_PAKET.gratis);
export const adaDataContoh = () => !akunAktif() && slotContoh(bacaBersama(), dikenal).length > 0;

/* status tugas dari Hari Ini (belum/dikerjakan/selesai), tersimpan di store bersama dengan tanggal selesai */
export function ubahStatusTugas(id, status) {
  return ubahBersama((b) => aturStatusTugas(b, id, status, HARI_INI));
}

/* izin data untuk AI, per kategori (Data Progres → "Dipakai Ata") */
export function ubahIzinAI(kategori, nilai) {
  return ubahBersama((b) => aturIzinAI(b, kategori, nilai));
}
