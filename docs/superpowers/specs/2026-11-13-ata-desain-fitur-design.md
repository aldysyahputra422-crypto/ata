# Desain fitur Ata: putaran prototipe sampai siap frontend

Tanggal: 13 November 2026 · Status: menunggu persetujuan Product Owner

## 1. Maksud dan alasan

Ata harus terasa bagi **calon pengguna** (siswa SMA/SMK yang ikut lomba, dan orang tuanya) sebagai tiga hal sekaligus:

- **Premium:** tampilan setara empat layar yang sudah jadi (palet senja hangat, kaca, 3D dari Blender).
- **Berguna:** Ata berperan seperti **dosen pembimbing lomba** di universitas besar, tetapi lebih baik: selalu ada, ingat profil siswa, dan memecah lomba jadi langkah harian. Siswa dan orang tua bisa melihat **apa saja yang sudah dicapai** selama memakai Ata.
- **Canggih:** gerak dan interaksi yang terasa seperti game, dipakai di momen penting saja (bukan di semua layar).

Hasil akhirnya adalah prototipe yang bisa dibuka calon pengguna di HP dan desktop, sekaligus cukup lengkap untuk langsung dikoding tanpa banyak revisi.

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- Semua fitur di bagian 6 punya layar lengkap: keadaan normal, memuat, kosong, galat, dan keadaan khusus fiturnya.
- Tiap layar jalan di HP (390 px) dan desktop (1280 px), tema terang dan gelap.
- Bahasa UI sesuai PRD 9.7: "kamu" untuk pengguna, "Ata" untuk diri sendiri, tanpa kalimat motivasi generik.
- Data contoh berlabel "DATA DEMO", nama penyelenggara fiktif.

**Bukan sasaran putaran ini**
- Panel Admin (PRD A.4: admin memakai dashboard Supabase dulu).
- Kode produksi, API, dan database. Prototipe ini HTML/CSS/JS statis dengan data contoh.
- Suara juri (text-to-speech). Disiapkan sebagai opsi nanti, tidak didesain sekarang.

**Anti-sasaran (gagal walau secara teknis jalan)**
- Efek 3D yang membuat HP berat atau baterai cepat habis. Efek kaya hanya di desktop atau di momen tertentu, dan selalu menghormati `prefers-reduced-motion`.
- Simulator juri yang terasa seperti chatbot biasa, tanpa rasa sidang dan tanpa pelajaran di akhir.
- Biaya API key siswa yang mengejutkan. Perkiraan biaya selalu tampil sebelum sesi berbayar dimulai.
- Ajakan mentor yang melanggar PRD 10.5 (hitung mundur palsu, klaim juara, menakut-nakuti, harga ke pengguna di bawah 18 tahun).
- Maskot dibuat ulang oleh AI. Maskot hanya dari 7 pose resmi di `ata-prototype/assets/`.

## 3. Batasan

- **Otoritas:** PRD Lampiran D > design system > bagian PRD lain. Palet **senja** (koral, peach, merah muda) yang disetujui Product Owner pada 12 November 2026 menggantikan palet ungu di `docs/DESIGN-SYSTEM.md`; dokumen itu perlu diperbarui sebagai langkah pertama.
- **Profil Demo:** semua layanan tier gratis. Fitur AI memakai API key milik siswa (BYOK).
- **Render 3D:** Mac Product Owner berprosesor dua inti; satu render Cycles penuh memakan 10 sampai 45 menit. Rencanakan render sesedikit mungkin dan uji di resolusi kecil dulu.
- **Aset 3D unduhan** (ruang keluarga, loft, panggung, labirin) hanya untuk prototipe internal sampai lisensinya dicek.
- **Google Drive:** izin hanya `drive.file` (Ata hanya bisa melihat berkas yang dibuatnya sendiri), disimpan di folder "Ata" di Drive siswa.

## 4. Pendekatan yang dipertimbangkan

| | Pendekatan | Untung | Rugi |
|---|---|---|---|
| A | Satu prototipe besar, semua layar di artifact yang sekarang | Satu tautan | Berkas sudah 90 KB, berat di HP; revisi kecil bisa merusak layar lain |
| **B (dipilih)** | **Prototipe per kelompok fitur dengan satu fondasi bersama, plus halaman beranda** | Revisi aman dan cepat, ringan di HP, fondasi langsung dipakai saat koding | Beberapa tautan; fondasi harus dijaga konsisten |
| C | Langsung dibangun sebagai komponen React di repo | Tanpa langkah terjemahan | Revisi desain lambat, eksperimen 3D sulit |

Product Owner memilih **B** pada 13 November 2026.

## 5. Keputusan yang sudah diambil

### 5.1 Ata sebagai dosen pembimbing
Tanya Ata, Peta Jalan, dan Resep disatukan dalam satu peran: pembimbing yang mengenal profil siswa, mengusulkan langkah, menagih kemajuan, dan memberi umpan balik. Nadanya pembimbing yang hangat dan lugas, bukan asisten serba-bisa.

### 5.2 Simulator Juri (fitur baru)
- Ata punya **20 karakter juri** fiktif dengan kepribadian berbeda (misalnya akademisi teliti metodologi, praktisi industri, juri awam, desainer, juri yang suka menyela, juri yang diam lalu bertanya tajam).
- Untuk satu sesi, Ata memilih **panel 3 sampai 5 juri berdasarkan juknis lomba** yang dilampirkan siswa, dan menjelaskan kenapa juri itu yang dipilih. Siswa boleh mengulang dengan panel lain.
- Siswa **menjawab dengan bicara** (diubah ke teks di perangkat); **ketik** tersedia sebagai cadangan. Juri membalas dalam bentuk teks dengan wajah dan nama karakternya.
- Di akhir sesi, tiap juri menjelaskan **alasan di balik pertanyaannya**, ditambah ringkasan penilaian berdasarkan kriteria di juknis.
- Fitur ini **terbuka dengan API key siswa sendiri**.
- Suasana: ruang sidang 3D dari aset `STAGE.blend` (podium, panggung, deretan kursi), dalam palet senja.

### 5.3 API key dan mitra agregator lokal
- Layar "Sambungkan AI" menampilkan **mitra yang direkomendasikan** (agregator API key lokal) di urutan atas: harga rupiah, bisa bayar QRIS, cocok untuk Simulator Juri. Penyedia global ada di bawahnya.
- Setiap fitur yang memakai key menampilkan **perkiraan biaya per sesi** sebelum dimulai.
- Slot mitra cukup ditambahkan sebagai kolom di registri `content/providers.json`.

### 5.4 Portofolio dan galeri sertifikat (fitur baru)
- Siswa dan orang tua melihat pencapaian selama memakai Ata: lomba diikuti, hasil, lencana, jam belajar.
- Siswa bisa **mengirim sertifikat** (foto atau PDF) ke Ata. Ata merapikan datanya (nama lomba, penyelenggara, tingkat, tahun, peringkat), dan **berkasnya disimpan di Google Drive milik siswa**, bukan di server Ata.
- Tampilan portofolio memakai dossier (buku 3D) dan Bioskop yang sudah ada.

### 5.5 Akses orang tua
- Lewat **tautan baca-saja dari siswa**, bisa dicabut kapan saja, tanpa perlu akun.
- Melengkapi **Laporan Bulanan PDF** dari PRD 5.8.

### 5.6 Struktur prototipe
- `ata-prototype/shared/`: token, kaca, ikon, komponen dasar (tombol, kartu, chip permata, status, lembar, toast, cincin progres, folder, kartu poster), dan maskot.
- Satu halaman beranda yang menautkan semua prototipe kelompok fitur.
- Tiap kelompok fitur adalah satu artifact sendiri, memakai fondasi bersama.

## 6. Urutan dan isi tiap kelompok

Urutan dipilih dari yang paling membuat calon pengguna merasa "ini berguna".

1. **Simulator Juri dan Sambungkan AI:** pilih lomba dan lampirkan juknis; Ata memilih panel dan menjelaskan alasannya; perkiraan biaya; ruang sidang 3D; sesi tanya-jawab (bicara/ketik, juri bergiliran); hasil dan alasan tiap juri; riwayat sesi. Ditambah alur Sambungkan AI (mitra, penyedia global, uji key, galat key ditolak).
2. **Lomba:** Radar (digest harian, filter, riwayat 7 hari, keadaan dijeda, unggah poster manual), detail lomba, Slot (maks 3, penolakan Slot ke-4), Peta Jalan (usulan Ata, setujui, sunting langkah).
3. **Tanya Ata sebagai pembimbing:** chat dengan konteks profil, Mode Tanpa Key, Resep (stepper dan pratinjau privasi), Racikan, Ingatan Ata (lihat, sunting, hapus).
4. **Portofolio:** galeri sertifikat dengan alur kirim dan izin Drive, ringkasan pencapaian, tautan orang tua (buat, salin, cabut, tampilan yang dilihat orang tua), Laporan Bulanan (pratinjau PDF).
5. **Masuk, onboarding, Progres, Pengaturan, Paket:** login Google dan akun demo, Ambition Profile L0 sampai L1, Progres (cincin, linimasa, heatmap, timer fokus), Pengaturan (tema, Efek Kaca, notifikasi, API key), Paket (aktivasi demo, status keanggotaan).

Setelah tiap kelompok selesai: Product Owner meninjau di HP dan desktop, revisi satu putaran, lalu kelompok berikutnya.

## 7. Keputusan yang diserahkan ke pembuat (tercatat sebagai keputusan Claude)

- **Ruang lingkup Simulator Juri:** karya yang diterima PDF dan gambar; video cukup tautan dan ringkasan teks. Penilaian berupa rubrik dari kriteria juknis, dengan catatan "simulasi, bukan nilai resmi".
- **Privasi sesi juri:** sesi tidak terlihat di tautan orang tua kecuali siswa memilih menampilkannya.
- **Sertifikat lama:** prestasi sebelum memakai Ata boleh dimasukkan dengan label "sebelum Ata". Sertifikat yang masuk ikut memberi lencana dan XP di dossier.
- **Tanpa API key:** sertifikat tetap bisa dikirim, tetapi datanya diisi manual; Simulator Juri menampilkan ajakan menyambungkan key.
- **Ajakan mentor:** kartu lembut "Dari Sobat Ambis" muncul setelah sesi Simulator Juri selesai, sesuai pemicu "Simulasi juri" di PRD 10.5.
- **Nama di UI:** "Sidang Juri" untuk Simulator Juri, "Galeri" untuk galeri sertifikat. Bisa diganti.
- Detail layout, copy, ilustrasi tambahan, dan animasi mikro diputuskan pembuat dalam batas design system.
