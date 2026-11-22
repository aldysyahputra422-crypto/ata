# Status

Terakhir diperbarui: 17 November 2026 · tahap **PROTOTIPE DESAIN** · kelompok 3 (Tanya Ata) selesai dibangun.

## M1 Hari Ini (22 November 2026)

- `/hari-ini` dipindahkan dari prototipe `app/ui/hari-ini.js` beserta kerangka lima tab (`app.html`: rail desktop, tab bar HP). Halaman placeholder lama dihapus.
- FR-PRG-03 (ubah status/selesaikan tugas di Hari Ini) dan FR-RDM-03 (tugas baru muncul setelah peta disetujui) tersedia di UI dengan data perangkat (`ata-bersama`); penyimpanan per akun, rollback gagal-simpan, dan sinkronisasi tertunda sampai tabel Slot ada.
- K-23: batas Slot dari server (Gratis 1, Pro 3); seed demo 1 Slot; Slot di atas batas tetap disimpan.
- Paritas dengan `app.html`: 0 piksel beda dan 0 kegagalan kontras di 390/1280, terang/gelap; axe tanpa pengecualian.
- Tertunda: Lomba, Tanya Ata, Progres, Profil (masih halaman fondasi lama).
- Rincian: [docs/MIGRASI-UI.md](MIGRASI-UI.md).

## M1 Masuk/Paket (22 November 2026)

- `/` adalah layar Masuk dan `/paket` layar Paket, dipindahkan dari prototipe `masuk/ui/masuk.js` dan `masuk/ui/paket.js` dengan markup, class, dan CSS yang sama. Data dari `/api/v1/me`; kode Sobat Ambis lewat `POST /api/v1/redeem`. Halaman placeholder lama di `/` dihapus.
- FR-AUTH-01 (tombol Google), FR-AUTH-08 (unduh data, hapus akun dengan konfirmasi) selesai di UI. Galat OAuth (`/?galat=oauth` atau `/?error=…`) menampilkan "Gagal masuk dengan Google. Coba lagi."
- Keadaan: memuat, galat (dengan "Coba lagi"), belum masuk, sudah masuk Gratis/Pro, Pro berakhir. Keadaan kosong tidak berlaku: kedua layar tidak memuat daftar.
- K-23: batas Slot diambil dari server (`slot_limits` di `/api/v1/me`, dibaca dari `plan_features`): Gratis 1, Pro 3. Kartu Pro menulis "3 Slot lomba aktif (Gratis: 1)". Slot per akun belum ada di database, jadi "Slot terpakai" selalu 0.
- Daftar fitur Paket: fitur yang layarnya belum ada di build ini diberi penanda "Belum tersedia" (Radar/Peta Jalan, Progres, Tanya Ata, Resep, Sidang Juri, konteks/analitik). Catatan di kartu Pro: biaya AI dan pencarian tidak termasuk, memakai API key pengguna atau prompt salin.
- Paritas piksel dengan prototipe (`masuk.html?embed=1`): 0 piksel beda dan 0 kegagalan kontras di 390/1280, terang/gelap. `pnpm visual:parity` lulus tanpa pengecualian; axe e2e tanpa pengecualian kontras.
- Tertunda: FR-AUTH-02 (OTP email), onboarding, pembayaran (di luar lingkup).
- Rincian: [docs/MIGRASI-UI.md](MIGRASI-UI.md).

## R0.2-0 Fondasi migrasi UI (22 November 2026)

- K-23 diterapkan: Gratis 1 Slot aktif, Pro 3 (final). Batas lain tetap usulan. Migrasi `0004` sudah diterapkan ke `ata-dev` (22 November 2026): hanya baris `free/activeSlots` yang berubah, jumlah record di semua tabel tetap. Rollback: lihat docs/PREFLIGHT.md.
- /styleguide sekarang merender referensi komponen prototipe; styleguide dan komponen lama yang tidak dipakai lagi dihapus setelah audit dependensi.
- Paritas piksel /styleguide vs prototipe: 0 piksel beda di 390/1280, terang/gelap. Dua cacat kontras label status sudah diperbaiki di prototipe dan disalin ke sini (R0.2-0a); `pnpm visual:parity` lulus tanpa pengecualian.
- Rincian: [docs/MIGRASI-UI.md](MIGRASI-UI.md).

## R0.1 Fondasi backend

- **Lulus di Supabase lokal.** Migrasi mencakup profil, matriks entitlement berversi, grant Pro, redeem atomik, audit, izin AI, dan persetujuan. RLS serta kontrak isolasi dua akun diuji di PGlite dan di stack Docker. Batas Slot tetap Free 3 dan Pro 3 sesuai konfigurasi yang berlaku sambil menunggu K-23.
- **FR-AUTH-04/06/08/09.** API akun menggunakan sesi Supabase yang diverifikasi, menyimpan versi persetujuan di skema, membaca peran dari metadata tepercaya, dan mendukung ekspor serta hapus akun dengan cascade. Integrasi UI akun dan onboarding mengikuti tahap layar R0.2.
- **FR-AUTH-01.** Endpoint Google OAuth memakai PKCE. Uji kontrak berjalan dengan Supabase Auth tiruan. Google sungguhan di `ata-dev` (Testing, localhost) terverifikasi: login membuat satu akun, profil, dan identitas. Logout mengembalikan 204 dan cookie lama ditolak. Login ulang dengan akun yang sama memakai ID yang sama. Sesi yang `not_after`-nya lewat ditolak `/me` dan ekspor (401). Audit `login`/`logout` tercatat. Galat OAuth dari Supabase (mis. `bad_oauth_state`) kini mendarat di `/?error=…` tanpa pesan UI; tangani di R0.2.
- **Cloud.** Migrasi `0001`–`0003` sudah diterapkan ke `ata-dev` (Free Tier, tanpa deploy). RLS aktif di 10 tabel, seed `plan_features` berisi 20 fitur per paket, dan uji HTTP dua akun dari Next.js lokal ke `ata-dev` lulus. Data uji sementara sudah dihapus.

## R0.05 Migrasi bertahap ke Next.js (21 November 2026)

Acuan: blueprint di prototipe, `docs/blueprint/16-entitlement-dan-migrasi.md` §5 dan §7 (keputusan PO: satu repo, satu aplikasi Next.js, migrasi per modul tanpa rewrite).

| Tahap | Isi | Status |
|---|---|---|
| R0.05-0 | Repo dipindah keluar iCloud ke `~/Developer/ata` (rsync termasuk perubahan yang belum di-commit; `node_modules` dipasang ulang dari lockfile). Repo lama di iCloud (`~/ata` → `HermesWorkspace/Projects/ata`) dibiarkan sebagai arsip | selesai; baseline typecheck/lint hijau, 26/26 uji |
| R0.05-1 | 47 modul logika murni prototipe disalin **apa adanya** ke `src/lib/prototype/` (struktur folder sama); 35 berkas uji dipindah ke `tests/unit/prototype/*.test.mjs` (kasus uji tidak diubah, hanya import & path); aset ke `public/prototype/assets`; Vitest dipisah menjadi project `unit` (jsdom) dan `prototype` (node) | selesai; 226 uji = 227 di prototipe dikurangi 1 uji teks layar Radar yang pindah bersama layarnya (M1) |
| R0.05-2 | `src/lib/entitlements/config.ts` = satu sumber batas paket (Pro 3 Slot final; angka lain usulan sampai matriks K-23 disetujui); uji: cocok dengan prototipe, tidak ada kredit/kuota AI, tidak ada angka batas di `src/components`/`src/app` | selesai |
| R0.05-3 | 23 berkas CSS prototipe disalin ke `src/styles/prototype/` (satu-satunya perubahan: `url(assets/…)` → `/prototype/assets/…`); aset di `public/prototype/assets`. Root layout baru `src/app/(ata)/` untuk layar hasil migrasi (CSS prototipe + Plus Jakarta Sans lewat `next/font`), terpisah dari root layout lama yang dipindah ke `src/app/(fondasi)/` tanpa mengubah URL. Route uji `/uji-visual` (hanya dev; 404 di produksi) merender potongan markup yang **sama** dengan `_r005-referensi.html` di prototipe | selesai |

**Kesetaraan visual R0.05-3** (Playwright, halaman penuh, perbandingan piksel PIL; prototipe `:4321/_r005-referensi.html` vs Next `:3100/uji-visual`):

| Viewport | Tema | Hasil |
|---|---|---|
| 390 | terang | identik (0 piksel berbeda) |
| 390 | gelap | identik |
| 1280 | terang | 899 piksel berbeda dengan selisih maksimum 2/255 (derau rendering di area folder/blur; tidak terlihat) |
| 1280 | gelap | identik |

Batasan: yang dibandingkan adalah komponen dasar (tombol, label/status, permata, banner, isian, folder Slot, skeleton, aset maskot), belum layar lengkap. Uji 768/1024, audit kontras, dan axe dijalankan per layar di M1. Browser Playwright milik repo belum terpasang, jadi perbandingan memakai Playwright MCP; otomatisasi di CI menyusul bersama `pnpm test:e2e`.

Pemeriksaan: `pnpm typecheck` lulus · `pnpm lint` lulus (5 peringatan `no-unused-vars` di kode prototipe yang disalin apa adanya) · `pnpm test` 260/260 · `pnpm build` lulus.
Cabang kerja: `r005-migrasi-logika` (belum di-commit).

## Prototipe desain (13 November 2026)

Spec: `docs/superpowers/specs/2026-11-13-ata-desain-fitur-design.md` · Rencana: `docs/superpowers/plans/2026-11-13-fondasi-dan-sidang-juri.md`.
Berkas prototipe ada di luar repo: `~/Documents/Claude/ata-prototype/`. **Sejak 17 Nov folder itu dataless (iCloud)** — semua 141 berkas tidak bisa dibuka dan unduhan gagal. Backup terbaca ada di `claude_artifacts/ata-prototype/` (di-ignore Git). Salinan kerja lengkap semua kelompok: `~/HermesWorkspace/ata-prototype/` — buka `hub.html`, 158 uji `node --test` lulus.

| Kelompok | Isi | Status | Tautan |
|---|---|---|---|
| Beranda | Semua prototipe | terbit | https://claude.ai/artifact/3DtVSRgBrQtwdSttLiHTJt |
| 0 | Hari Ini, Profil (kamar 360° + buku 3D), Bioskop, Labirin | ditinjau | https://claude.ai/artifact/VZU6DAQULeBdVedENvFrYY |
| 1 | Sambungkan AI (slot mitra lokal) + Sidang Juri | siap ditinjau | https://claude.ai/artifact/RaCppZidoTdoUfVQQBuhzK |
| 2 | Lomba: Radar tumpukan kartu, Tersimpan, Detail, Slot, Peta Jalan labirin 3D | siap ditinjau | https://claude.ai/artifact/56j7fmCHkauEbJXSJREgFZ |
| 3 | Tanya Ata: chat + kartu aksi, Resep jalur pipa, papan Ingatan | siap ditinjau (lokal: `~/HermesWorkspace/ata-prototype/tanya.html`) | belum terbit |
| 4 | Portofolio: Galeri sertifikat, tautan orang tua, Laporan Bulanan | siap ditinjau (lokal: `portofolio.html`) | belum terbit |
| 5 | Masuk/OTP, onboarding, Progres, Pengaturan, Paket | siap ditinjau (lokal: `masuk.html`) | belum terbit |

Perubahan di repo dari putaran ini: palet **Senja** di `src/styles/tokens.css`, `fx.css`, `components.css` dan `docs/DESIGN-SYSTEM.md` (ASSUMPTIONS S18); kolom `partner`, `priceIdr`, `payments` di `content/providers.json`. `pnpm test` 26/26 dan `pnpm test:e2e` 18/18 lulus.

## Prototipe kelompok 3 · Tanya Ata (17 November 2026)

Rencana: `docs/superpowers/plans/2026-11-13-tanya-ata.md` · Spec: `docs/superpowers/specs/2026-11-13-tanya-ata-design.md` · Ledger: `.superpowers/sdd/2026-11-13-tanya-ata/progress.md`.

| Task | Isi | Status |
|---|---|---|
| 1 | Data 8 Resep, Ingatan awal, profil demo + logika murni (templat, resep, konteks, saringan, penjawab) | selesai, 38/38 uji |
| 2 | `tanya.html`, chat, baris konteks, aksi cepat, streaming, kartu aksi, Mode Tanpa Key, 3 galat demo | selesai, diuji di browser |
| 3 | Pustaka Resep, Punyaku, stepper jalur pipa, pratinjau privasi, salin/tempel, aliran hasil, ekspor Markdown | selesai, diuji di browser |
| 4 | Papan Ingatan 4 jenis, sematkan, sunting, hapus + urungkan, Lupakan semua, Ingat otomatis | selesai, diuji di browser |
| 5 | Tinjauan 390/1280 px terang-gelap, peninjau independen, terbit | tinjauan selesai; terbit belum |

Tinjauan independen menemukan 2 Critical (XSS di daftar ingatan dan di judul/tujuan langkah Racikan) dan 13 Important; semuanya sudah diperbaiki, termasuk ekspor Markdown yang selalu berisi `{{…}}` mentah, saringan sensitif yang hanya berjalan saat usul, dan fokus sheet yang mendarat di tombol destruktif.

Catatan: FR-CCH, FR-MEM, dan FR-RCP di bawah tetap **belum** — yang selesai adalah prototipe desainnya, bukan implementasi Next.js.

## Prototipe kelompok 4 dan 5 (17 November 2026)

Rencana: `docs/superpowers/plans/2026-11-17-portofolio.md`, `docs/superpowers/plans/2026-11-17-masuk-dan-progres.md`.
Spec: `docs/superpowers/specs/2026-11-17-portofolio-design.md`, `docs/superpowers/specs/2026-11-17-masuk-dan-progres-design.md`.
Ledger: `.superpowers/sdd/2026-11-17-portofolio/`, `.superpowers/sdd/2026-11-17-masuk-dan-progres/`.

| Kelompok | Isi | Verifikasi |
|---|---|---|
| 4 · Portofolio | Galeri + kirim sertifikat (validasi per bidang, hapus+urungkan), tautan orang tua baca-saja (buat, pilih bagian, salin, WhatsApp, cabut, kedaluwarsa), Laporan Bulanan A4 (periode, bagian, pesan 280, kode verifikasi, cetak) | 27 uji logika + 17 pemeriksaan UI |
| 5 · Masuk & Progres | Masuk Google/OTP (kode demo 000000, batas 5×, kirim ulang 60 dtk), onboarding 7 langkah autosave, Progres (cincin, linimasa, heatmap 12 minggu, timer fokus, check-in, kesiapan submit), Pengaturan (tema, Efek Kaca, data, hapus akun), Paket (DEMO-PRO) | 38 uji logika + 26 pemeriksaan UI |

Uji total prototipe: **158** (`node --test tests/*.test.mjs`). Semua halaman terbuka dari `hub.html` di `http://127.0.0.1:4321`.

Catatan jujur: Laporan PDF dihasilkan lewat dialog cetak (bukan server-side), berkas sertifikat tidak benar-benar diunggah, dan Drive disimulasikan dengan status per berkas. Tautan orang tua memakai token demo yang tidak kriptografis.

## Versi terpasang

| Paket | Versi |
|---|---|
| next | 15.5.29 |
| react / react-dom | 19.1.0 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.5 |
| radix-ui (dasar shadcn) | 1.8.1 |
| @supabase/supabase-js / @supabase/ssr | 2.119.0 / 0.12.7 |
| zod | 4.6.7 |
| react-hook-form | 7.92.0 |
| @tanstack/react-query | 5.107.1 |
| ai (Vercel AI SDK) | 7.0.170 |
| @ai-sdk/openai · anthropic · google · xai · deepseek · openai-compatible | 4.0.115 · 4.0.102 · 4.0.118 · 5.0.43 · 3.0.84 · 3.0.90 |
| @openrouter/ai-sdk-provider | 3.1.0 |
| @react-pdf/renderer | 4.9.0 |
| serwist / @serwist/next | 9.5.13 |
| web-push | 4.0.0 |
| date-fns / date-fns-tz | 4.4.0 / 3.2.0 |
| recharts | 3.10.1 |
| lucide-react | 1.72.0 |
| sharp | 0.35.5 |
| vitest | 5.1.0 |
| @playwright/test | 1.63.0 |
| supabase (CLI) | 3.1.0 |

## Pemeriksaan terakhir

| Perintah | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm lint` | lulus |
| `pnpm test` | 26 uji lulus |
| `pnpm build` | lulus |
| `pnpm test:e2e` | 18 uji lulus (HP + desktop), termasuk kontras AA terang dan gelap |

## Fondasi (SETUP)

| Butir | Status | Catatan |
|---|---|---|
| Fase 0 preflight | selesai, 1 butir Wajib terbuka | Proyek Supabase belum ada (docs/PREFLIGHT.md) |
| Fase 1 MCP | selesai dicatat | docs/MCP-STATUS.md |
| Kerangka Next.js 15 + TS strict + Tailwind + ESLint | selesai | |
| shadcn/ui | selesai (manual) | ASSUMPTIONS S3 |
| Struktur folder PRD 8.3 | selesai | |
| Skrip package.json | selesai | `seed:reset` masih stub |
| Supabase init + migrasi 0001 `system_flags` + RLS | **ditulis, belum diterapkan** | Menunggu proyek Supabase |
| `GET /api/health` | selesai | Mengembalikan 503 `not_configured` sampai env diisi |
| GitHub Actions `ci.yml`, `keepalive.yml` | selesai | Belum pernah berjalan di GitHub |
| CLAUDE.md, .env.example, docs | selesai | |

## Design system (DESIGN-SYSTEM.md Bagian 12)

| Butir | Prio | Status |
|---|---|---|
| Token, canvas, material kaca, layout | P0 | selesai |
| Atribut `<html>` + skrip anti-berkedip | P0 | selesai |
| Pemetaan shadcn/Tailwind (11.3) | P0 | selesai |
| `resolveFx`, governor, `FxProvider` | P0 | selesai |
| MeshBackground (E1), Tilt (E2), specular (E3), parallax (E4), folder membuka (E6) | P0 | selesai; **belum diuji di laptop nyata** (hanya Chromium headless) |
| TactileSegmented (3 varian), TabBar, NavRail | P0 | selesai |
| Button, Input, Card, Sheet/Dialog, Toast | P0 | selesai |
| GemChip + pemetaan kategori, Sticker, Stamp | P0 | selesai (stiker sementara, `TODO(design)`) |
| PosterCard + PosterRail (+ Tilt), FolderCard (+ kosong) | P0 | selesai |
| ProgressRing, EmptyState, Banner Demo | P0 | selesai (maskot: penanda tempat) |
| `/styleguide` (DS-01, DS-02, DS-03) | P0 | selesai |
| HeroCard, MentorChip, bayangan bertinta, panel FPS (DS-07), uji kontras (DS-06) | P1 | selesai lebih awal |
| E5 refraksi, E7 knob rich + magnet, E10 butir | P1 | CSS dan logika ada; **belum diverifikasi visual di Chrome nyata** |
| Strip meja + tanaman, panel konteks berisi, E8, E9, DS-04, DS-05 matriks penuh | P1 | belum |
| E11, E12, `data-mood` | P2 | belum (`data-mood` CSS sudah ada) |

## Kebutuhan fungsional

Belum ada FR aplikasi yang dikerjakan; tahap SETUP hanya fondasi.

| Kelompok | Rencana | Status |
|---|---|---|
| FR-AUTH-01–10 | Hari 1 | belum — prototipe desain selesai (kelompok 5) |
| FR-ONB-01–08 | Hari 1 | belum — prototipe desain selesai (kelompok 5) |
| FR-PWA-01–08 | Hari 1 dan 3 | belum (FR-PWA-08 Efek Kaca: mekanisme siap, layar Pengaturan belum) |
| FR-SLT-01–05 | Hari 2 | belum |
| FR-RDM-01–12 | Hari 2 | belum |
| FR-PRG-01–10 | Hari 2 | belum — prototipe desain selesai (kelompok 5) |
| FR-BYOK-01–10 | Hari 3 | belum (registri `content/providers.json` siap) |
| FR-CCH-01–08, FR-MEM-01–07 | Hari 3 | belum — prototipe desain selesai (kelompok 3) |
| FR-RCP-01–11 | Hari 3 | belum — prototipe desain selesai (kelompok 3) |
| FR-SCN-* (Radar) | Hari 3 | belum |
| FR-RPT-* (Laporan), FR-MNT-* (Mentor) | Hari 4 | belum — prototipe Laporan & tautan orang tua selesai (kelompok 4) |
| FR-ADM-01–07 | Hari 4 | belum |
| DEMO-01 | — | selesai (banner) |
| DEMO-06 | — | sebagian: gerbang `isDemoMode()` + uji; jalur demo lain belum ada |
| DEMO-02–05, 07, 08 | Hari 3–4 | belum |

## Shell aplikasi + efek visual (19 November 2026)

Spec: `docs/superpowers/specs/2026-11-19-referensi-visual.md` · Ledger: `.superpowers/sdd/2026-11-19-efek/progress.md`.

| Task | Isi | Status |
|---|---|---|
| A1–A4 | `app.html` — shell lima tab (Hari Ini, Lomba, Tanya Ata, Progres, Profil), router `#/…`, rail desktop / tab bar HP, lapis untuk Portofolio-Paket-Pengaturan, panel demo | selesai, harness 20/20 |
| A5 | Halaman kelompok dipasang `?embed=1` (`shared/embed.css`): chrome prototipe dan tab bar internal disembunyikan | selesai |
| C1 | Token motion `shared/fx.css` (`--dur-1…4`, `--ease-out`, `--ease-back`) + `fx-rise` | selesai |
| C2 | Kode OTP jadi enam sel; saat benar sel menyatu dan centang hijau muncul (referensi Animated OTP V2) | selesai, `_selftest-masuk` 26/26 |
| C3 | Kartu Slot bersusun dua lapis + angkat 2 px (referensi folder macOS) | selesai |
| C4 | Wordmark Sobat Ambis dipakai pada rasio aslinya di kepala layar | selesai |
| C5 | Karusel 3D "Mirip dengan ini" di detail Lomba (geser, tombol, panah keyboard) | selesai, `_selftest-lomba` 13/13 |

Uji: `node --test` 158/158, harness aplikasi 20/20, Lomba 13/13, Portofolio 17/17, Masuk 26/26.
Halaman tinjauan efek: `_efek.html`.

**Catatan operasional:** iCloud kembali mengevict seluruh folder prototipe (153/153 berkas `dataless`,
server 4321 mati). Salinan kerja dipindah ke `~/Developer/ata-mirror/ata-prototype` (lokal, 0 dataless)
dan disalin balik ke `~/HermesWorkspace/ata-prototype` setiap selesai tugas. Bila ini berulang,
matikan "Optimize Mac Storage" atau pindahkan proyek keluar iCloud.

## Sisa efek + perbaikan shell (20 November 2026)

| Task | Isi | Status |
|---|---|---|
| C6 | Pencarian lengket di Tersimpan, menyusut jadi pill kaca saat digulir | selesai, `cari-lomba.test.mjs` |
| C7 | Chip kategori bulat (Radar, Tersimpan, Peta Jalan) | selesai |
| C8 | Grid 2 kolom Galeri sejak 390 px (sampul 4:3, metadata 2 baris) | selesai, `_selftest-portofolio` 17/17 |
| C9 | Sheet berpegas + rubber-band untuk semua panel bawah (`shared/sheet.js`) | selesai, `pegas.test.mjs` |
| A6 | Panel demo: focus trap + shell inert | selesai, `_selftest-app` 23/23 |
| A7 | Ganti tema tanpa memuat ulang iframe (postMessage); tema shell kini juga berlaku di Lomba/Portofolio/Sidang/Progres | selesai |
| C10 | Karusel 3D melingkar | selesai, `_selftest-lomba` 16/16 |

Uji: `node --test` 175/175, harness aplikasi 23/23, Lomba 16/16, Portofolio 17/17, Masuk 26/26.
Dikerjakan langsung di folder iCloud (tanpa mirror), 0 berkas `dataless`.
| A8 | State demo bersama lintas tab (`ata-bersama`): Slot, Peta Jalan = tugas, paket, jumlah sertifikat; adapter Lomba, Masuk/Progres, Hari Ini, Profil, Tanya, Portofolio, Sidang; sinkron live via event `storage` | selesai, `bersama.test.mjs` 12 tes, `_selftest-app` 29/29 |

Uji akhir: `node --test` 187/187, harness aplikasi 29/29, Lomba 16/16, Portofolio 17/17, Masuk 26/26.
| C11 | Overhaul gerak & visual: detail Lomba gaya travel (hero parallax, lembar bergrip, bilah aksi menempel), kartu → detail via View Transitions, folder condong, penanda tab berpegas, tema memudar, tekan taktil | selesai, `gerak.test.mjs`; `node --test` 191/191, harness 29/16/26/17 |
