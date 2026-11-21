/* Focus trap: indeks elemen berikutnya saat Tab/Shift+Tab di dalam panel modal. Murni.
   Mengembalikan -1 bila browser boleh menangani sendiri (fokus masih di tengah daftar). */
export function indeksKurung(jumlah, sekarang, mundur) {
  if (!jumlah) return -1;
  if (sekarang < 0) return mundur ? jumlah - 1 : 0; /* fokus di luar panel: tarik masuk */
  if (mundur && sekarang === 0) return jumlah - 1;
  if (!mundur && sekarang === jumlah - 1) return 0;
  return -1;
}
