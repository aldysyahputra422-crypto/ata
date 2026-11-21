/* Karusel melingkar: posisi tampil kartu i bila kartu `aktif` di tengah, dari n kartu.
   Hasil di rentang [-n/2, n/2), jadi kartu terakhir muncul di kiri kartu pertama. Murni. */
export function posisiMelingkar(i, aktif, n) {
  if (n <= 1) return 0;
  const d = (((i - aktif) % n) + n) % n;
  return d >= n / 2 ? d - n : d;
}

/* Indeks setelah bergeser `arah` langkah, selalu berputar (tak ada ujung). */
export const putar = (indeks, arah, n) => (n > 0 ? (((indeks + arah) % n) + n) % n : 0);
