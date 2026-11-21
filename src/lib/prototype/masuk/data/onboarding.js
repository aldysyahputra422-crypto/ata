/* Tujuh langkah onboarding L0 → L1. Satu pertanyaan utama per layar. */

export const JENJANG = ['SMP', 'SMA/SMK', 'Kuliah D3–S1', 'Lainnya'];

export const MINAT = [
  'KTI', 'Esai', 'Olimpiade', 'Business plan', 'PKM', 'Desain',
  'Menulis', 'Video', 'Debat', 'Hackathon',
];

export const TARGET = ['Juara', 'Portofolio PTN', 'Beasiswa', 'Pengalaman', 'Uang saku', 'Skill'];

export const LANGKAH = [
  {
    id: 'nama',
    judul: 'Siapa nama panggilanmu?',
    tanya: 'Aku akan memakai nama ini di sapaan dan laporan.',
    jenis: 'teks',
    wajib: true,
    kunci: 'nama',
    contoh: 'Raka',
  },
  {
    id: 'jenjang',
    judul: 'Sekarang di jenjang apa?',
    tanya: 'Jenjang menentukan lomba yang aku sarankan.',
    jenis: 'pilihan',
    wajib: true,
    kunci: 'jenjang',
    opsi: JENJANG,
  },
  {
    id: 'tahunLahir',
    judul: 'Tahun lahirmu?',
    tanya: 'Dipakai untuk gerbang usia dan menyesuaikan lomba.',
    jenis: 'tahun',
    wajib: true,
    kunci: 'tahunLahir',
  },
  {
    id: 'sekolah',
    judul: 'Sekolah atau kampusmu?',
    tanya: 'Boleh dilewati. Membantu aku menyarankan lomba tingkat lokal.',
    jenis: 'teks',
    wajib: false,
    kunci: 'sekolah',
    contoh: 'SMAN 3 Bandung',
  },
  {
    id: 'minat',
    judul: 'Lomba apa yang paling menarik?',
    tanya: 'Pilih maksimal lima. Bisa diubah kapan saja.',
    jenis: 'chip',
    wajib: false,
    kunci: 'minat',
    opsi: MINAT,
  },
  {
    id: 'target',
    judul: 'Apa target utamamu?',
    tanya: 'Aku memakai ini untuk memilih lomba yang layak kamu kejar.',
    jenis: 'chip',
    wajib: false,
    kunci: 'target',
    opsi: TARGET,
  },
  {
    id: 'jam',
    judul: 'Berapa jam per minggu kamu bisa belajar?',
    tanya: 'Belum tahu? Lewati saja. Aku pakai perkiraan lima jam.',
    jenis: 'pilihan',
    wajib: false,
    kunci: 'jam',
    opsi: ['2–4 jam', '5–7 jam', '8–10 jam', 'Lebih dari 10 jam'],
  },
];

/* Bobot untuk meter "Ata kenal kamu X%". */
export const BOBOT = {
  nama: 12,
  jenjang: 14,
  tahunLahir: 10,
  sekolah: 6,
  minat: 20,
  target: 20,
  jam: 8,
  pengalaman: 10,
};
