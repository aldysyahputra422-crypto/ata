/* XP, level, streak, pencapaian: dihitung HANYA dari langkah Peta Jalan yang benar-benar selesai.
   Aturan terbuka (ditampilkan apa adanya di UI lewat ATURAN_XP). Murni: tanpa DOM, tanpa jam.
   Langkah lama yang selesai tanpa tanggal (sebelum pencatatan dimulai) tetap dapat XP dasar, tetapi tidak dihitung ke streak. */
export const XP = { TEPAT_WAKTU: 10, TERLAMBAT: 5, PETA_TUNTAS: 20, PER_LEVEL: 100 };
export const ATURAN_XP = [
  `+${XP.TEPAT_WAKTU} XP untuk setiap langkah yang selesai sebelum atau tepat di tenggatnya`,
  `+${XP.TERLAMBAT} XP untuk langkah yang selesai setelah tenggat`,
  `+${XP.PETA_TUNTAS} XP saat seluruh langkah satu Peta Jalan selesai`,
  `Naik level setiap ${XP.PER_LEVEL} XP`,
  'Streak: hari berturut-turut (sampai hari ini atau kemarin) dengan minimal satu langkah selesai'
];

const geser = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** peta: { [slotId]: { langkah: [{ selesai, tanggal, selesaiPada }] } } */
export function hitungXP(peta = {}, hariIni) {
  let xp = 0, selesai = 0, tepat = 0, tuntas = 0;
  const hari = new Set();
  for (const p of Object.values(peta)) {
    const L = p?.langkah || [];
    for (const s of L) {
      if (!s.selesai) continue;
      selesai++;
      const telat = s.selesaiPada && s.tanggal && s.selesaiPada > s.tanggal;
      xp += telat ? XP.TERLAMBAT : XP.TEPAT_WAKTU;
      if (!telat) tepat++;
      if (s.selesaiPada) hari.add(s.selesaiPada);
    }
    if (L.length && L.every((s) => s.selesai)) { xp += XP.PETA_TUNTAS; tuntas++; }
  }
  /* streak berakhir hari ini, atau kemarin (hari ini belum ada yang selesai tidak memutus streak) */
  let mulai = hari.has(hariIni) ? hariIni : geser(hariIni, -1), streak = 0;
  while (hari.has(mulai)) { streak++; mulai = geser(mulai, -1); }
  const level = Math.floor(xp / XP.PER_LEVEL) + 1;
  const pencapaian = [
    { id: 'pertama', nama: 'Langkah pertama', syarat: '1 langkah selesai', dapat: selesai >= 1 },
    { id: 'lima', nama: 'Lima langkah', syarat: '5 langkah selesai', dapat: selesai >= 5 },
    { id: 'tepat', nama: 'Tepat waktu', syarat: '5 langkah selesai sebelum tenggat', dapat: tepat >= 5 },
    { id: 'tuntas', nama: 'Peta tuntas', syarat: '1 Peta Jalan selesai seluruhnya', dapat: tuntas >= 1 },
    { id: 'streak3', nama: 'Tiga hari beruntun', syarat: 'streak 3 hari', dapat: streak >= 3 }
  ];
  return { xp, level, xpLevel: xp % XP.PER_LEVEL, keLevelBerikut: XP.PER_LEVEL - (xp % XP.PER_LEVEL), streak, selesai, tepat, tuntas, pencapaian };
}

/* prioritas tugas: aturan tetap yang ditampilkan di legenda */
export function prioritasTugas(t, hariIni) {
  if (t.selesai || !t.tenggat) return { tingkat: 'rendah', label: 'Rendah' };
  const n = Math.round((Date.parse(`${t.tenggat}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / 864e5);
  if (n <= 2) return { tingkat: 'tinggi', label: 'Tinggi', n };
  if (n <= 7) return { tingkat: 'sedang', label: 'Sedang', n };
  return { tingkat: 'rendah', label: 'Rendah', n };
}

/* aktivitas harian NYATA: jumlah langkah yang selesai per tanggal (sumber heatmap Progres) */
export function aktivitasHarian(peta = {}) {
  const out = {};
  for (const p of Object.values(peta)) for (const s of p?.langkah || []) if (s.selesai && s.selesaiPada) out[s.selesaiPada] = (out[s.selesaiPada] || 0) + 1;
  return out;
}
