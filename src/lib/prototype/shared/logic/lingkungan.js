/* Hitungan lingkungan & dock (murni, tanpa DOM). */

/* parallax latar: penunjuk di (x, y) dalam viewport w×h → geser latar maks ±amp px, berlawanan arah, dibulatkan 0,1 px */
export function geserParallax(x, y, w, h, amp = 10) {
  if (!(w > 0) || !(h > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return { gx: 0, gy: 0 };
  const nx = Math.min(1, Math.max(-1, (x / w) * 2 - 1));
  const ny = Math.min(1, Math.max(-1, (y / h) * 2 - 1));
  const r = (n) => Math.round(n * 10) / 10 || 0;
  return { gx: r(-nx * amp), gy: r(-ny * amp * 0.6) };
}

/* dock ala macOS: skala ikon dari jarak penunjuk ke pusat ikon (px). Kurva cosinus halus:
   jarak 0 → maks, jarak ≥ jangkau → 1. Tetangga ikut membesar sedikit, tanpa lompatan. */
export function skalaDok(jarak, { maks = 1.55, jangkau = 150 } = {}) {
  if (!Number.isFinite(jarak)) return 1;
  const d = Math.abs(jarak);
  if (d >= jangkau) return 1;
  const t = (Math.cos((d / jangkau) * Math.PI) + 1) / 2; /* 1 di pusat → 0 di tepi jangkauan */
  return Math.round((1 + (maks - 1) * t) * 1000) / 1000;
}
