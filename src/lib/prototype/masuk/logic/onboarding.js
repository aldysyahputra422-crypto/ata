/* Onboarding L0 → L1: validasi per langkah, meter kenal, navigasi langkah. */

import { LANGKAH, JENJANG, BOBOT } from '../data/onboarding.js';

export const TAHUN_MIN = 1990;
export const TAHUN_MAX = 2012;
export const MINAT_MAKS = 5;

export function validasiLangkah(langkah, data = {}) {
  const galat = {};
  if (!langkah) return { ok: false, galat: { umum: 'Langkah tidak dikenal.' } };

  if (langkah.kunci === 'nama') {
    const nama = String(data.nama ?? '').trim();
    if (nama.length < 2) galat.nama = 'Nama panggilan minimal dua huruf.';
    else if (nama.length > 30) galat.nama = 'Nama panggilan maksimal tiga puluh huruf.';
  }

  if (langkah.kunci === 'jenjang' && !JENJANG.includes(data.jenjang)) {
    galat.jenjang = 'Pilih jenjangmu dulu.';
  }

  if (langkah.kunci === 'tahunLahir') {
    const tahun = Number(data.tahunLahir);
    if (!Number.isInteger(tahun) || tahun < TAHUN_MIN || tahun > TAHUN_MAX) {
      galat.tahunLahir = `Tahun lahir harus antara ${TAHUN_MIN} dan ${TAHUN_MAX}.`;
    }
  }

  if (langkah.kunci === 'minat') {
    const minat = Array.isArray(data.minat) ? data.minat : [];
    if (minat.length > MINAT_MAKS) galat.minat = `Pilih maksimal ${MINAT_MAKS} minat.`;
  }

  return { ok: Object.keys(galat).length === 0, galat };
}

export function kenalPersen(data = {}) {
  const total = Object.values(BOBOT).reduce((n, b) => n + b, 0);
  let skor = 0;
  for (const [kunci, bobot] of Object.entries(BOBOT)) {
    const nilai = data[kunci];
    const terisi = Array.isArray(nilai) ? nilai.length > 0 : nilai !== undefined && nilai !== null && String(nilai).trim() !== '';
    if (terisi) skor += bobot;
  }
  return Math.round((skor / total) * 100);
}

export function indeksLangkah(id) {
  return LANGKAH.findIndex((l) => l.id === id);
}

export function langkahBerikut(id) {
  const i = indeksLangkah(id);
  if (i < 0) return LANGKAH[0];
  return LANGKAH[i + 1] || null;
}

export function langkahSebelum(id) {
  const i = indeksLangkah(id);
  if (i <= 0) return null;
  return LANGKAH[i - 1];
}

export function wajibBelum(data = {}) {
  return LANGKAH.filter((l) => l.wajib).filter((l) => {
    const v = data[l.kunci];
    return Array.isArray(v) ? v.length === 0 : v === undefined || v === null || String(v).trim() === '';
  });
}
