/* Validasi, urutan, dan penyaringan Galeri sertifikat. Fungsi murni. */

import { KATEGORI, TINGKAT } from '../data/sertifikat.js';

export const TAHUN_MIN = 2015;
export const TAHUN_MAX = 2027;
export const BATAS_BERKAS = 10 * 1024 * 1024; /* 10 MB */
export const BATAS_NAMA = 60;

export function namaKategori(id) {
  return KATEGORI.find((k) => k.id === id)?.label || 'Lainnya';
}

/**
 * @returns {{ok: boolean, galat: Record<string,string>}}
 */
export function validasiSertifikat(data = {}) {
  const galat = {};
  const nama = String(data.nama ?? '').trim();
  const penyelenggara = String(data.penyelenggara ?? '').trim();
  const tahun = Number(data.tahun);
  const ukuran = Number(data.ukuranBytes ?? 0);

  if (nama.length < 3) galat.nama = 'Nama lomba minimal 3 karakter.';
  else if (nama.length > BATAS_NAMA) galat.nama = `Nama lomba maksimal ${BATAS_NAMA} karakter.`;

  if (penyelenggara.length < 3) galat.penyelenggara = 'Nama penyelenggara minimal 3 karakter.';

  if (!TINGKAT.includes(data.tingkat)) galat.tingkat = 'Pilih tingkat lomba.';

  if (!Number.isInteger(tahun) || tahun < TAHUN_MIN || tahun > TAHUN_MAX) {
    galat.tahun = `Tahun harus antara ${TAHUN_MIN} dan ${TAHUN_MAX}.`;
  }

  if (!KATEGORI.some((k) => k.id === data.kategori)) galat.kategori = 'Pilih kategori lomba.';

  const peringkat = String(data.peringkat ?? '').trim();
  if (peringkat.length > 40) galat.peringkat = 'Peringkat maksimal 40 karakter.';

  if (!Number.isFinite(ukuran) || ukuran <= 0) galat.berkas = 'Pilih berkas sertifikat dulu.';
  else if (ukuran > BATAS_BERKAS) galat.berkas = 'Berkas lebih dari 10 MB. Kompres atau ambil foto ulang.';

  return { ok: Object.keys(galat).length === 0, galat };
}

/** Tahun terbaru dulu, lalu nama A–Z. */
export function urutkan(list = []) {
  return [...list].sort((a, b) => b.tahun - a.tahun || a.nama.localeCompare(b.nama, 'id'));
}

export function saring(list = [], { kategori = 'semua', cari = '' } = {}) {
  const q = String(cari).trim().toLowerCase();
  return urutkan(list).filter((s) => {
    if (kategori !== 'semua' && s.kategori !== kategori) return false;
    if (!q) return true;
    return `${s.nama} ${s.penyelenggara} ${namaKategori(s.kategori)}`.toLowerCase().includes(q);
  });
}

export function ukuranRingkas(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} B`;
}

export const labelDrive = (status) =>
  ({ tersimpan: 'Tersimpan di Drive', antrean: 'Menunggu unggah', gagal: 'Gagal unggah', lokal: 'Disimpan di perangkat' }[status] ||
    'Belum diunggah');
