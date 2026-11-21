---
tags: [desain, motion, referensi, tanya-ata]
tanggal: 2026-11-19
kategori: riset-desain
status: diterapkan
---

# Bedah referensi visual — `Projects/taste`

Empat rekaman di `~/HermesWorkspace/Projects/taste`, dibedah frame per frame dengan ffmpeg
(30 fps, 720×1280 / 1004×720). Berkas aslinya `dataless` di iCloud; dibaca setelah dipindahkan
lewat Finder ke `/tmp/taste`.

## 1. Animated OTP Verification V2 — 6,59 s, 720×1280
**Isi**: kartu gelap di atas latar hitam, judul "OTP Verification" + aksen jingga, empat sel kode,
lalu panel kode React/framer-motion di bawahnya.

**Yang diambil**
- Sel kode terpisah 56–64 px, radius 16, jarak 8 px; sel aktif diberi cincin lembut + kursor berkedip.
- Saat kode benar: **semua sel mengecil ke tengah** (stagger 25 ms), lalu satu kotak radius 20
  berisi centang muncul dengan easing memantul; kartu ikut berdenyut hijau sekali.
- Judul berganti ke keadaan berhasil pada saat yang sama — teks ikut transisi, bukan layar baru.

**Yang tidak diambil**: palet hitam-jingga (Ata tetap Palet Senja), dan kartu bergaya "phone mockup".

**Diterapkan**: `masuk/ui/masuk.js` (enam sel + `otp--sukses`), `shared/fx.css`.

## 2. Folder macOS (label aslinya "Comment 21st…") — 9,22 s, 1004×720
**Isi**: komponen folder macOS: kartu putih besar radius ~28, bentuk folder dengan tab di kiri atas,
foto di dalamnya, tiga lapis kartu di belakang, tombol bulat mengapung di sudut kartu,
latar titik-titik halus, keterangan kecil berspasi lebar di bawah.

**Yang diambil**
- **Kartu bersusun**: dua lapis tipis di belakang kartu utama, merenggang saat ditunjuk.
  Dipakai untuk kartu Slot di Hari Ini.
- Radius besar (18–24 px) + border 1 px + bayangan panjang-lembut sebagai satu paket elevasi.
- Tombol aksi mengapung di tepi kartu (nanti untuk "Tambah Slot").

**Yang tidak diambil**: bentuk tab folder (terlalu literal untuk aplikasi belajar).

## 3. Travel App UI (Flutter) — 16,14 s, 720×1280
**Isi**: rekaman simulator iPhone, aplikasi travel: kartu hero, carousel 3D (kartu tengah tegak,
kartu samping miring ±25° dan mengecil), pill pencarian mengapung, chip kategori bulat pastel,
tab bar dengan tombol tengah menonjol. Panel kode menunjukkan `SpringSimulation`,
`Curves.easeOutBack`, dan rubber-band saat drag.

**Yang diambil**
- **Gerak berbasis pegas**, bukan durasi tetap: untuk elemen yang mengikuti jari (sheet, carousel).
- Hero → detail sebagai perluasan kartu, bukan navigasi halaman baru.
- Chip kategori bulat sebagai pola filter di layar Lomba.

**Yang tidak diambil**: palet koral-pink dan gaya "Airbnb" — hanya mekanika geraknya.

## 4. Popular Food (label aslinya "Wedding hair ideas") — 10,30 s, 720×1280
**Isi**: rekaman aplikasi pesan-antar makanan: pencarian lengket di atas, chip kategori,
banner promo, grid 2 kolom kartu produk, tab bar bawah.

**Yang diambil**
- **Pencarian lengket** yang menyusut saat digulir (untuk daftar Lomba).
- Grid 2 kolom dengan kartu rasio tetap dan metadata 2 baris.

**Yang tidak diambil**: banner promo (tidak relevan untuk konteks lomba).

## Token motion (diterapkan di `shared/fx.css`)
| Token | Nilai | Dipakai |
|---|---|---|
| `--dur-1` | 140 ms | warna, border, opacity |
| `--dur-2` | 220 ms | geser kecil, tekan tombol |
| `--dur-3` | 320 ms | kartu masuk, lapisan merenggang |
| `--dur-4` | 560 ms | perpindahan layar |
| `--ease-out` | `cubic-bezier(.22,1,.36,1)` | semua yang muncul |
| `--ease-back` | `cubic-bezier(.34,1.56,.64,1)` | centang, elemen memantul |

Semua primitif berhenti pada `prefers-reduced-motion: reduce`.

## Status penerapan
- [x] Token motion + `fx-rise` (muncul berurutan, stagger 55 ms)
- [x] OTP enam sel + animasi gabung-jadi-centang
- [x] Kartu Slot bersusun + angkat 2 px saat ditunjuk
- [x] Wordmark Sobat Ambis pada rasio aslinya di kepala layar
- [x] Carousel 3D "Mirip dengan ini" di detail Lomba (geser, tombol, panah keyboard)
- [x] Pencarian lengket yang menyusut di daftar Lomba (Tersimpan) — `lomba/ui/tersimpan.js`, `lomba/logic/cari.js`
- [x] Chip kategori bulat (Lomba: Radar, Tersimpan, Peta Jalan) — `lomba/ui/chip.js`; grid 2 kolom Galeri sejak 390 px
- [x] Karusel 3D melingkar — `lomba/logic/karusel.js`
- [x] Sheet dengan pegas mengikuti jari + rubber-band, semua panel bawah — `shared/sheet.js`, `shared/logic/pegas.js`

## Catatan teknis
- Panjang animasi sukses OTP dijaga 700 ms karena harness `_selftest-masuk` menunggu 800 ms
  sebelum memeriksa perpindahan layar. Ubah keduanya bersamaan bila durasi diubah.
- `assets/logo-icon.svg` adalah wordmark (1670×427) yang dipaksa masuk kotak 40×40 sehingga
  teksnya tak terbaca; diganti `assets/logo.svg` dengan tinggi 24 px.

## Putaran 2 — keyframe `_ref_frames/` (20 November 2026)
Satu bingkai diam per video (folder di-hover, detail travel, beranda makanan, OTP sukses). Kurva tidak bisa diukur
dari bingkai diam; diturunkan dari panel kode di bingkai (Flutter `Curves.easeInOutCubic`, `lerp` rect + radius, foto parallax;
framer-motion). Folder `_ref_frames/` sudah dihapus setelah dipakai.

- [x] Folder "hover to lean · click to open": condong ≤7° mengikuti penunjuk, kertas mengipas, tombol aksi gelap 44 px r14 di sudut, meta monospace
- [x] Travel detail: hero penuh + parallax 0,4×, lembar r28 bergrip menimpa hero (−30 px), 3 petak, host-row → baris Ata, fasilitas → syarat 2 kolom, bilah harga + CTA pil menempel
- [x] Kartu → detail melebar: View Transitions API, `::view-transition-group(lb-hero)` 420 ms `cubic-bezier(.65,0,.35,1)`
- [x] Tekan taktil global, penanda tab berpegas, tab baru naik-memudar (WAAPI), tema memudar 350 ms

