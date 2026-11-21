/* Profil demo (sama dengan kelompok 2) dan Slot aktif. Semua nilai adalah DATA DEMO. */

export const PROFIL = {
  nama: 'Raka',
  jenjang: 'SMA kelas 11',
  sekolah: 'SMAN 3 Bandung',
  minat: 'lingkungan dan data',
  kekuatan: 'menulis cepat, rajin riset',
  hambatan: 'sulit menyusun jadwal',
  waktu: '90 menit per hari',
  perangkat: 'laptop pinjaman, kuota terbatas',
};

export const SLOT = {
  id: 'interval-2027',
  judul: '2nd INTERVAL International Essay & Research Festival 2027',
  jenis: 'kti',
  penyelenggara: 'IDEA Hub',
  tenggat: '30 November 2026',
  biaya: 'rp99.000',
  /* disclose | forbidden | unknown — dipakai catatan integritas dan pengingat sitasi */
  aiPolicy: 'unknown',
  /* Juknis belum diunggah: Ata wajib bilang tidak tahu soal aturan rinci. */
  juknis: false,
  ringkasJuknis: '',
  topik: '',
};

export const TUGAS = [
  { id: 't1', judul: 'Kumpulkan 5 jurnal pemilahan sampah', tenggat: '2026-11-20', selesai: false },
  { id: 't2', judul: 'Susun kerangka IMRaD', tenggat: '2026-11-23', selesai: false },
  { id: 't3', judul: 'Wawancara 2 petugas kantin', tenggat: '2026-11-25', selesai: false },
];

export const AKSI_CEPAT = [
  { id: 'review', label: 'Review ideku', isi: 'Review ideku: ' },
  { id: 'pecah', label: 'Pecah tugas ini', isi: 'Pecah tugas ini jadi langkah kecil: ' },
  { id: 'juri', label: 'Simulasi juri', isi: 'Simulasi juri untuk karyaku: ' },
  { id: 'mentok', label: 'Aku mentok', isi: 'Aku mentok. ' },
  { id: 'aturan', label: 'Cek aturan lomba', isi: 'Cek aturan lomba: ' },
];
