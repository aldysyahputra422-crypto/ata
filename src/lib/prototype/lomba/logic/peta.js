/* Roadmap (Peta Jalan): Ata's proposed steps up to two days before the deadline, progress, date checks,
   and where each step sits along the maze path. Dates are ISO 'YYYY-MM-DD' strings. */
const TEMPLATE = {
  'karya-tulis': ['Baca juknis dan tentukan topik', 'Kumpulkan 8 referensi', 'Susun kerangka bab 1 sampai 3', 'Tulis draf lengkap', 'Latihan Sidang Juri', 'Revisi dari masukan', 'Finalisasi dan kirim karya'],
  poster: ['Baca juknis dan cari ide', 'Buat 3 sketsa kasar', 'Pilih sketsa dan susun tata letak', 'Kerjakan desain final', 'Minta masukan', 'Ekspor A3 300 dpi dan kirim'],
  video: ['Baca juknis dan tulis ide cerita', 'Susun naskah dan storyboard', 'Ambil gambar', 'Sunting kasar', 'Minta masukan', 'Sunting final dan unggah'],
  olimpiade: ['Pelajari kisi-kisi', 'Kerjakan soal tahun lalu bab 1', 'Kerjakan soal tahun lalu bab 2', 'Simulasi ujian 120 menit', 'Bahas soal yang salah', 'Simulasi terakhir dan istirahat'],
  bisnis: ['Baca juknis dan tentukan ide', 'Riset pasar singkat', 'Susun proposal', 'Hitung keuangan sederhana', 'Latihan Sidang Juri untuk pitch', 'Rekam video pitch dan kirim'],
  pidato: ['Baca juknis dan tentukan pesan utama', 'Tulis naskah', 'Latihan dengan timer', 'Latihan Sidang Juri', 'Perbaiki naskah dan kirim']
};

export function tambahHari(iso, n) {
  const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const fmt = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'UTC' });

export function usulkanLangkah(lomba, hariIni) {
  const nama = (TEMPLATE[lomba.kategori] || TEMPLATE.poster).slice(0, 8);
  /* tenggat belum tertulis: rencanakan 30 hari, tapi katakan bahwa tanggalnya hanya perkiraan */
  if (lomba.hariLagi === null || lomba.hariLagi === undefined) {
    const u = usulkanLangkah({ ...lomba, hariLagi: 30 }, hariIni);
    return { ...u, peringatan: 'Tenggat belum tertulis di poster. Tanggal langkah ini perkiraan 30 hari; sesuaikan setelah cek juknis.' };
  }
  const h = lomba.hariLagi;
  const buat = (list, hari) => list.map((n, i) => ({ id: 'l' + i, nama: n, tanggal: tambahHari(hariIni, hari(i, list.length)), selesai: false }));
  if (h < 3) {
    const pendek = [nama[0], nama[Math.floor(nama.length / 2)], nama.at(-1)];
    return { langkah: buat(pendek, (i, n) => Math.min(h, Math.round((i * h) / (n - 1)))),
      peringatan: `Waktunya mepet: tinggal ${h} hari. Ata meringkas jadi ${pendek.length} langkah inti.` };
  }
  return { langkah: buat(nama, (i, n) => Math.round(1 + (i * (h - 3)) / (n - 1))), peringatan: null };
}

export function progres(langkah) {
  const selesai = langkah.filter((l) => l.selesai).length;
  return { selesai, total: langkah.length, persen: langkah.length ? Math.round((selesai / langkah.length) * 100) : 0 };
}

export function validasiTanggal(tgl, tenggat, hariIni) {
  if (!tgl) return 'Pilih tanggal dulu.';
  if (tgl < hariIni) return 'Tanggal ini sudah lewat.';
  if (tgl > tenggat) return `Melewati tenggat lomba (${fmt(tenggat)}).`;
  return null;
}

export function posisiLangkah(i, n) { return Math.round((0.12 + (n > 1 ? (0.8 * i) / (n - 1) : 0.4)) * 100) / 100; }
export { fmt as tanggalPanjang };
