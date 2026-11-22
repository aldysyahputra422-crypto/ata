# Migrasi UI dari prototipe

Catatan per tahap migrasi layar dari `ata-prototype` ke `src/app/(ata)/`. Aturan: CLAUDE.md bagian Desain dan docs/DESIGN-SYSTEM.md.

## R0.2-0 Fondasi migrasi (22 November 2026)

Cabang: `devin/1795304036-r02-0-fondasi` (base `r005-migrasi-logika`).

### Berkas yang diubah atau ditambah

| Berkas | Perubahan |
|---|---|
| `src/lib/entitlements/config.ts` | `CONFIG_VERSION = 2`; Gratis `activeSlots` 1, final, K-23. Batas lain tetap `proposed` |
| `supabase/migrations/0004_entitlement_k23_active_slots.sql` | Gratis `activeSlots` = 1/final/K-23; semua baris `config_version = 2` |
| `src/lib/prototype/shared/logic/hak.js` | Salinan produksi: Gratis 1 Slot final (berbeda dari repo prototipe sampai di sana diperbarui) |
| `tests/unit/entitlements.test.ts`, `tests/unit/prototype/{bersama,paket-ata}.test.mjs` | Batas Gratis 1; hanya `activeSlots` yang final; Slot di atas batas tetap disimpan |
| `src/app/(ata)/styleguide/page.tsx` | /styleguide baru: referensi komponen prototipe, 404 bila `DEMO_MODE` bukan `true` |
| `src/app/(ata)/_referensi/{ReferensiKomponen.tsx,PasangUji.tsx,referensi.css}` | Render bersama untuk /styleguide dan /uji-visual (dipindah dari `uji-visual/`) |
| `src/app/(ata)/uji-visual/page.tsx` | Memakai `ReferensiKomponen`; keluaran sama |
| `src/app/(ata)/layout.tsx`, `src/app/(ata)/fonts.css`, `public/prototype/fonts/*.woff2` | Font Plus Jakarta Sans self-hosted dengan berkas yang sama dengan prototipe, menggantikan `next/font` |
| `tests/unit/styleguide-gate.test.tsx` | Gate DEMO_MODE untuk /styleguide |
| `tests/e2e/design-system.spec.ts` | Bagian referensi, tema `?tema=`, 390 px tanpa scroll horizontal, axe kontras dua tema, /uji-visual 404 di produksi; uji app shell lama tetap |
| `tests/unit/components.test.tsx` | Tinggal uji `activeNavIndex` |
| `scripts/styleguide-screenshots.mjs` | Memakai `?tema=`, tanpa mode kaca mati |
| `scripts/visual-parity.mjs`, `package.json` | `pnpm visual:parity` (lokal) |
| `CLAUDE.md`, `docs/DESIGN-SYSTEM.md`, `docs/ASSUMPTIONS.md`, `docs/STATUS.md`, `README.md`, `docs/EXTERNAL-SKILLS.md`, `src/styles/tokens.css` | Otoritas baru, K-23, aturan migrasi |
| `docs/arsip/DESIGN-SYSTEM-airy-glass.md` | Dokumen lama dipindah + banner arsip |

### Audit dependensi fondasi lama

Konsumen dihitung dari import (`@/…` dan relatif), `@import` CSS, uji, dan skrip, sebelum penghapusan.

| Berkas | Konsumen sebelum R0.2-0 | Keputusan |
|---|---|---|
| `(fondasi)/(dev)/styleguide/{page.tsx,Styleguide.tsx,styleguide.css}` | rute /styleguide | **dihapus**, diganti `(ata)/styleguide` |
| `ds/Button`, `ds/Card`, `ds/HeroCard`, `ds/Input`, `ds/Sheet` | hanya styleguide lama | **dihapus** |
| `ds/FolderCard` | hanya styleguide lama | **dihapus** |
| `ds/PosterCard` | hanya styleguide lama | **dihapus** |
| `ds/Tilt` | hanya `PosterCard` | **dihapus** |
| `ds/GemChip` | styleguide lama, `PosterCard` | **dihapus** |
| `ds/Sticker` | styleguide lama, `FolderCard`, uji `Stamp` | **dihapus** (uji ikut dihapus) |
| `ds/ProgressRing`, `ds/TactileSegmented` | styleguide lama + ujinya | **dihapus** (uji ikut dihapus) |
| `ds/category-icons` | `GemChip`, `Sticker` | **dihapus** |
| `scripts/section-shots.mjs` | memotret id bagian styleguide lama (`#gem`, `#poster`, …) yang sudah tidak ada | **dihapus** |
| `ds/AppShell`, `ds/NavRail`, `ds/TabBar`, `ds/nav-icons`, `src/lib/nav.ts` | `(fondasi)/(app)/layout.tsx`, uji `activeNavIndex` | simpan sampai rute bertab terakhir di `(fondasi)` dimigrasikan |
| `ds/EmptyState` | 5 halaman `(fondasi)/(app)` | simpan sampai halaman itu dimigrasikan (Hari Ini, Lomba di M1) |
| `ds/DemoBanner`, `ds/FxProvider`, `ds/MeshBackground`, `ds/RefractDefs`, `ds/Toaster` | `(fondasi)/layout.tsx`, uji demo-mode | simpan sampai rute `(fondasi)` terakhir |
| `src/lib/fx/*` | `FxProvider`, `(fondasi)/layout.tsx`, uji boot-script/resolve-fx | simpan sampai rute `(fondasi)` terakhir |
| `src/app/globals.css` → `src/styles/{tokens,canvas,glass,layout,components,fx}.css` | `(fondasi)/layout.tsx`; class lama (`btn`, `glass-frost`, …) dipakai halaman `(fondasi)` | simpan sampai rute `(fondasi)` terakhir. Gaya komponen yang dihapus masih ada di `components.css` (CSS mati) dan ikut terhapus bersama berkasnya |
| `src/lib/categories.ts` | tidak ada konsumen di app setelah penghapusan; hanya `categories.test.ts` | simpan sampai Lomba dimigrasikan (M1), lalu bandingkan dengan taksonomi prototipe |
| `src/lib/utils.ts` (`cn`) | tidak ada konsumen; dirujuk `components.json` (shadcn) | simpan sampai konfigurasi Tailwind/shadcn dipensiunkan |
| `src/lib/time.ts` | tidak ada konsumen; logika zona waktu PRD 5.2, bukan visual | simpan |

Dependensi npm tidak diubah. `radix-ui` kini tidak dipakai kode mana pun (dulu hanya `Sheet`); dicabut bersama Tailwind/shadcn nanti.

### Uji

| Perintah | Hasil |
|---|---|
| `pnpm typecheck` | lulus |
| `pnpm lint` | lulus, 5 peringatan lama di kode prototipe yang disalin apa adanya |
| `pnpm test` | 273/273 (prototipe 227, unit 34, backend 12) |
| `pnpm build` | lulus |
| `pnpm test:e2e` | 14/14 (mobile + desktop) |

### Perbandingan screenshot (`pnpm visual:parity`)

Prototipe `:4321/_r005-referensi.html` vs `:3000/styleguide` (build produksi, `DEMO_MODE=true`), halaman penuh.

| Viewport | Tema | Ukuran | Piksel beda | Delta maks | Kontras gagal (prototipe / app) |
|---|---|---|---|---|---|
| 390×844 | terang | 390×1864 | 0 | 0 | 2 / 2 |
| 390×844 | gelap | 390×1864 | 0 | 0 | 0 / 0 |
| 1280×900 | terang | 1280×1523 | 0 | 0 | 2 / 2 |
| 1280×900 | gelap | 1280×1523 | 0 | 0 | 0 / 0 |

Sebelum font self-hosted, `next/font` menghasilkan 34.299 piksel beda di 1280 px dan tinggi halaman 390 px berbeda 20 px (satu baris banner terlipat berbeda).

### Regresi

Tidak ada regresi piksel. Fitur styleguide lama yang hilang bersama komponennya: pengalih tema/efek/kaca di halaman, demo sheet, dan segmented "Tanya Ata". Penggantinya adalah komponen prototipe di referensi.

### Keterbatasan

- Kontras label status di tema terang: diperbaiki di R0.2-0a (lihat di bawah).
- `hak.js` di repo prototipe masih Gratis 3 Slot, jadi layar Paket prototipe dapat berbeda dari produksi sampai prototipe diperbarui. `src/lib/prototype/lomba/logic/radar.js` masih punya default `BATAS_SLOT = 3` (salinan prototipe, tidak diubah).
- Data demo `SLOT_AWAL` berisi 2 Slot, jadi pengguna demo Gratis berada di atas batas 1 Slot dan butuh UI pemilihan Slot aktif di M1.
- `pnpm visual:parity` hanya lokal; prototipe tidak tersedia di CI. CI juga belum menjalankan `pnpm test:e2e`.

### Verifikasi fitur prototipe

Referensi komponen (tombol, label/status, banner, isian, folder Slot, memuat dan aset maskot) identik piksel di 390 dan 1280 px, terang dan gelap. Layar lengkap diverifikasi per layar di M1.

## R0.2-0a Kontras label status (22 November 2026)

Keputusan PO: perbaiki di prototipe dulu, lalu salin ke produksi.

| Label (tema terang) | Sebelum | Sesudah |
|---|---|---|
| `.status--ok` "Aktif" di atas `--success-soft` | `--success` #059669, 3,26:1 | `--sukses-teks` #04674A, 5,96:1 |
| `.status--warn` "Perlu cek" di atas `--warn-soft` | `--warn` #B45309, 4,29:1 | `--peringatan-teks` #8A3A06, di atas 4,5:1 |

- Rona hijau dan jingga, latar `-soft`, ikon, dan kata tetap; hanya warna teks yang diperdalam. Tidak ada perubahan opacity.
- Kedua token sudah dipakai `lingkungan.css` di layar prototipe; sekarang didefinisikan di `shared/ds.css` sehingga referensi komponen ikut benar.
- Tema gelap: token bernilai sama dengan `--success`/`--warn` gelap (#34D399, #FBBF24), jadi piksel tidak berubah.
- Berkas: `src/styles/prototype/shared/ds.css` (salinan dari prototipe), `tests/e2e/design-system.spec.ts` (pengecualian kontras dihapus), `docs/screenshots/styleguide-*.png`.
- `pnpm visual:parity`: LULUS. 0 piksel beda dan 0 kegagalan kontras (prototipe dan app) di 390/1280, terang/gelap.

## M1 Masuk/Paket (22 November 2026)

| Prototipe | Produksi |
|---|---|
| `masuk.html` (kerangka, mode `?embed=1`) | `src/app/(ata)/(layar)/layout.tsx` + `_layar/PasangLayar.tsx` |
| `masuk/ui/masuk.js` | `src/app/(ata)/(layar)/page.tsx` + `Masuk.tsx` (rute `/`) |
| `masuk/ui/paket.js` | `src/app/(ata)/(layar)/paket/` (rute `/paket`) |
| `shared/akun.js` (`/api/akun`) | `_layar/akun.ts` (`/api/v1/me`, `/api/v1/redeem`, logout, ekspor, hapus) |
| `akun.py harga()` | `src/lib/billing/price.ts` |
| `toast`, `sheet` di `masuk/app.js` | `_layar/Lapisan.tsx` |
| `shared/lingkungan.js`, `shared/sheet.js` | disalin apa adanya ke `src/lib/prototype/shared/` |

- Kerangka layar memakai DOM mode embed prototipe (tanpa bar prototipe, bingkai perangkat, rail, dan tab bar). Navigasi aplikasi datang bersama Hari Ini.
- Tema: `?tema=gelap|terang` seperti prototipe; tanpa parameter mengikuti sistem.
- Perbedaan yang disengaja dari prototipe:
  - Pesan galat OAuth memakai satu copy tetap (keputusan PO), bukan peta kode galat prototipe.
  - Teks "Admin perlu mengisi Client ID… (lihat HANDOFF.md)" tidak ditampilkan ke pengguna.
  - Ada tombol "Coba lagi" pada keadaan galat (prototipe tidak punya).
  - "Buka Progres" dan "Pakai tanpa akun dulu" mengarah ke rute lama `/progres` dan `/hari-ini` sampai layar itu dimigrasikan.
  - Layar Paket: batas Slot sama di kedua sisi (Gratis 1, Pro 3). Prototipe menampilkan 2 Slot demo terpakai; produksi 0 sampai tabel Slot ada.
  - Penanda "Belum tersedia" mengikuti audit per build: prototipe menandai panel juri dan konteks/analitik; produksi juga menandai Radar/Peta Jalan, Progres, Tanya Ata, Resep, dan Sidang Juri latihan karena layarnya belum dimigrasikan.

### Paritas

`pnpm visual:parity` sekarang juga membandingkan `masuk.html?embed=1#masuk` dengan `/` dan `#paket` dengan `/paket`. Prototipe harus dijalankan dengan `serve.py` (API akun) dan kredensial Google tiruan supaya tombol Google aktif di kedua sisi; app dibangun dan dijalankan dengan env Supabase dev. Lihat docs/DESIGN-SYSTEM.md.

- Piksel: 0 beda pada 8 kombinasi (2 layar × 390/1280 × terang/gelap), keadaan belum masuk.
- Ringkasan Slot di layar Paket (`.paket .lede`) ditutupi di kedua sisi karena isinya data. Halaman prototipe diberi daftar fitur produksi (`src/lib/prototype/masuk/data/paket.js`) supaya penanda yang sama dibandingkan.
- Sebelum screenshot, skrip memaksa raster ulang halaman. Tanpa itu, halaman yang sama kadang melukis kotak membulat di atas kaca berbeda satu piksel antar-muat. Tidak ada pengulangan.
- Kontras (audit prototipe): 0 kegagalan di prototipe dan app, terang dan gelap. "atau" dan eyebrow "Keanggotaan" kini memakai `--teks-di-foto` (diperbaiki di prototipe, disalin ke sini). Uji axe berjalan tanpa pengecualian.
- Keadaan sudah masuk, galat, dan sheet hapus akun diuji lewat Playwright (`tests/e2e/masuk-paket.spec.ts`), tidak lewat paritas piksel.

## M1 Hari Ini (22 November 2026)

| Prototipe | Produksi |
|---|---|
| `app.html` + `app/app.js` (rail, tab bar, penanda tab, maskot rail) | `src/app/(ata)/(apl)/layout.tsx` + `Cangkang.tsx` |
| `app/ui/hari-ini.js` | `src/app/(ata)/(apl)/hari-ini/` (`page.tsx`, `HariIni.tsx`, `data.ts`; rute `/hari-ini`) |
| `shared/bersama.js`, `shared/logic/bersama.js`, `shared/logic/maskot.js`, `shared/maskot.js`, `shared/folder.js`, `shared/gerak.js` | disalin apa adanya ke `src/lib/prototype/shared/` |
| `mascots/` | `public/prototype/mascots/` |

- Halaman placeholder lama `src/app/(fondasi)/(app)/hari-ini/page.tsx` dihapus; rute `/hari-ini` sekarang milik `(ata)/(apl)`. Empat tab lain (`/lomba`, `/ata`, `/progres`, `/profil`) masih halaman fondasi lama sampai dimigrasikan.
- Urutan impor CSS per kelompok rute disamakan dengan urutan `<link>` halaman prototipenya (`masuk.html`, `app.html`, `_r005-referensi.html`). Sebelumnya `lingkungan.css` dimuat setelah `fx.css` sehingga kaskade berbeda dari prototipe.
- Data: Slot dan tugas dibaca dari `ata-bersama` di perangkat (seed demo 1 Slot, K-23). Batas Slot dari server (`plan.features.activeSlots.limit` atau `slot_limits` di `/api/v1/me`). Bila API akun gagal, data perangkat tetap tampil dengan batas Gratis.
- Slot di atas batas tidak dihapus; diuji lewat fixture dua Slot (`tests/unit/prototype/fixtures/slot.mjs`, dan e2e), bukan lewat seed default.
- Diperbaiki di prototipe dulu, lalu disalin: kontras sapaan (`--teks-di-foto`), tombol langkah di kolom sempit, token tema gelap di `ds.css`, penanda tab diukur ulang saat tab bar/rail berubah ukuran, nama aksesibel baris Slot (tanpa `aria-label`, memakai teks yang terlihat) dan tombol status tugas.

### Uji dan paritas

- `pnpm visual:parity` membandingkan `app.html` dengan `/hari-ini`: 0 piksel beda dan 0 kegagalan kontras di 390/1280, terang/gelap. Penunjuk digerakkan ke koordinat yang sama di kedua sisi sebelum screenshot karena sprite maskot rail mengikuti penunjuk.
- `tests/e2e/hari-ini.spec.ts`: lima tab, tab bar HP vs rail desktop, Gratis 1 Slot, Pro 3 Slot, API akun gagal, fixture di atas batas, selesaikan tugas + XP, tema dan reset demo, luapan horizontal, axe terang dan gelap tanpa pengecualian.
- Uji kerangka fondasi di `tests/e2e/design-system.spec.ts` pindah dari `/hari-ini` ke `/progres`.

### Keterbatasan

- Slot dan tugas belum tersimpan per akun di database; tabel Slot dibuat saat Lomba dimigrasikan.
- Tautan Slot dan tab Lomba membuka halaman fondasi lama.
- Belum diuji di browser dengan sesi Google sungguhan; e2e memakai respons `/api/v1/me` tiruan.
