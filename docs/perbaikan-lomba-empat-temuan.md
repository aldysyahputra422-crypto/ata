# Lomba: empat temuan uji browser (ata PR #11)

Ditemukan saat uji browser Lomba di aplikasi Next.js; tiga yang pertama direproduksi di prototipe ini pada kode sebelum perbaikan.
Diukur dengan Chromium (Playwright) pada 390×844 dan 1280×900, tema terang dan gelap.

## A. Folder Slot saat `prefers-reduced-motion: reduce`

**Gejala.** Panel terbuka, tetapi Escape dan tombol Tutup tidak bekerja dan fokus tetap di luar panel. Konsol: `Cannot access 'panel' before initialization`.

**Penyebab.** `bukaFolder()` memanggil `transisiTampilan(callback)` sebelum `const panel`, `const tutup`, dan `const esc_` dideklarasikan. Dengan animasi, callback dijalankan belakangan sehingga ketiganya sudah ada. Tanpa animasi (gerak dikurangi, atau browser tanpa View Transitions), `transisiTampilan` menjalankan callback saat itu juga; `pasang()` lalu membaca `panel` di zona mati temporal dan melempar galat. HTML panel sudah terpasang, tetapi handler tutup, fokus, dan perangkap Tab tidak pernah terpasang, dan pendengar Escape tidak pernah didaftarkan.

**Perbaikan.** Deklarasi `panel`, `tutup`, `esc_`, dan pendaftaran Escape dipindah ke atas pemanggilan `transisiTampilan`. Menutup tidak bergantung pada selesainya animasi: isi panel dihapus di dalam callback, yang berjalan langsung saat gerak dikurangi.

## B. Kueri Radar tertimpa

**Gejala.** Kueri yang diketik segera setelah Radar terbuka berubah kembali menjadi usulan awal (atau bercampur dengannya) sekitar satu detik kemudian.

**Penyebab.** Nilai kotak kueri hanya hidup di DOM. `view()` selalu menulis usulan dari profil ke atribut `value`, dan Radar menggambar ulang seluruh layar ketika kartu siap (700 ms setelah dibuka), ketika data Slot berubah, dan setelah tarik-untuk-segarkan. Setiap gambar ulang mengganti `<input>` dengan yang baru berisi usulan awal, dan fokus serta kursor ikut hilang.

**Perbaikan.** Kueri menjadi keadaan modul (`kueri`): `null` berarti belum disentuh dan usulan profil dipakai; begitu pengguna mengetik, nilainya disimpan pada setiap peristiwa `input` dan semua gambar ulang membacanya lewat `nilaiKueri()`. Fokus dan posisi kursor dipulihkan setelah gambar ulang. Jeda inisialisasi tidak diubah.

## C. Seret poster dengan mouse

**Gejala.** Menyeret kartu dari gambar poster dengan mouse tidak memutuskan apa pun; dari badan kartu dan dengan sentuhan berhasil.

**Penyebab.** `<img>` bisa diseret secara bawaan. Browser memulai seret-dan-lepas gambar, mengirim `pointercancel` ke kartu, dan handler kartu membatalkan geseran.

**Perbaikan.** Kedua `<img>` poster diberi `draggable="false"`, dan kartu membatalkan `dragstart` (juga menutup seret tautan atau teks terpilih). Klik untuk membuka Detail dan geser dengan sentuhan tidak berubah.

## D. Kontras teks di atas foto

Rasio dihitung dari piksel screenshot: warna teks hasil render terhadap setiap piksel latar di kotak teks (teks disembunyikan saat latar dipotret). Angka di bawah adalah persentil ke-5 (hampir terburuk). Semua teks ini berukuran normal, batas 4,5:1.

| Teks | Viewport, tema | Sebelum | Sesudah | Perubahan |
|---|---|---|---|---|
| "Tidak ada yang dilewati." | 390 terang | 3,27 | 6,22 | warna `--teks-di-foto` |
| | 1280 terang | 3,25 | 6,19 | |
| Eyebrow tenggat Peta Jalan | 1280 terang | 3,65 | 6,95 | warna `--teks-di-foto` |
| | 1280 gelap | 4,00 | 6,11 | |
| "Tambah langkah" | 1280 terang | 4,47 | 8,77 | alas tembus pandang 46 % |
| "N% cocok" (Detail desktop) | 1280 terang | 3,50 | 5,69 | `--aksen-teks` + alas pil tembus pandang |
| | 1280 gelap | 3,64 | 6,47 | |
| "Sumber: …" (Detail desktop) | 1280 terang | 2,69 | 5,13 | warna `--teks-di-foto` |
| Penghitung karusel "1 / 6" | 1280 terang | 2,32 | 7,35 | `--teks-di-foto` + alas pil tembus pandang |

Hasil akhir: 116 teks diukur di lima layar Lomba × 2 viewport × 2 tema, 0 di bawah batas (sebelum: 9). Foto dan tirai halaman tidak diubah; aturan ada di `shared/lingkungan.css` ("kontras putaran 4"). Perubahan di Detail hanya berlaku pada tata letak desktop, karena di HP isinya berdiri di atas lembar beralas.

Nilai terendah yang tersisa: baris meta Detail desktop tema gelap, 4,70:1.
