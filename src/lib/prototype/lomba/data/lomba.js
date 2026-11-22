/* Demo profile and ten REAL competitions taken from Instagram competition posters (no fictional competitions).
   hariLagi: days until the deadline, relative to today; null = deadline not stated on the poster (show "cek juknis").
   Real entries only carry what the poster/caption states: unknown fee = biaya null, unknown eligibility = tingkat []. */
/* Dihitung saat dibaca, dari tanggal lokal pengguna (bukan UTC): tab yang tetap terbuka melewati tengah malam
   tidak menggeser tenggat poster ke hari berikutnya. */
const sisaHari = (iso, kini = new Date()) =>
  (iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(kini.getFullYear(), kini.getMonth(), kini.getDate())) / 864e5) : null);
const DILIHAT = 'Poster @infolomba, dilihat 20 November 2026';
const dilihat = (akun) => `Poster ${akun}, dilihat 21 November 2026`;
export const PROFIL = { nama: 'Raka', minat: ['karya-tulis', 'olimpiade', 'poster'], tingkat: 'SMA', jamPerMinggu: 4 };

export const NAMA_KATEGORI = { 'karya-tulis': 'karya tulis', poster: 'poster', video: 'video', bisnis: 'bisnis', olimpiade: 'olimpiade', pidato: 'pidato' };

/* Lomba NYATA (bukan data demo). Gambar: potongan poster asli di assets/lomba/. */
export const LOMBA_NYATA = [
  { id: 'essay-unesa-2026', nyata: true, nama: 'National Essay Competition 2026', penyelenggara: 'PGSD UNESA', kategori: 'karya-tulis', tingkat: ['SMA', 'SMK', 'MA', 'mahasiswa'], cakupan: 'Nasional',
    biaya: 25000, hadiah: 'Juara 1: Rp750.000 + e-sertifikat', tenggatIso: '2026-11-24', hariLagi: sisaHari('2026-11-24'), gem: 'mint', gambar: 'assets/lomba/essay-unesa-2026.webp',
    syarat: ['Individu (perorangan)', 'Pelajar SMA/SMK/MA atau mahasiswa D3/D4/S1', 'Tema: nilai-nilai keislaman menjawab tantangan generasi muda', 'Presentasi 10 finalis lewat Zoom, 27 November 2026'], sumber: DILIHAT },
  { id: 'onat-2026', nyata: true, nama: 'Olimpiade Nasional Akademik Trunodjoyo (ONAT) 2026', penyelenggara: 'Universitas Trunojoyo Madura', kategori: 'olimpiade', tingkat: ['SMA', 'SMK', 'MA'], cakupan: 'Nasional',
    biaya: 100000, hadiah: 'E-sertifikat; Special Certificate untuk Juara I–III', tenggatIso: '2026-11-25', hariLagi: sisaHari('2026-11-25'), gem: 'lemon', gambar: 'assets/lomba/onat-2026.webp',
    syarat: ['Bidang: Sains & Teknologi, Sosial & Humaniora, Bahasa Inggris, Bahasa Indonesia', 'Penyisihan CBT daring: 29 November 2026', 'Final CBT luring di kampus: 16 Desember 2026', 'Daftar di onat.my.id'], sumber: DILIHAT },
  { id: 'esdm-jurnalistik-2026', nyata: true, nama: 'Lomba Karya Jurnalistik & Fotografi Kementerian ESDM 2026', penyelenggara: 'Kementerian ESDM', kategori: 'karya-tulis', tingkat: [], cakupan: 'Nasional',
    biaya: 0, hadiah: 'Total Rp122,5 juta', tenggatIso: '2026-12-09', hariLagi: sisaHari('2026-12-09'), gem: 'sky', gambar: 'assets/lomba/esdm-jurnalistik-2026.webp',
    syarat: ['Tema: Menjaga Kedaulatan Energi & Mineral di Tengah Tantangan Global', 'Karya jurnalistik atau fotografi', 'Periode lomba: 9 November – 9 Desember 2026', 'Info: bit.ly/LombaJurnalistikFotografiESDM2026'], sumber: DILIHAT },
  { id: 'id-fest-2026', nyata: true, nama: 'Integrity Day Festival (ID FEST) 2026', penyelenggara: 'ID FEST · @idfest_pknstan', kategori: 'karya-tulis', tingkat: ['SMA', 'mahasiswa', 'umum'], cakupan: 'Cek juknis',
    biaya: null, hadiah: 'Hadiah jutaan rupiah, merchandise, e-sertifikat', tenggatIso: null, hariLagi: null, gem: 'rose', gambar: 'assets/lomba/id-fest-2026.webp',
    syarat: ['5 cabang: debat, policy brief, olimpiade, video, poster', 'Tema: Beyond Rules, Building a Culture of Integrity', 'Juknis: linktr.ee/IDFest2026'], sumber: DILIHAT },
  { id: 'area-creator-8', nyata: true, nama: 'Area Creator 8 Surabaya', penyelenggara: 'Creha Project', kategori: 'video', tingkat: [], cakupan: 'Surabaya',
    biaya: null, hadiah: 'Belum tertulis di poster', tenggatIso: null, hariLagi: null, gem: 'apricot', gambar: 'assets/lomba/area-creator-8.webp',
    syarat: ['Cabang: Animation Awards, Cosplay ICL & Coswalk, Japan Song, Comic Awards', 'Animation & Comic Awards: karya produksi 2025–2026', 'Acara: 6–7 Februari 2027, Convention Hall Tunjungan Plaza 3', 'Daftar: crehaproject.com/event/area-creator-8-surabaya'], sumber: DILIHAT },
  { id: 'interval-2027', nyata: true, nama: '2nd INTERVAL International Essay & Research Festival 2027', penyelenggara: 'IDEA Hub', kategori: 'karya-tulis', tingkat: ['SMA', 'SMK', 'MA', 'mahasiswa', 'umum'], cakupan: 'Internasional',
    biaya: 99000, hadiah: 'Juara: e-sertifikat, trofi, uang pembinaan. Semua peserta: e-sertifikat internasional', tenggatIso: '2026-11-30', hariLagi: sisaHari('2026-11-30'), gem: 'sky', gambar: 'assets/lomba/interval-2027.webp',
    syarat: ['Usia 15–27 tahun: pelajar, mahasiswa, atau umum', 'Individu atau tim 2–5 orang (satu ketua)', 'Batch 2: Rp99.000 / MYR 35 / USD 10 per karya', 'Pengumuman finalis 16 Januari 2027; acara di Vietnam 3–4 April 2027', 'Info: linktr.ee/INTERVALOFFICIAL'], sumber: dilihat('@lombabisnisplan') },
  { id: 'epic-12', nyata: true, nama: 'EPIC 12 Entrepreneurship Competition', penyelenggara: 'OU Festival 12 · Olimpiade Update', kategori: 'bisnis', tingkat: ['SMA', 'SMK', 'MA', 'mahasiswa'], cakupan: 'Nasional',
    biaya: null, hadiah: 'Grand prize iPad + peluang beasiswa Cakrawala University; Juara 1: medali emas + uang pembinaan', tenggatIso: '2026-11-22', hariLagi: sisaHari('2026-11-22'), gem: 'apricot', gambar: 'assets/lomba/epic-12.webp',
    syarat: ['Tim 2–3 orang dari sekolah/kampus yang sama', 'Tahap BMC gratis; biaya tahap berikutnya cek juknis', 'Kumpulkan BMC sampai 29 November 2026; proposal 3–29 Desember 2026', 'Daring. Juknis: bit.ly/12EPIC · daftar: ou-festival.com'], sumber: dilihat('@lombabisnisplan') },
  { id: 'cipta-karya-2026', nyata: true, nama: 'Cipta Karya Tingkat Nasional', penyelenggara: 'Penerbit Antero (@penerbitantero)', kategori: 'karya-tulis', tingkat: [], cakupan: 'Nasional',
    biaya: 0, hadiah: 'Royalti Rp3 juta / Rp2 juta / Rp1 juta + trofi + buku; e-sertifikat untuk semua penulis', tenggatIso: '2026-11-26', hariLagi: sisaHari('2026-11-26'), gem: 'rose', gambar: 'assets/lomba/cipta-karya-2026.webp',
    syarat: ['Jenis karya: puisi, cerpen, esai, quote, surat, artikel, pantun', 'Tema bebas', 'Wajib follow @penerbitantero, komentar, tag teman, dan share poster', 'Daftar & kirim naskah lewat WhatsApp 0851-6886-9674', 'Pengumuman 6 Desember 2026'], sumber: dilihat('@infolomba_gratis') },
  { id: 'kspi-2026', nyata: true, nama: 'Kompetisi Sains Pelajar Indonesia (KSPI) 2026', penyelenggara: 'Puskantara (Pusat Kejuaraan Pelajar Nusantara)', kategori: 'olimpiade', tingkat: ['SD', 'SMP', 'SMA', 'SMK', 'MA', 'mahasiswa'], cakupan: 'Nasional',
    biaya: 0, hadiah: 'Medali, piagam, beasiswa Rp1 juta, headphone, TWS, power bank', tenggatIso: '2026-11-21', hariLagi: sisaHari('2026-11-21'), gem: 'lemon', gambar: 'assets/lomba/kspi-2026.webp',
    syarat: ['Pendaftaran reguler gratis dengan syarat; Member VIP Rp50.000', 'Bidang SMA antara lain Matematika, Fisika, Kimia, Biologi, Ekonomi, Informatika', 'Ujian daring Minggu, 22 November 2026 di cbt.pusatprestasi.id', 'Pengumuman 24 November 2026 · panduan: bit.ly/PANDUANKSPI2026'], sumber: dilihat('@infolomba_gratis') },
  { id: 'digicomp-2026', nyata: true, nama: 'DIGICOMP 2026 Business Plan Competition', penyelenggara: 'DIGICOMP 2026', kategori: 'bisnis', tingkat: ['SMA', 'SMK', 'MA', 'mahasiswa'], cakupan: 'Cek juknis',
    biaya: 200000, hadiah: 'Total hadiah jutaan rupiah + e-sertifikat; bootcamp & mentoring', tenggatIso: '2026-10-30', hariLagi: sisaHari('2026-10-30'), gem: 'mint', gambar: 'assets/lomba/digicomp-2026.webp',
    syarat: ['Tim 3–4 orang', 'Tema: Building the Future with Digital Innovation', 'Biaya Rp200.000 per tim', 'Pendaftaran 3–30 Oktober 2026 (sudah ditutup)'], sumber: dilihat('@infolomba.sma') }
];

/* katalog yang dipakai aplikasi: hanya lomba nyata dari poster. Tidak ada lomba fiktif. */
for (const l of LOMBA_NYATA) {
  if (l.tenggatIso) Object.defineProperty(l, 'hariLagi', { enumerable: true, get: () => sisaHari(l.tenggatIso) });
}

export const LOMBA = LOMBA_NYATA;
