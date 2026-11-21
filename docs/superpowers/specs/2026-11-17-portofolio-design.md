# Desain kelompok 4: Portofolio, Galeri Sertifikat, Akses Orang Tua

Tanggal: 17 November 2026 · Bagian dari `2026-11-13-ata-desain-fitur-design.md` (5.4, 5.5, 6.4) · Sumber: PRD 5.8, 6.7, 10.4 · Status: dibangun

## Maksud
Pencapaian siswa harus terlihat tanpa membuat siswa sibuk merapikan berkas. Ata mengubah foto sertifikat menjadi entri Galeri yang rapi, menyimpannya di Google Drive milik siswa, lalu menyusun Laporan Bulanan yang bisa dibaca orang tua dalam satu menit.

## Keputusan pembuat (17 Nov)
- **Galeri = kartu dossier.** Tiap sertifikat tampil sebagai kartu dengan permata kategori, tahun, peringkat, dan penanda sumber ("sebelum Ata" atau "lewat Ata"). Berkas asli tidak disimpan di server Ata — di prototipe, "Drive" disimulasikan dengan status per berkas.
- **Kirim sertifikat = unggah + isi manual.** Tanpa AI, data diisi sendiri (PRD 12: tanpa key tetap bisa). Dengan AI, layar menampilkan hasil ekstraksi yang **wajib diperiksa** sebelum disimpan.
- **Tautan orang tua = mode baca-saja.** Dibuat siswa, bisa dicabut kapan saja, tanpa akun orang tua. Bagian yang terlihat dipilih per tautan (lomba, laporan, sertifikat); chat dan Ingatan Ata tidak pernah ikut.
- **Laporan Bulanan = pratinjau A4 yang sama dengan hasil cetak.** Bagian bisa dimatikan; pesan pribadi maksimal 280 karakter; kode verifikasi tampil di halaman terakhir.

## Layar (segmen Galeri · Tautan · Laporan)
1. **Galeri** (`#galeri`): ringkasan angka (lomba, lencana, jam fokus), filter kategori + pencarian, kartu sertifikat, keadaan kosong, tombol "Kirim sertifikat".
2. **Kirim** (`#kirim`): unggah berkas (demo), isian nama lomba, penyelenggara, tingkat, tahun, peringkat, kategori; saklar "sebelum Ata"; izin Drive; keadaan galat (berkas > 10 MB, data kurang).
3. **Detail** (`#sertifikat`): pratinjau berkas, metadata, status Drive (tersimpan/di antrean/gagal), tombol "Buka di Drive", "Sunting", "Hapus" dengan urungkan.
4. **Tautan orang tua** (`#orang-tua`): buat tautan, pilih bagian yang terlihat, salin, kirim WhatsApp, cabut, dan **pratinjau tampilan orang tua** (read-only, tanpa navigasi aplikasi).
5. **Laporan** (`#laporan`): pilih bulan, pilih bagian, pesan pribadi, pratinjau A4 dua halaman, kode verifikasi, "Cetak / Simpan PDF".

## Logika yang diuji otomatis
- Validasi sertifikat: nama lomba, penyelenggara, tahun masuk rentang, peringkat opsional, ukuran berkas ≤ 10 MB, kategori dari taksonomi tetap.
- Urutan dan penyaringan Galeri (tahun terbaru dulu; filter kategori + kata kunci).
- Tautan orang tua: token, masa berlaku 30 hari, pencabutan, dan **bagian terlarang** (chat, ingatan) tidak pernah lolos.
- Laporan: periode, ringkasan angka, pemilihan bagian, pesan ≤ 280 karakter, kode verifikasi deterministik, dan **tidak memuat** kata kunci chat/ingatan/key.
- Status umum laporan memakai kata ("Sesuai rencana", "Perlu perhatian"), bukan hanya warna.

## Bukan sasaran
Google Drive sungguhan, PDF server-side, unggah ke Supabase Storage, render QR, dan verifikasi publik lewat rute `/verifikasi/*`.
