/* Demo state for the Lomba prototype, kept per viewer in localStorage (try/catch: storage may be blocked).
   Slot aktif, Peta Jalan, dan paket TIDAK disimpan di sini lagi, melainkan di store bersama (`shared/bersama.js`,
   kunci `ata-bersama`), supaya Hari Ini, Progres, Tanya, dan Profil melihat angka yang sama. */
import { LOMBA, PROFIL } from './data/lomba.js';
import { buatDeck, samakanSlot, sisipkanBaru } from './logic/radar.js';
import { masihBuka } from './logic/label.js';
import { rapikan } from './logic/simpanan.js';
import { bersihkanSimulasiLama, hariLagiDari } from './logic/manual.js';
import { bacaBersama, benihBersama, ubahBersama, resetBersama, batasKini, namaPaketKini, HARI_INI as HARI } from '../shared/bersama.js';
import { aturSlot, SLOT_AWAL } from '../shared/logic/bersama.js';

const KEY = 'ata-demo-lomba';
export { HARI_INI, segarkanHari } from '../shared/bersama.js'; /* binding hidup: ikut berganti setelah tengah malam */
/* demo awal: beberapa lomba (termasuk poster nyata) sudah tersimpan/dilewati, supaya Tersimpan dan pencarian lengketnya
   langsung bisa dicoba tanpa harus menggeser kartu dulu */
const TERSIMPAN_AWAL = ['esdm-jurnalistik-2026', 'area-creator-8'];
const DILEWATI_AWAL = ['digicomp-2026'];
function deckAwal() {
  const d = buatDeck(LOMBA, PROFIL, { slot: SLOT_AWAL });
  const ada = (id) => d.antrean.includes(id);
  const tersimpan = TERSIMPAN_AWAL.filter(ada), dilewati = DILEWATI_AWAL.filter(ada);
  const sisa = d.antrean.filter((id) => !tersimpan.includes(id) && !dilewati.includes(id));
  /* poster nyata (baru dari @infolomba) tampil paling depan, urutan cocok tetap berlaku di dalam tiap kelompok */
  const nyata = new Set(LOMBA.filter((l) => l.nyata).map((l) => l.id));
  return { ...d, antrean: [...sisa.filter((id) => nyata.has(id)), ...sisa.filter((id) => !nyata.has(id))], tersimpan, dilewati };
}
const awal = () => ({ v: 3, deck: deckAwal(), peta: {}, dipilih: 'essay-unesa-2026', unggahHariIni: 0, unggahan: [], cariTambahan: false, dilihat: LOMBA.map((l) => l.id) });
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };

const saved = read();
const ids = new Set([...LOMBA.map((l) => l.id), ...((saved && Array.isArray(saved.unggahan)) ? saved.unggahan.map((u) => u && u.id) : [])]);
export const state = rapikan(saved, awal(), (id) => ids.has(id));
/* buang data contoh dari simulasi "Ata membaca poster" yang lama (bukan data pengguna), kecuali sudah jadi Slot */
state.unggahan = bersihkanSimulasiLama(state.unggahan, state.deck.slot);
{
  const r = sisipkanBaru(state.deck, LOMBA.filter(masihBuka).map((l) => l.id), saved ? saved.dilihat : state.dilihat);
  state.deck = r.state; state.dilihat = r.dilihat;
}

/* sekali saja: store bersama belum ada → pindahkan Slot & Peta Jalan lama milik Lomba ke sana */
const kartuUnggahan = (slotIds) => Object.fromEntries(state.unggahan.filter((u) => slotIds.includes(u.id)).map((u) => [u.id, u]));
benihBersama({ slot: state.deck.slot, peta: saved && saved.peta ? saved.peta : {}, kartu: kartuUnggahan(state.deck.slot) });

/* ambil Slot & Peta Jalan dari store (salinan, karena layar Peta Jalan menyuntingnya di tempat) */
export function sinkronDariBersama(b = bacaBersama()) {
  state.deck = samakanSlot(state.deck, b.slot);
  state.peta = JSON.parse(JSON.stringify(b.peta));
}
sinkronDariBersama();

export function simpan() {
  const { peta, ...lokal } = state;
  try { localStorage.setItem(KEY, JSON.stringify(lokal)); } catch (e) { /* ignore */ }
  const { b } = ubahBersama((kini) => ({ ...aturSlot(kini, state.deck.slot, kartuUnggahan(state.deck.slot)), peta: { ...kini.peta, ...state.peta } }));
  /* store bisa menambah Peta Jalan untuk Slot baru: ambil kembali supaya layar langsung memakainya */
  state.peta = JSON.parse(JSON.stringify(b.peta));
}
export function reset() {
  Object.assign(state, awal());
  resetBersama({ simpanPaket: true });
  sinkronDariBersama();
  simpan();
}

/* batas Slot aktif dari konfigurasi entitlement terpusat (shared/logic/hak.js). Arsip, riwayat, dan Data Progres tidak dibatasi. */
export const batasSlot = () => batasKini();
export const namaPaket = () => namaPaketKini();

/* semua lomba: katalog + lomba yang ditambahkan pengguna sendiri (isian manual). Sisa hari isian manual dihitung ulang tiap hari. */
export const semuaLomba = () => [...LOMBA, ...state.unggahan.map((u) => (u.manual ? { ...u, hariLagi: hariLagiDari(u.tenggatIso, HARI) } : u))];
export const cari = (id) => semuaLomba().find((l) => l.id === id) || (bacaBersama().kartu[id] ? { id, ...bacaBersama().kartu[id] } : undefined);

/* the roadmap for a competition; lives in the shared store (created there for every Slot) */
export function petaUntuk(id) {
  if (!state.peta[id]) simpan();
  return state.peta[id] || { langkah: [], disetujui: false, peringatan: null };
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
