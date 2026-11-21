/* Hitungan gerak murni (tanpa DOM), dari referensi Projects/taste:
   - folder "hover to lean": kartu condong ke arah penunjuk, tepi terdekat turun
   - detail travel: foto hero bergerak lebih lambat dari gulir (parallax 0,4) dan meregang saat ditarik melewati puncak */

const jepit = (x, a, b) => Math.min(b, Math.max(a, x));

/* x, y: posisi penunjuk relatif ke kotak (px); w, h: ukuran kotak. Hasil derajat, dibulatkan 2 desimal.
   rx (sumbu X) negatif saat penunjuk di bawah; ry positif saat penunjuk di kanan. */
export function sudutCondong(x, y, w, h, maks = 6) {
  if (!(w > 0) || !(h > 0)) return { rx: 0, ry: 0 };
  const nx = jepit(x / w, 0, 1) * 2 - 1;
  const ny = jepit(y / h, 0, 1) * 2 - 1;
  const bulat = (n) => Math.round(n * 100) / 100 || 0;
  return { rx: bulat(-ny * maks), ry: bulat(nx * maks) };
}

/* gulir: scrollTop wadah (px, bisa negatif saat overscroll). tinggi: tinggi hero.
   geser: translateY foto; skala: pembesaran saat ditarik ke bawah; redup: 0..1 untuk lapisan gelap saat hero tertutup. */
export function parallaxHero(gulir, tinggi, laju = 0.4) {
  if (!(tinggi > 0) || !Number.isFinite(gulir)) return { geser: 0, skala: 1, redup: 0 };
  if (gulir < 0) return { geser: 0, skala: Math.round((1 + Math.min(-gulir, tinggi) / tinggi) * 1000) / 1000, redup: 0 };
  const g = Math.min(gulir, tinggi);
  return { geser: Math.round(g * laju * 10) / 10, skala: 1, redup: Math.round((g / tinggi) * 0.35 * 1000) / 1000 };
}
