/* How well a competition fits the student's profile, with the reasons shown on the Radar card. */
import { NAMA_KATEGORI } from '../data/lomba.js';

export function skorCocok(l, p) {
  let skor = 30; const alasan = [];
  if (p.minat.includes(l.kategori)) { skor += 30; alasan.push(`Sesuai minatmu: ${NAMA_KATEGORI[l.kategori]}`); }
  if (!l.tingkat.length) alasan.push('Syarat jenjang belum tertulis, cek juknis');
  else if (l.tingkat.includes(p.tingkat)) { skor += 15; alasan.push(`Terbuka untuk ${p.tingkat}`); }
  else { skor -= 40; alasan.push(`Hanya untuk ${l.tingkat.join(', ')}`); }
  if (l.hariLagi === null || l.hariLagi === undefined) alasan.push('Tenggat belum tertulis, cek juknis');
  else if (l.hariLagi >= 14) { skor += 15; alasan.push(`Masih ${l.hariLagi} hari, cukup untuk ${p.jamPerMinggu} jam per minggu`); }
  else if (l.hariLagi >= 7) skor += 5;
  else { skor -= 10; alasan.push(`Tinggal ${l.hariLagi} hari, waktunya mepet`); }
  if (l.biaya === 0) { skor += 5; alasan.push('Gratis pendaftaran'); }
  return { skor: Math.max(0, Math.min(100, skor)), alasan: alasan.slice(0, 3) };
}
