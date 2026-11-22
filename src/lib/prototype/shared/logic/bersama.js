/* State demo BERSAMA lintas tab (Hari Ini, Lomba, Tanya, Progres, Profil, Portofolio, Sidang).
   Satu sumber kebenaran untuk: paket, Slot aktif, Peta Jalan per Slot (= tugas di Progres), dan ringkasan sertifikat.
   Murni: tanpa DOM, tanpa localStorage, tanpa jam. Katalog lomba (`cari`) dan pembuat usulan (`usul`) disuntik pemanggil. */

import { HAK, batasSlotPaket } from './hak.js';

export const KUNCI_BERSAMA = 'ata-bersama';
export const VERSI_BERSAMA = 2; /* v2: Slot awal pindah ke lomba nyata; simpanan v1 berisi lomba fiktif → mulai ulang */
export const SLOT_AWAL = ['interval-2027'];
/* batas dari konfigurasi entitlement terpusat (shared/logic/hak.js); jangan menulis angka di sini */
export const BATAS_PAKET = Object.fromEntries(Object.entries(HAK).map(([k, v]) => [k, v.slotAktif]));

export const batasSlot = (paket) => batasSlotPaket(paket);

/* izin pemakaian data untuk personalisasi AI (Tanya Ata), per kategori; pengguna bisa mematikan masing-masing */
export const KATEGORI_IZIN = ['profil', 'slot', 'tugas', 'progres', 'ingatan', 'lomba'];
const izinAwal = () => Object.fromEntries(KATEGORI_IZIN.map((k) => [k, true]));

export function awalBersama() {
  return { v: VERSI_BERSAMA, paket: 'gratis', slot: [...SLOT_AWAL], peta: {}, kartu: {}, sertifikat: null, izinAI: izinAwal(), diperbarui: '' };
}

export function aturIzinAI(b, kategori, nilai) {
  if (!KATEGORI_IZIN.includes(kategori)) return { b, ditolak: 'kategori-tidak-dikenal' };
  return { b: { ...b, izinAI: { ...b.izinAI, [kategori]: nilai === true } } };
}

const objek = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const teks = (x) => (typeof x === 'string' ? x : '');

export const STATUS_TUGAS = ['belum', 'dikerjakan', 'selesai'];
const tglIso = (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : '');
/* langkah: status tiga tahap (belum/dikerjakan/selesai), selesaiPada = tanggal benar-benar dicentang (untuk XP & streak).
   Data lama tanpa status: diturunkan dari `selesai`. */
function rapikanLangkah(l) {
  if (!objek(l) || !teks(l.id) || !teks(l.nama)) return null;
  const selesai = l.selesai === true || l.status === 'selesai';
  const status = selesai ? 'selesai' : (l.status === 'dikerjakan' ? 'dikerjakan' : 'belum');
  return { id: l.id, nama: l.nama, tanggal: teks(l.tanggal), selesai, status, selesaiPada: selesai ? tglIso(l.selesaiPada) : '' };
}

function rapikanKartu(k) {
  if (!objek(k) || !teks(k.nama)) return null;
  return { nama: k.nama, penyelenggara: teks(k.penyelenggara), kategori: teks(k.kategori) || 'karya-tulis',
    hariLagi: Number.isFinite(k.hariLagi) ? k.hariLagi : null, gem: teks(k.gem) || 'lemon', perluCek: k.perluCek === true };
}

/* Simpanan apa pun → bentuk yang aman. Versi lain/rusak → awal. `ada(id)` memberi tahu lomba yang dikenal katalog. */
export function rapikanBersama(simpanan, ada = () => true) {
  if (!objek(simpanan) || simpanan.v !== VERSI_BERSAMA) return awalBersama();
  const b = awalBersama();
  b.paket = BATAS_PAKET[simpanan.paket] ? simpanan.paket : 'gratis';
  if (objek(simpanan.izinAI)) for (const k of KATEGORI_IZIN) if (typeof simpanan.izinAI[k] === 'boolean') b.izinAI[k] = simpanan.izinAI[k];
  if (typeof simpanan.diperbarui === 'string' && !Number.isNaN(Date.parse(simpanan.diperbarui))) b.diperbarui = simpanan.diperbarui;
  if (objek(simpanan.kartu)) {
    for (const [id, k] of Object.entries(simpanan.kartu)) { const r = rapikanKartu(k); if (r) b.kartu[id] = r; }
  }
  const dikenal = (id) => typeof id === 'string' && (ada(id) || !!b.kartu[id]);
  /* Slot yang sudah ada TIDAK pernah dibuang saat dimuat (mis. simpanan lama dengan batas Pro 6): batas hanya mencegah menambah Slot baru */
  b.slot = Array.isArray(simpanan.slot) ? [...new Set(simpanan.slot.filter(dikenal))].slice(0, Math.max(...Object.values(BATAS_PAKET), 6)) : [];
  if (objek(simpanan.peta)) {
    for (const [id, p] of Object.entries(simpanan.peta)) {
      if (!dikenal(id) || !objek(p) || !Array.isArray(p.langkah)) continue;
      const langkah = p.langkah.map(rapikanLangkah).filter(Boolean);
      if (langkah.length) b.peta[id] = { langkah, disetujui: p.disetujui === true, peringatan: teks(p.peringatan) || null };
    }
  }
  for (const id of Object.keys(b.kartu)) if (!b.slot.includes(id) && !b.peta[id]) delete b.kartu[id];
  b.sertifikat = Number.isInteger(simpanan.sertifikat) && simpanan.sertifikat >= 0 ? simpanan.sertifikat : null;
  return b;
}

/* Peta Jalan untuk tiap Slot yang belum punya. Slot contoh pertama sudah disetujui dan sudah berjalan:
   tiga langkah selesai, langkah keempat lewat tenggat sehari (supaya demo Progres punya tugas telat). */
export function lengkapiPeta(b, cari, usul, { hariIni, tambahHari }) {
  let peta = b.peta;
  for (const id of b.slot) {
    if (peta[id]) continue;
    const l = cari(id);
    if (!l) continue;
    const u = usul(l, hariIni);
    let langkah = u.langkah.map((s) => ({ ...s }));
    const contoh = id === SLOT_AWAL[0];
    if (contoh) {
      langkah = langkah.map((s, i) => (i <= 3 ? { ...s, tanggal: tambahHari(hariIni, -3 * (4 - i) + 2), selesai: i < 3 } : s));
    }
    peta = { ...peta, [id]: { langkah, disetujui: contoh, peringatan: u.peringatan || null } };
  }
  return peta === b.peta ? b : { ...b, peta };
}

const hitung = (langkah = []) => ({ wajib: langkah.length, selesai: langkah.filter((s) => s.selesai).length });

/* Satu baris per Slot aktif: nama, tenggat (ISO), kemajuan dari Peta Jalan. */
export function ringkasSlot(b, cari, { hariIni, tambahHari }) {
  return b.slot.map((id) => {
    const l = cari(id) || { nama: id, hariLagi: 0, kategori: '' };
    const p = b.peta[id];
    return { id, nama: l.nama, penyelenggara: l.penyelenggara || '', kategori: l.kategori, gem: l.gem,
      tenggat: Number.isFinite(l.hariLagi) ? tambahHari(hariIni, l.hariLagi) : null, hariLagi: l.hariLagi ?? null, disetujui: !!p?.disetujui, ...hitung(p?.langkah) };
  });
}

/* Tugas di Progres/Hari Ini/Tanya = langkah Peta Jalan yang SUDAH disetujui, dari Slot yang masih aktif.
   Urutan: yang belum selesai dulu (tenggat terdekat), lalu yang sudah selesai. */
export function daftarTugas(b, cari) {
  const semua = [];
  for (const id of b.slot) {
    const p = b.peta[id];
    if (!p?.disetujui) continue;
    const nama = cari(id)?.nama || id;
    for (const s of p.langkah) semua.push({ id: `${id}/${s.id}`, judul: s.nama, slot: id, slotNama: nama, tenggat: s.tanggal, selesai: s.selesai,
      status: s.status || (s.selesai ? 'selesai' : 'belum'), selesaiPada: s.selesaiPada || '' });
  }
  return semua.sort((a, b2) => Number(a.selesai) - Number(b2.selesai) || a.tenggat.localeCompare(b2.tenggat));
}

/* Ubah status satu tugas (belum → dikerjakan → selesai). Ditolak bila Peta Jalannya belum disetujui atau tugasnya tidak ada.
   hariIni dicatat sebagai selesaiPada saat menjadi selesai (sumber XP & streak); dihapus bila dibatalkan. */
export function aturStatusTugas(b, tugasId, status, hariIni = '') {
  if (!STATUS_TUGAS.includes(status)) return { b, ditolak: 'status-tidak-dikenal' };
  const [slot, langkahId] = String(tugasId).split('/');
  const p = b.peta[slot];
  if (!b.slot.includes(slot) || !p) return { b, ditolak: 'tidak-ada' };
  if (!p.disetujui) return { b, ditolak: 'belum-disetujui' };
  const i = p.langkah.findIndex((s) => s.id === langkahId);
  if (i < 0) return { b, ditolak: 'tidak-ada' };
  const lama = p.langkah[i];
  const baru = { ...lama, status, selesai: status === 'selesai', selesaiPada: status === 'selesai' ? (lama.selesai ? lama.selesaiPada : tglIso(hariIni)) : '' };
  const langkah = p.langkah.map((s, j) => (j === i ? baru : s));
  return { b: { ...b, peta: { ...b.peta, [slot]: { ...p, langkah } } }, selesai: baru.selesai, status, baruSelesai: baru.selesai && !lama.selesai };
}

/* Centang/batal satu tugas (pintasan lama, dipakai Progres & Lomba). */
export function centangTugas(b, tugasId, hariIni = '') {
  const [slot, langkahId] = String(tugasId).split('/');
  const s = b.peta[slot]?.langkah?.find((x) => x.id === langkahId);
  return aturStatusTugas(b, tugasId, s?.selesai ? 'belum' : 'selesai', hariIni);
}

/* Ganti daftar Slot (dari Lomba). `kartu` memberi data lomba buatan sendiri (poster unggahan) agar tab lain bisa menamainya. */
export function aturSlot(b, ids, kartu = {}) {
  /* batas mencegah MENAMBAH; Slot lama yang sudah aktif di atas batas tidak dibuang diam-diam */
  const slot = [...new Set(ids)].slice(0, Math.max(batasSlot(b.paket), b.slot.length));
  const k = { ...b.kartu };
  for (const [id, isi] of Object.entries(kartu)) { const r = rapikanKartu(isi); if (r) k[id] = r; }
  for (const id of Object.keys(k)) if (!slot.includes(id) && !b.peta[id]) delete k[id];
  return { ...b, slot, kartu: k };
}

/* Ganti paket (status paket selalu mengikuti server). Slot aktif di atas batas TIDAK dihapus: `lebih` memberi tahu UI
   bahwa pengguna perlu memilih Slot mana yang tetap aktif sebelum bisa menambah Slot baru. */
export function aturPaket(b, paket) {
  if (!BATAS_PAKET[paket]) return { b, ditolak: 'paket-tidak-dikenal' };
  return { b: { ...b, paket }, lebih: Math.max(0, b.slot.length - batasSlot(paket)) };
}

/* Slot yang dilepas setelah submit: hilang dari Slot aktif, Peta Jalannya tetap disimpan (riwayat). */
export function lepasSlotBersama(b, id) {
  return { ...b, slot: b.slot.filter((x) => x !== id) };
}
