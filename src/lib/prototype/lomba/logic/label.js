/* Label yang jujur untuk data lomba yang bisa "tidak diketahui" (lomba nyata hanya memuat yang tertulis di poster). Murni. */

/* biaya: angka rupiah, 0 = gratis, null/undefined = belum tertulis */
export function labelBiaya(biaya) {
  if (biaya === 0) return 'Gratis';
  if (Number.isFinite(biaya) && biaya > 0) return 'Rp' + biaya.toLocaleString('id-ID');
  return 'Cek juknis';
}

/* hariLagi: hari menuju tenggat; null = belum tertulis; negatif = sudah tutup */
export function labelSisa(hariLagi) {
  if (hariLagi === null || hariLagi === undefined || !Number.isFinite(hariLagi)) return 'Cek tgl';
  if (hariLagi < 0) return 'Ditutup';
  if (hariLagi === 0) return 'Hari ini';
  return 'H-' + hariLagi;
}

/* jenjang peserta; [] = belum tertulis */
export const labelTingkat = (tingkat) => (Array.isArray(tingkat) && tingkat.length ? tingkat.join(', ') : 'Jenjang: cek juknis');

export const masihBuka = (l) => !l || l.hariLagi === null || l.hariLagi === undefined || l.hariLagi >= 0;
