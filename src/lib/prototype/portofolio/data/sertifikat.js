/* Data demo Galeri sertifikat (kelompok 4). Semua entri adalah DATA DEMO. */

export const KATEGORI = [
  { id: 'kti', label: 'KTI', gem: 'g-mint' },
  { id: 'business', label: 'Business plan', gem: 'g-apricot' },
  { id: 'olimpiade', label: 'Olimpiade', gem: 'g-lemon' },
  { id: 'desain', label: 'Desain', gem: 'g-coral' },
  { id: 'menulis', label: 'Menulis', gem: 'g-rose' },
  { id: 'video', label: 'Video', gem: 'g-sky' },
];

export const TINGKAT = ['Sekolah', 'Kota/Kabupaten', 'Provinsi', 'Nasional', 'Internasional'];

export const SERTIFIKAT_AWAL = [
  {
    id: 's1',
    nama: 'LKTI Garuda Muda 2026',
    penyelenggara: 'Yayasan Garuda Muda',
    tingkat: 'Nasional',
    tahun: 2026,
    peringkat: 'Finalis',
    kategori: 'kti',
    berkas: 'sertifikat-lkti-2026.jpg',
    ukuranBytes: 2_400_000,
    drive: 'tersimpan',
    sebelumAta: false,
    catatan: 'Finalis 10 besar. Berkas ada di folder "Ata/Sertifikat".',
  },
  {
    id: 's2',
    nama: 'Olimpiade Sains Kabupaten Biologi',
    penyelenggara: 'Dinas Pendidikan Kota Bandung',
    tingkat: 'Kota/Kabupaten',
    tahun: 2025,
    peringkat: 'Juara 2',
    kategori: 'olimpiade',
    berkas: 'osk-biologi-2025.pdf',
    ukuranBytes: 1_100_000,
    drive: 'tersimpan',
    sebelumAta: true,
    catatan: 'Prestasi sebelum memakai Ata.',
  },
  {
    id: 's3',
    nama: 'Lomba Poster Kampanye Lingkungan',
    penyelenggara: 'Komunitas Bumi Bersih',
    tingkat: 'Provinsi',
    tahun: 2025,
    peringkat: 'Harapan 1',
    kategori: 'desain',
    berkas: 'poster-lingkungan-2025.png',
    ukuranBytes: 4_800_000,
    drive: 'antrean',
    sebelumAta: true,
    catatan: '',
  },
];

export const PENCAPAIAN = {
  lomba: 3,
  lencana: 4,
  jamFokus: 31,
  hariAktif: 19,
};
