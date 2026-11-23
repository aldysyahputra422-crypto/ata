/* Lomba yang ditambahkan PENGGUNA sendiri (isian manual / dari URL). Tidak ada OCR: Ata tidak membaca poster.
   Murni: tanpa DOM, tanpa jam (tanggal hari ini disuntik). Semua isian dicek; yang tidak diisi tetap null, tidak ditebak. */
import { sisaHari, tanggalSah } from '../../shared/logic/tenggat.js';

export const KATEGORI_MANUAL = ['karya-tulis', 'poster', 'video', 'bisnis', 'olimpiade', 'pidato'];
export const JENJANG_MANUAL = ['SD', 'SMP', 'SMA', 'SMK', 'MA', 'mahasiswa', 'umum'];
const GEM = ['mint', 'lemon', 'sky', 'rose', 'apricot'];

const bersih = (t, max) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** hari dari `hariIniIso` (YYYY-MM-DD, tanggal lokal) ke `iso`; null bila tanpa tanggal */
export function hariLagiDari(iso, hariIniIso) {
  return sisaHari(iso, hariIniIso);
}

/** URL publik http(s) saja; selain itu null */
export function urlSah(u) {
  const t = bersih(u, 500);
  if (!t) return null;
  try {
    const x = new URL(t);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch { return null; }
}

/**
 * Bentuk satu lomba manual dari isian formulir.
 * @returns {{ ok: true, lomba: object } | { ok: false, galat: Record<string,string> }}
 */
export function buatLombaManual(isian, { id, hariIniIso }) {
  const galat = {};
  const nama = bersih(isian.nama, 120);
  if (nama.length < 3) galat.nama = 'Tulis nama lomba (minimal 3 huruf), persis seperti di poster atau situs resminya.';
  const kategori = KATEGORI_MANUAL.includes(isian.kategori) ? isian.kategori : null;
  if (!kategori) galat.kategori = 'Pilih kategori lomba.';
  const tenggatIso = tanggalSah(isian.tenggatIso);
  if (isian.tenggatIso && !tenggatIso) galat.tenggatIso = 'Tanggal tidak dikenali.';
  const urlMentah = bersih(isian.url, 500);
  const url = urlSah(urlMentah);
  if (urlMentah && !url) galat.url = 'Tautan harus diawali http:// atau https://.';
  let biaya = null;
  if (String(isian.biaya ?? '').trim() !== '') {
    const n = Number(String(isian.biaya).replace(/[^\d]/g, ''));
    if (!Number.isFinite(n) || n < 0) galat.biaya = 'Isi angka rupiah, atau kosongkan bila belum tahu.';
    else biaya = n;
  }
  if (Object.keys(galat).length) return { ok: false, galat };
  const jenjang = JENJANG_MANUAL.includes(isian.jenjang) ? [isian.jenjang] : [];
  const penyelenggara = bersih(isian.penyelenggara, 120) || 'Penyelenggara belum diisi';
  return {
    ok: true,
    lomba: {
      id, manual: true, unggahan: true, nama, penyelenggara, kategori, tingkat: jenjang, cakupan: 'Cek juknis',
      biaya, hadiah: bersih(isian.hadiah, 160) || 'Belum diisi', tenggatIso, hariLagi: hariLagiDari(tenggatIso, hariIniIso),
      gem: GEM[nama.length % GEM.length], bentuk: '40%', sumberUrl: url,
      syarat: url ? [`Cek juknis di ${new URL(url).hostname}`] : ['Cek syarat di poster atau juknis resmi'],
      perluCek: true,
    },
  };
}

/* Simulasi lama "Ata membaca poster" selalu menghasilkan data contoh yang sama. Entri seperti itu BUKAN data pengguna:
   dibuang bila tidak dipakai sebagai Slot; bila sudah jadi Slot, dipertahankan dengan tanda agar pengguna menyuntingnya. */
export const tandaSimulasiLama = (u) => !!u && u.unggahan && !u.manual && u.nama === 'Lomba Cipta Puisi Remaja' && u.hadiah === 'Hadiah belum terbaca';

export function bersihkanSimulasiLama(unggahan, dipakai = []) {
  return (Array.isArray(unggahan) ? unggahan : []).flatMap((u) => {
    if (!tandaSimulasiLama(u)) return [u];
    return dipakai.includes(u.id) ? [{ ...u, simulasiLama: true, penyelenggara: 'Data contoh dari simulasi lama, bukan isi postermu' }] : [];
  });
}
