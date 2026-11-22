# Gerbang akhir M1 Lomba (PR #11)

Pemeriksaan sebelum PR #11 ditinjau untuk merge. Dijalankan pada HEAD cabang PR #11 (`870c78e`, memuat PR #12) ditambah perubahan PR ini. Perbaikan visual dimulai dari `ata-prototype` (PR #10) dan disalin ke app.

## A. Paritas visual lima layar

Sumber selisih lama (143–796 piksel di sudut bingkai): `shared/embed.css` di prototipe kalah spesifisitas dari aturan bingkai `ds.css`, sehingga layar di dalam `app.html` tetap bersudut membulat. Diperbaiki di prototipe; app tidak diberi sudut tiruan.

Dua aturan `html[data-embed]` yang berada di `lomba/lomba.css` (bukan `embed.css`) belum dinyatakan ulang untuk shell app, yang tidak memakai `html[data-embed]`: `.lb-detail { --tepi: 16px }` dan `.lb-aksi-bawah { --aksi-bawah: 12px }`. Akibatnya bilah aksi Detail di app menempel 92 px dari tepi bawah (nilai untuk layar yang berdiri sendiri), bukan 12 px seperti prototipe di dalam shell. Ini penyebab bilah menutupi judul Detail di HP pada uji browser. Keduanya kini ada di `lomba-apl.css`.

Perbandingan piksel prototipe (`app.html` + iframe Lomba) dengan app `/lomba`, gerak dikurangi, toleransi 8/255:

| Layar | 390 terang | 390 gelap | 1280 terang | 1280 gelap |
|---|---|---|---|---|
| Radar | 0 | 0 | 0 | 0 |
| Tersimpan | 0 | 0 | 8 | 0 |
| Detail | 0 | 0 | 0 | 0 |
| Slot | 0 | 0 | 0 | 0 |
| Peta Jalan | 0 | 0 | 0 | 0 |

Angka = piksel di atas toleransi. Delapan piksel di Tersimpan 1280 terang berada di tepi lengkung chip "Semua" (anti-alias, delta maksimum 30/255). Posisi, ukuran, radius, dan bayangan terhitung chip itu identik di kedua sisi; chip berada di koordinat y pecahan (295,31 px) dan dirender di dalam iframe pada prototipe. Hasilnya sama di tiga kali pengulangan. Dicatat sebagai artefak perender, bukan selisih gaya.

Geometri Detail (judul, hero, bilah aksi, penghitung karusel) identik di kedua sisi pada 390 dan 1280 px.

## B. Uji browser dengan sesi Google sungguhan (setelah PR #12)

Chrome, akun Gratis di `ata-dev`, baca-saja, 390 dan 1280 px, terang dan gelap, commit `5a70807`.

- Lulus: lima layar tanpa luapan horizontal atau galat JavaScript; folder Slot (fokus masuk, Tab terkurung, Escape, Tutup, fokus kembali) dengan gerak biasa dan dikurangi; kueri Radar saat inisialisasi; seret poster dengan mouse dari gambar dan badan kartu, geser sentuh, klik ke Detail.
- Gagal, diperbaiki di PR ini: kontras baris meta Detail desktop tema gelap (piksel terburuk 3,92:1); bilah aksi menutupi 38 px judul Detail di HP.
- `GET /api/v1/me` 200 (masuk, paket Gratis, batas 1/3). `GET /api/v1/user-competitions` 503 karena migrasi 0005 belum ada di `ata-dev`. Tidak ada permintaan POST/PUT/PATCH/DELETE.
- Kedua perbaikan belum diuji ulang dengan sesi Google sungguhan; baru lewat skrip lokal tanpa akun dan e2e.

## C. Tiga uji e2e yang dilewati

Ketiganya di `tests/e2e/lomba-temuan.spec.ts` dan dilewati dengan sengaja per proyek Playwright, karena jenis masukan hanya ada di satu proyek:

| Uji | Dilewati di | Dijalankan di |
|---|---|---|
| mouse drag from .poster-art decides the card | mobile (Pixel 7, sentuh) | desktop |
| mouse drag from .lb-card__body decides the card | mobile | desktop |
| touch swipe from the poster still decides the card | desktop (tanpa layar sentuh) | mobile |

Tidak ada cakupan yang hilang: setiap uji berjalan sekali di proyek yang punya perangkat masukannya.

## D. 116 teks di prototipe, 112 di app

Selisih berasal dari skrip ukur, bukan dari DOM. Skrip menggulir `document.scrollingElement` di app, padahal penggulir Lomba di app adalah `#views` (sama seperti prototipe). App karena itu tidak pernah digulir, dan empat teks di bawah lipatan Peta Jalan 390 px tidak terukur:

- `h2.lb-sub` "Langkah 43%", terang dan gelap
- `button.btn.btn--ghost` "Tambah langkah", terang dan gelap

Setelah skrip menggulir `#views` di kedua sisi: 116 dan 116 teks, kumpulan elemen sama persis, 0 di bawah batas, selisih rasio terbesar antar sisi 0,00, nilai terendah teks normal 5,13:1.

## E. 20 peringatan lint

Semuanya `@typescript-eslint/no-unused-vars`, 0 galat. Dibandingkan dengan titik cabang dari `r005-migrasi-logika` (`a8d7c92`):

**Sudah ada sebelum M1 Lomba (11):**
- `src/lib/prototype/shared/bersama.js` 30, 38 (baris dari PR Hari Ini)
- `src/lib/prototype/shared/ds.js` 84, 87
- `src/lib/prototype/shared/gerak.js` 28, 31
- `src/lib/prototype/shared/lingkungan.js` 72
- `src/lib/prototype/shared/sheet.js` 90
- `src/lib/prototype/sidang/sesi.js` 121, 131
- `tests/unit/prototype/konteks.test.mjs` 5

**Diperkenalkan migrasi Lomba (9), semuanya di berkas yang disalin dari prototipe:**
- `src/lib/prototype/lomba/state.js` 28, 52, 53
- `src/lib/prototype/lomba/ui/karusel.js` 31, 134
- `src/lib/prototype/lomba/ui/radar.js` 3, 65
- `src/lib/prototype/lomba/ui/slot.js` 81
- `src/lib/prototype/shared/tarik.js` 243

Sebagian besar adalah `catch (e)` yang sengaja diabaikan. Tidak dibersihkan di sini: berkas ini salinan prototipe, jadi perubahan harus dimulai dari `ata-prototype`.

## F. Migrasi 0005

Tidak dijalankan di `ata-dev`. Diverifikasi di Supabase lokal (Postgres 17 dalam Docker, skema `auth` dan peran sungguhan, bukan PGlite) lewat `tests/backend/uji-0005-supabase-lokal.sql`: 0004 dan 0005 diterapkan di dalam satu transaksi, diuji, lalu di-rollback.

| Pemeriksaan | Hasil |
|---|---|
| 0004 lalu 0005 terpasang di atas 0001–0003 | lulus |
| Batas dari `plan_features` | Gratis 1, Pro 3 |
| RLS aktif | ya |
| Gratis: Slot pertama | diterima |
| Gratis: Slot kedua, dan tersimpan → Slot | ditolak `slot_limit_reached` |
| Gratis: sunting Peta Jalan Slot aktif | diterima |
| Menyisipkan baris untuk akun lain | ditolak 42501 |
| Akun lain membaca baris | 0 baris |
| Pro: Slot 1–3 | diterima; ke-4 ditolak |
| Turun paket dengan 3 Slot | 3 Slot tetap ada dan bisa disunting |
| Turun paket: Slot baru, atau aktifkan ulang saat masih di atas batas | ditolak |
| `anon` membaca tabel | ditolak 42501 |
| Setelah rollback | tabel tidak ada, migrasi tetap 0001–0003, 0 pengguna |

Keterbatasan yang tersisa:
- Belum diuji lewat PostgREST/API app terhadap database sungguhan: pemetaan galat trigger ke HTTP 409 dan upsert tetap hanya teruji dengan PGlite dan respons tiruan.
- Persistensi Slot per akun di `ata-dev` belum terverifikasi. Sesi Google yang berhasil bukan bukti persistensi.
- Konkurensi (kunci advisory) tidak diuji.

## G. Hasil uji setelah perubahan PR ini (lokal)

| Pemeriksaan | Hasil |
|---|---|
| Typecheck | lulus |
| Lint | 0 galat, 20 peringatan (lihat E) |
| Unit | 326 lulus |
| E2E | 127 lulus, 3 dilewati (lihat C) |
| Build | lulus |
| `pnpm visual:parity` Lomba (Radar) | 0 piksel di atas toleransi dan 0 kegagalan kontras di 390/1280, terang/gelap |
| `pnpm visual:parity` Styleguide, Paket, Hari Ini | lulus |
| `pnpm visual:parity` Masuk | gagal di mesin ini: server lokal tanpa konfigurasi Google, tombol Google tampil nonaktif. Layar Masuk tidak disentuh PR ini |

Perintah `pnpm visual:parity` karena itu masih berakhir "PARITAS GAGAL" di mesin ini, semata-mata dari target Masuk.
