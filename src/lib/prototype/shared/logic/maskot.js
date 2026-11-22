/* Maskot Red Panda (sprite 3×3 dari page-mascot, dipakai tanpa library). Murni: tanpa DOM.
   Sheet arah  : 0 atas-kiri · 1 atas · 2 atas-kanan / 3 kiri · 4 tengah · 5 kanan / 6 bawah-kiri · 7 bawah · 8 bawah-kanan
   Sheet reaksi: 0 senyum (mata tertutup) · 1 hati · 2 berkilau / 3 kaget · 4 mata bintang · 5 tersipu / 6 ngantuk zZ · 7 pusing · 8 tertawa */

export const TENGAH = 4;
export const REAKSI = { kedip: 0, hati: 1, kilau: 2, kaget: 3, bintang: 4, tersipu: 5, tidur: 6, pusing: 7, tawa: 8 };
/* urutan reaksi saat maskot diklik berulang */
export const URUT_KLIK = ['hati', 'kilau', 'bintang', 'tawa'];
/* lama reaksi (ms) */
export const LAMA = { klik: 650, hover: 700, tugas: 1400, kedip: 140 };

/* dx, dy: posisi penunjuk relatif ke pusat maskot (px, y ke bawah positif).
   mati: radius zona mati (px) — di dalamnya maskot menatap lurus (sel tengah). */
export function selArah(dx, dy, mati = 60) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) <= mati) return TENGAH;
  const sudut = Math.atan2(dy, dx); /* -π..π, 0 = kanan, π/2 = bawah */
  const sektor = ((Math.round(sudut / (Math.PI / 4)) % 8) + 8) % 8; /* 0 kanan, 1 kanan-bawah, 2 bawah, … 7 kanan-atas */
  return [5, 8, 7, 6, 3, 0, 1, 2][sektor];
}

/* background-position untuk sel i pada sheet 3×3 dengan background-size 300% 300% */
export function posisiSel(i) {
  const n = Number.isInteger(i) && i >= 0 && i <= 8 ? i : TENGAH;
  return `${(n % 3) * 50}% ${Math.floor(n / 3) * 50}%`;
}

/* reaksi untuk sebuah peristiwa; `ke` = hitungan klik/tugas supaya bergantian, bukan acak */
export function reaksiUntuk(peristiwa, ke = 0) {
  if (peristiwa === 'klik') return REAKSI[URUT_KLIK[((ke % URUT_KLIK.length) + URUT_KLIK.length) % URUT_KLIK.length]];
  if (peristiwa === 'hover') return REAKSI.tersipu;
  if (peristiwa === 'tugas-selesai') return ke % 2 ? REAKSI.bintang : REAKSI.kilau;
  if (peristiwa === 'diam') return REAKSI.tidur;
  if (peristiwa === 'kedip') return REAKSI.kedip;
  return null;
}
