/* Potong foto profil jadi persegi: zoom (≥1) dan geser (-1..1 per sumbu). Murni.
   Hasil = persegi sumber {sx, sy, sisi} di dalam gambar w×h; selalu di dalam batas gambar. */
export function potongKotak(w, h, { zoom = 1, gx = 0, gy = 0 } = {}) {
  if (!(w > 0) || !(h > 0)) return { sx: 0, sy: 0, sisi: 0 };
  const z = Math.min(4, Math.max(1, Number(zoom) || 1));
  const sisi = Math.min(w, h) / z;
  const jepit = (n) => Math.min(1, Math.max(-1, Number(n) || 0));
  const sx = (w - sisi) / 2 + jepit(gx) * (w - sisi) / 2;
  const sy = (h - sisi) / 2 + jepit(gy) * (h - sisi) / 2;
  const b = (n) => Math.round(n * 100) / 100;
  return { sx: b(sx), sy: b(sy), sisi: b(sisi) };
}

/* data URL foto yang boleh disimpan: hanya gambar raster kecil buatan kanvas kita */
export const fotoSah = (d) => typeof d === 'string' && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(d) && d.length < 400_000;
