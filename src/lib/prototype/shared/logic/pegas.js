/* Fisika kecil untuk elemen yang mengikuti jari (sheet bawah, karusel).
   Murni: tanpa DOM, tanpa waktu nyata. Referensi: travel app (SpringSimulation + rubber-band). */

/* Pegas bawaan: sedikit memantul (rasio redaman ±0,77), tenang dalam ±0,4 detik. */
export const PEGAS = { kaku: 420, redam: 32, massa: 1 };

/* Tarikan melawan arah yang dibolehkan makin berat: tak pernah melewati `batas`.
   Rumus karet iOS: (1 - 1 / (x·c / d + 1)) · d. Tanda ikut masukan. */
export function karetGelang(jarak, batas = 64, c = 0.55) {
  if (!Number.isFinite(jarak) || jarak === 0 || batas <= 0) return 0;
  const x = Math.abs(jarak);
  return Math.sign(jarak) * (1 - 1 / ((x * c) / batas + 1)) * batas;
}

/* Posisi sheet saat diseret sejauh `geser` px (positif = ke bawah). Ke bawah bebas, ke atas pakai karet. */
export function posisiSeret(geser, batasAtas = 48) {
  if (!Number.isFinite(geser)) return 0;
  return geser >= 0 ? geser : karetGelang(geser, batasAtas);
}

/* Satu langkah pegas (Euler semi-implisit, dipecah jadi sub-langkah ≤ 1/480 detik agar redaman numeriknya kecil).
   x dan v dalam px dan px/detik, dt dalam detik. */
export function langkahPegas({ x, v }, target, dt, { kaku, redam, massa } = PEGAS) {
  const n = Math.max(1, Math.ceil(dt * 480)), h = dt / n;
  for (let i = 0; i < n; i += 1) {
    v += ((-kaku * (x - target) - redam * v) / massa) * h;
    x += v * h;
  }
  return { x, v };
}

export const sudahTenang = ({ x, v }, target, ambang = 0.5) => Math.abs(x - target) < ambang && Math.abs(v) < ambang * 20;

/* Seluruh lintasan pegas, per bingkai 60 fps, sampai tenang (maks `maksBingkai`). Bingkai terakhir tepat di target. */
export function simulasiPegas(x0, v0, target, opsi = {}) {
  const { dt = 1 / 60, maksBingkai = 240, ...pegas } = opsi;
  const p = { ...PEGAS, ...pegas };
  const jejak = [];
  let s = { x: x0, v: v0 };
  for (let i = 0; i < maksBingkai; i += 1) {
    s = langkahPegas(s, target, dt, p);
    if (sudahTenang(s, target)) break;
    jejak.push(s.x);
  }
  jejak.push(target);
  return jejak;
}

/* Kecepatan (px/detik) dari sampel {t (ms), y (px)} terbaru; hanya sampel dalam `jendela` ms terakhir. */
export function kecepatanDari(sampel, jendela = 100) {
  if (!Array.isArray(sampel) || sampel.length < 2) return 0;
  const akhir = sampel[sampel.length - 1];
  const awal = sampel.find((s) => akhir.t - s.t <= jendela) || sampel[0];
  const dt = akhir.t - awal.t;
  return dt > 0 ? ((akhir.y - awal.y) / dt) * 1000 : 0;
}

/* Setelah jari diangkat: tutup bila diseret cukup jauh, atau dilempar cukup cepat ke bawah. */
export function putuskanLepas({ geser, kecepatan, tinggi }) {
  const t = Math.max(1, tinggi || 1);
  if (kecepatan > 900 && geser > 12) return 'tutup';
  if (kecepatan < -400) return 'kembali';
  return geser > t * 0.32 ? 'tutup' : 'kembali';
}
