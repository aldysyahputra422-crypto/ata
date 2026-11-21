# Desain kelompok 5: Masuk, Onboarding, Progres, Pengaturan, Paket

Tanggal: 17 November 2026 · Bagian dari `2026-11-13-ata-desain-fitur-design.md` (6.5) · Sumber: PRD 5.1, 5.2, 5.4, 7.1, 9.2 · Status: dibangun

## Maksud
Masuk harus selesai di bawah satu menit, onboarding harus terasa seperti ngobrol (bukan formulir), dan Progres harus jujur: angka kecil yang benar lebih baik daripada cincin penuh yang mengarang.

## Keputusan pembuat (17 Nov)
- **Masuk:** Google (demo langsung) dan OTP email 6 digit dengan jalur demo `000000`. Batas 5 percobaan per 10 menit, kirim ulang setelah 60 detik, kode kedaluwarsa 10 menit. Galat ditampilkan sebagai kartu dengan tindakan, bukan teks merah di bawah tombol.
- **Onboarding L0 → L1 dalam 7 layar**, satu pertanyaan utama per layar, "Lewati" untuk yang non-kritis (minat, pengalaman, jam belajar). Autosave per langkah; meter "Ata kenal kamu X%" dihitung dari bobot field.
- **Progres:** cincin per Slot (maks 3) dengan sisa hari, linimasa tugas, heatmap 12 minggu (tabel alternatif untuk pembaca layar), timer fokus 25/45 menit yang mencatat sesi, check-in mingguan 3 pertanyaan, dan kesiapan submit dari checklist.
- **Pengaturan:** tema (terang/gelap/sistem), Efek Kaca (penuh/ringan/mati), notifikasi, data demo (reset), hapus akun dengan konfirmasi ketik nama.
- **Paket:** Gratis vs Pro; aktivasi demo memakai kode `DEMO-PRO`, tanpa payment gateway (Lampiran D).

## Layar
1. **Masuk** (`#masuk`): Google, OTP, keadaan galat (kode salah, kedaluwarsa, batas percobaan), kirim ulang dengan hitungan mundur, tautan Syarat & Privasi.
2. **Onboarding** (`#onboarding`): 7 langkah + layar selesai (tawaran pasang ke layar utama & notifikasi), meter kenal, lewati, kembali.
3. **Progres** (`#progres`): cincin Slot, linimasa, heatmap, timer fokus, check-in, kesiapan submit, "Tandai sudah submit".
4. **Pengaturan** (`#pengaturan`): tema, kaca, notifikasi, data, hapus akun.
5. **Paket** (`#paket`): perbandingan fitur, aktivasi demo, status keanggotaan.

## Logika yang diuji otomatis
- OTP: kode benar salah, kedaluwarsa, batas percobaan, sisa percobaan, hitung mundur kirim ulang.
- Onboarding: validasi per langkah (nama, jenjang, tahun lahir 1990–2015, minat maks 5), persentase kenal, langkah berikut/sebelumnya, autosave idempoten.
- Progres: cincin (persen, sisa hari, label kata), heatmap 12 minggu dengan jumlah aktivitas, streak dengan satu hari libur per minggu, kesiapan submit dari checklist berbobot.
- Paket: batas Slot (3 di Gratis), fitur terkunci, kode aktivasi demo, penolakan kode salah.

## Bukan sasaran
Supabase Auth sungguhan, OAuth Google, pengiriman email, push notification, pembayaran, dan timer yang tetap hidup setelah tab ditutup.
