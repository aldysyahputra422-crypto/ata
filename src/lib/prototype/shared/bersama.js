/* Store demo bersama (kunci localStorage `ata-bersama`). Semua tab di app.html adalah iframe dari origin yang sama,
   jadi mereka berbagi localStorage; event `storage` memberi tahu iframe LAIN saat satu iframe menulis.
   Aturan isinya ada di logic/bersama.js (diuji). Berkas ini hanya baca, tulis, dan dengar. */
import { LOMBA } from '../lomba/data/lomba.js';
import { usulkanLangkah, tambahHari } from '../lomba/logic/peta.js';
import {
  KUNCI_BERSAMA, tanggalLokal, pesanSlotLebih, slotContoh, awalBersama, rapikanBersama, lengkapiPeta, ringkasSlot, daftarTugas, batasSlot, aturStatusTugas, aturIzinAI,
} from './logic/bersama.js';

/* Tanggal lokal pengguna. Binding hidup: tab yang tetap terbuka melewati tengah malam ikut berganti hari,
   karena segarkanHari() dipanggil pada setiap baca dan tulis store. Pengimpor selalu membaca nilai terbaru. */
export let HARI_INI = tanggalLokal();
export function segarkanHari(kini = new Date()) {
  const t = tanggalLokal(kini);
  if (t === HARI_INI) return false;
  HARI_INI = t;
  return true;
}
const waktu = { get hariIni() { return HARI_INI; }, tambahHari };
let cache = null;
let cadangan = null; /* bila localStorage diblokir: tetap jalan di memori (tanpa sinkron antar tab) */

const katalog = (b) => (id) => LOMBA.find((l) => l.id === id) || (b.kartu[id] ? { id, ...b.kartu[id] } : null);
const dikenal = (id) => LOMBA.some((l) => l.id === id);

function mentah() {
  try {
    const s = localStorage.getItem(KUNCI_BERSAMA);
    return s === null ? undefined : JSON.parse(s);
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
  const rapi = rapikanBersama(s === undefined ? awalBersama() : s, dikenal);
  const b = lengkapiPeta(rapi, katalog(rapi), usulkanLangkah, waktu);
  if (s === undefined || JSON.stringify(s) !== JSON.stringify(b)) tulis(b); else cache = b;
  return b;
}

/* Isi awal sekali saja: hanya bila belum ada store (dipakai Lomba untuk memindahkan Slot & Peta Jalan lamanya). */
export function benihBersama(isi) {
  if (mentah() !== undefined) return bacaBersama();
  cache = null;
  tulis(rapikanBersama({ ...awalBersama(), ...isi }, dikenal));
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
  const b = lengkapiPeta(rapikanBersama(info.b, (id) => dikenal(id) || !!info.b.kartu?.[id]), katalog(info.b), usulkanLangkah, waktu);
  b.diperbarui = new Date().toISOString(); /* kapan data progres terakhir berubah (ditampilkan di Data Progres) */
  tulis(b);
  return { ...info, b };
}

export function resetBersama({ simpanPaket = false } = {}) {
  const paket = bacaBersama().paket;
  cache = null;
  tulis({ ...awalBersama(), paket: simpanPaket ? paket : 'gratis' });
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
export const batasKini = () => batasSlot(bacaBersama().paket);
const NAMA_PAKET = { gratis: 'Gratis', pro: 'Pro' };
export const namaPaketKini = () => NAMA_PAKET[bacaBersama().paket] || NAMA_PAKET.gratis;
/* batas boleh diisi dari server (app); tanpa itu memakai paket di store */
export const slotLebih = (batas = batasKini(), paket = bacaBersama().paket) =>
  pesanSlotLebih(bacaBersama().slot.length, batas, NAMA_PAKET[paket] || NAMA_PAKET.gratis);
export const adaDataContoh = () => slotContoh(bacaBersama(), dikenal).length > 0;

/* status tugas dari Hari Ini (belum/dikerjakan/selesai), tersimpan di store bersama dengan tanggal selesai */
export function ubahStatusTugas(id, status) {
  return ubahBersama((b) => aturStatusTugas(b, id, status, HARI_INI));
}

/* izin data untuk AI, per kategori (Data Progres → "Dipakai Ata") */
export function ubahIzinAI(kategori, nilai) {
  return ubahBersama((b) => aturIzinAI(b, kategori, nilai));
}
