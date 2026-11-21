/* "Langkah berikutnya" di Hari Ini — aturan sederhana dan terbaca dari data yang benar-benar ada
   (Slot, Peta Jalan, tugas di store bersama; tenggat lomba nyata). BUKAN model AI, bukan prediksi:
   setiap saran membawa alasan yang bisa diperiksa pengguna. Murni: tanpa DOM, tanpa jam. */

const HARI = 864e5;
export const selisih = (iso, hariIni) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / HARI);

/**
 * @param {{ slot: Array, tugas: Array, lombaNyata?: Array, batas?: number, hariIni: string }} d
 *   slot: dari slotRingkas() · tugas: dari tugasBersama() · lombaNyata: katalog lomba nyata (opsional)
 * @returns {Array<{id, jenis, judul, alasan, aksi:{tab, rute?}, label, bobot}>} paling penting dulu, maks 3
 */
export function saranBerikut({ slot = [], tugas = [], lombaNyata = [], batas = 3, hariIni }, maks = 3) {
  const out = [];
  for (const t of tugas) {
    if (t.selesai || !t.tenggat) continue;
    const n = selisih(t.tenggat, hariIni);
    if (n < 0) out.push({ id: `telat:${t.id}`, jenis: 'telat', judul: `Selesaikan “${t.judul}”`, alasan: `Lewat tenggat ${-n} hari · ${t.slotNama}`, aksi: { tab: 'progres' }, label: 'Buka Progres', bobot: 100 + Math.min(-n, 30), prioritas: 'Tinggi', tugasId: t.id, status: t.status || 'belum' });
    else if (n <= 2) out.push({ id: `dekat:${t.id}`, jenis: 'dekat', judul: `Kerjakan “${t.judul}”`, alasan: `${n === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${n} hari lagi`} · ${t.slotNama}`, aksi: { tab: 'progres' }, label: 'Buka Progres', bobot: 70 - n * 5, prioritas: 'Tinggi', tugasId: t.id, status: t.status || 'belum' });
  }
  for (const s of slot) {
    if (s.disetujui || s.hariLagi === null || s.hariLagi === undefined) continue;
    if (s.hariLagi <= 7) out.push({ id: `setujui:${s.id}`, jenis: 'peta', judul: `Setujui Peta Jalan ${s.nama}`, alasan: `Tenggat ${s.hariLagi <= 0 ? 'hari ini' : `${s.hariLagi} hari lagi`} dan belum ada langkah yang bisa dicentang`, aksi: { tab: 'lomba', rute: 'peta' }, label: 'Buka Peta Jalan', bobot: 85 - s.hariLagi, prioritas: s.hariLagi <= 3 ? 'Tinggi' : 'Sedang' });
  }
  if (!slot.length) out.push({ id: 'slot-kosong', jenis: 'mulai', judul: 'Pilih satu lomba untuk difokuskan', alasan: 'Belum ada Slot aktif, jadi belum ada rencana yang bisa dijalankan', aksi: { tab: 'lomba', rute: 'radar' }, label: 'Buka Radar', bobot: 60, prioritas: 'Sedang' });
  if (slot.length < batas) {
    const dipakai = new Set(slot.map((s) => s.id));
    for (const l of lombaNyata) {
      if (dipakai.has(l.id) || !Number.isFinite(l.hariLagi) || l.hariLagi < 0 || l.hariLagi > 7) continue;
      out.push({ id: `nyata:${l.id}`, jenis: 'nyata', judul: `Pertimbangkan ${l.nama}`, alasan: `Lomba nyata, pendaftaran tutup ${l.hariLagi === 0 ? 'hari ini' : `${l.hariLagi} hari lagi`} · masih ada ${batas - slot.length} Slot kosong`, aksi: { tab: 'lomba', rute: 'radar' }, label: 'Lihat di Radar', bobot: 40 - l.hariLagi, prioritas: l.hariLagi <= 2 ? 'Sedang' : 'Rendah' });
    }
  }
  return out.sort((a, b) => b.bobot - a.bobot).slice(0, maks);
}
