/* Data demo untuk Laporan Bulanan (kelompok 4). Selaras dengan Slot LKTI di kelompok 2/3. */

export const BULAN = [
  { id: '2026-11', label: 'November 2026' },
  { id: '2026-10', label: 'Oktober 2026' },
  { id: '2026-09', label: 'September 2026' },
];

export const AKTIVITAS = [
  { id: 'a1', tanggal: '2026-11-03', judul: 'Menyusun kerangka KTI', lomba: 'LKTI Garuda Muda 2027', menit: 90, hasil: 'Selesai' },
  { id: 'a2', tanggal: '2026-11-04', judul: 'Membaca 3 jurnal pemilahan sampah', lomba: 'LKTI Garuda Muda 2027', menit: 60, hasil: 'Selesai' },
  { id: 'a3', tanggal: '2026-11-05', judul: 'Menulis latar belakang', lomba: 'LKTI Garuda Muda 2027', menit: 75, hasil: 'Selesai' },
  { id: 'a4', tanggal: '2026-11-06', judul: 'Wawancara petugas kantin', lomba: 'LKTI Garuda Muda 2027', menit: 45, hasil: 'Selesai' },
  { id: 'a5', tanggal: '2026-11-09', judul: 'Merapikan metode penelitian', lomba: 'LKTI Garuda Muda 2027', menit: 60, hasil: 'Selesai' },
  { id: 'a6', tanggal: '2026-11-10', judul: 'Latihan soal olimpiade', lomba: 'OSN Biologi', menit: 50, hasil: 'Selesai' },
  { id: 'a7', tanggal: '2026-11-11', judul: 'Menyunting abstrak', lomba: 'LKTI Garuda Muda 2027', menit: 40, hasil: 'Selesai' },
  { id: 'a8', tanggal: '2026-11-12', judul: 'Konsultasi guru pembimbing', lomba: 'LKTI Garuda Muda 2027', menit: 30, hasil: 'Selesai' },
  { id: 'a9', tanggal: '2026-11-13', judul: 'Memperbaiki sitasi APA', lomba: 'LKTI Garuda Muda 2027', menit: 55, hasil: 'Selesai' },
  { id: 'a10', tanggal: '2026-11-14', judul: 'Membuat poster kampanye', lomba: 'Lomba Poster Bumi Bersih', menit: 65, hasil: 'Selesai' },
  { id: 'a11', tanggal: '2026-11-16', judul: 'Menyusun anggaran KTI', lomba: 'LKTI Garuda Muda 2027', menit: 35, hasil: 'Sebagian' },
  { id: 'a12', tanggal: '2026-11-17', judul: 'Latihan presentasi 3 menit', lomba: 'LKTI Garuda Muda 2027', menit: 25, hasil: 'Sebagian' },
];

export const LOMBA = [
  {
    nama: 'LKTI Garuda Muda 2027',
    penting: '2027-03-01',
    kemajuan: 42,
    status: 'Berjalan',
    langkah: 'Selesaikan bagian hasil',
  },
  {
    nama: 'OSN Biologi (seleksi sekolah)',
    penting: '2027-01-20',
    kemajuan: 20,
    status: 'Berjalan',
    langkah: 'Petakan materi ekologi',
  },
];

export const CATATAN_MENTOR = {
  ada: true,
  penulis: 'Bu Sri (guru pembimbing)',
  teks: 'Kerangka sudah rapi. Bagian metode perlu menyebut jumlah responden dan cara memilihnya.',
};

export const RENCANA = [
  'Menyelesaikan bagian hasil dan pembahasan KTI',
  'Mengumpulkan 5 rujukan tambahan',
  'Latihan soal olimpiade 3 kali seminggu',
];
