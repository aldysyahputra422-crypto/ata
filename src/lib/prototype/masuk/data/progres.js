/* Data demo Progres: Slot, tugas, aktivitas, checklist submit. */

export const SLOT = [
  {
    id: 'lkki',
    nama: '2nd INTERVAL 2027',
    tenggat: '2027-03-01',
    wajib: 12,
    selesai: 5,
    tahap: [
      { nama: 'Topik dan kerangka', tanggal: '2026-11-10', selesai: true },
      { nama: 'Pengumpulan data', tanggal: '2026-12-05', selesai: false },
      { nama: 'Draf lengkap', tanggal: '2027-01-15', selesai: false },
      { nama: 'Final dan submit', tanggal: '2027-03-01', selesai: false },
    ],
  },
  {
    id: 'osn',
    nama: 'OSN Biologi (seleksi sekolah)',
    tenggat: '2027-01-20',
    wajib: 5,
    selesai: 1,
    tahap: [
      { nama: 'Peta materi', tanggal: '2026-11-25', selesai: true },
      { nama: 'Try out pertama', tanggal: '2026-12-20', selesai: false },
      { nama: 'Seleksi sekolah', tanggal: '2027-01-20', selesai: false },
    ],
  },
];

export const TUGAS = [
  { id: 't1', judul: 'Kumpulkan 5 jurnal pemilahan sampah', slot: 'lkki', tenggat: '2026-11-20', selesai: false },
  { id: 't2', judul: 'Wawancara 2 petugas kantin', slot: 'lkki', tenggat: '2026-11-18', selesai: false },
  { id: 't3', judul: 'Susun kerangka IMRaD', slot: 'lkki', tenggat: '2026-11-14', selesai: false },
  { id: 't4', judul: 'Petakan materi ekologi', slot: 'osn', tenggat: '2026-11-25', selesai: true },
];

/* Jumlah aktivitas per tanggal (dipakai heatmap 12 minggu). */
export const AKTIVITAS = {
  '2026-09-01': 1, '2026-09-03': 2, '2026-09-08': 1, '2026-09-15': 3, '2026-09-22': 1,
  '2026-09-29': 2, '2026-10-06': 2, '2026-10-07': 1, '2026-10-13': 3, '2026-10-20': 1,
  '2026-10-27': 2, '2026-11-03': 2, '2026-11-04': 1, '2026-11-05': 3, '2026-11-06': 2,
  '2026-11-09': 1, '2026-11-10': 2, '2026-11-11': 1, '2026-11-12': 2, '2026-11-13': 3,
  '2026-11-14': 1, '2026-11-16': 2, '2026-11-17': 1,
};

export const CHECKLIST_SUBMIT = [
  { id: 'aturan', label: 'Sudah baca juknis dan aturan AI', bobot: 25, selesai: true },
  { id: 'format', label: 'Format berkas sesuai ketentuan', bobot: 20, selesai: true },
  { id: 'sitasi', label: 'Semua rujukan tercantum dan bisa dibuka', bobot: 20, selesai: false },
  { id: 'biaya', label: 'Biaya pendaftaran sudah dicek', bobot: 10, selesai: true },
  { id: 'tautan', label: 'Tautan submit dan cadangan sudah disiapkan', bobot: 15, selesai: false },
  { id: 'pembimbing', label: 'Sudah minta izin pembimbing/sekolah', bobot: 10, selesai: false },
];

export const CHECKIN = {
  pertanyaan: [
    { id: 'selesai', tanya: 'Apa yang selesai minggu ini?', jenis: 'teks' },
    { id: 'kendala', tanya: 'Apa yang menghambat?', jenis: 'chip', opsi: ['Waktu', 'Kuota', 'Bingung mulai', 'Sakit', 'Alat', 'Motivasi'] },
    { id: 'butuh', tanya: 'Apa yang kamu butuhkan minggu depan?', jenis: 'teks' },
  ],
};
