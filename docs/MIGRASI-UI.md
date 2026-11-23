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

## M1 Hari Ini: empat temuan uji browser (22 November 2026)

Diperbaiki di prototipe dulu (ata-prototype PR #7), lalu disalin.

- **Tanggal lewat tengah malam:** `HARI_INI` di `src/lib/prototype/shared/bersama.js` kini binding hidup dari `tanggalLokal()` dan disegarkan pada setiap baca store. `dengarHari()` di `hari-ini/data.ts` menggambar ulang layar saat tanggal lokal berganti (interval 30 detik, `visibilitychange`, `focus`). `hariLagi` lomba katalog dihitung saat dibaca, sehingga tenggat tidak bergeser.
- **Slot di atas batas:** `.slot-lebih` menampilkan jumlah Slot dari store dan batas serta nama paket dari `/api/v1/me` (batas perangkat hanya bila API akun gagal). Slot tidak dihapus, diarsipkan, atau diubah.
- **DATA DEMO:** `.label-demo` di samping tanggal bila ada Slot dari katalog contoh; tidak muncul untuk lomba yang ditulis pengguna; kembali setelah "Reset data demo".
- **Kontras dock tema gelap:** `lingkungan.css` disalin dari prototipe (dock berona asap, pil aktif lebih pekat). Tema terang tidak berubah.

### Uji

- `tests/unit/prototype/hari-ini-temuan.test.mjs` (9 kasus, jam tiruan).
- `tests/e2e/hari-ini.spec.ts`: pemberitahuan Slot mengikuti batas server (Gratis 1, Pro 3, Pro dengan batas 1), label demo dan reset, halaman terbuka melewati tengah malam lalu muat ulang (`page.clock`), dan kontras label tab diukur dari piksel screenshot (minimal 4,5:1, terang dan gelap, HP dan desktop). Uji kontras ini gagal pada CSS lama (1,00:1 HP, 1,48:1 desktop).
- `pnpm visual:parity` target Hari Ini: 0 piksel beda, 0 kegagalan kontras di 390/1280, terang/gelap.

### Keterbatasan

- "Atur Slot aktif di Lomba" membuka `/lomba` (halaman fondasi lama); di prototipe tautan ini langsung membuka layar Slot. Disamakan saat Lomba dimigrasikan.

## M1 Lomba (22 November 2026)

Lima layar prototipe (Radar, Tersimpan, Detail, Slot, Peta Jalan) berjalan di `/lomba` dengan hash `#radar`, `#tersimpan`, `#lomba-detail`, `#slot`, `#peta`. Modul vanilla prototipe tetap menggambar markup dan menangani interaksi (sheet, toast, keyboard, tarik-untuk-segarkan, transisi); React hanya memegang siklus hidup rute, banner keadaan, dan sinkron akun.

### Berkas yang diubah atau ditambah

- `supabase/migrations/0005_user_competitions.sql`, `src/lib/account/competitions.ts`, `src/app/api/v1/user-competitions/`: tabel per akun, RLS, trigger batas Slot aktif (dibaca dari `plan_features`), GET/PUT/DELETE.
- `src/app/(ata)/(apl)/lomba/`: `page.tsx`, `Lomba.tsx` (host), `sinkron.ts` (gabung server + perangkat, selisih, antrean kirim), `lomba-apl.css` (menaruh `.views` di kerangka app).
- `src/lib/prototype/lomba/` (`state.js`, `data/maze.js`, `ui/`, `pasang.js`), `src/lib/prototype/shared/akun.js`, `tarik.js`, `bersama.js`: salinan prototipe; beda yang ada hanya path aset (`/prototype/assets/…`) dan `pasang.js`, adaptasi `lomba/app.js` yang memakai kerangka app alih-alih chrome prototipe.
- `hari-ini/HariIni.tsx`: tautan Slot kini ke `/lomba#slot`.
- `src/lib/prototype/masuk/data/paket.js`: penanda "Belum tersedia" dilepas dari Radar/Peta Jalan.
- `scripts/visual-parity.mjs`: target `lomba-`.

### Berkas yang dihapus

- `src/app/(fondasi)/(app)/lomba/page.tsx`: placeholder fondasi lama. Audit dependensi: tidak diimpor berkas lain; `EmptyState` masih dipakai halaman fondasi lain sehingga tidak dihapus.

### Sinkron akun

- Tidak ada yang dikirim sebelum `GET /api/v1/user-competitions` berhasil. Belum masuk atau API gagal: data tetap di perangkat, banner menjelaskan.
- Baca pertama menggabungkan baris akun dengan data perangkat, lalu mengirim yang belum ada di akun. Reset demo atau perubahan dari tab lain memicu baca ulang, bukan penghapusan baris akun.
- Pelepasan Slot dikirim sebelum Slot baru. 409 `limit_reached`: Slot tetap di perangkat, pengguna diberi tahu, tidak dicoba ulang sampai berubah.
- Slot akun di atas batas (setelah turun paket) tetap ditampilkan dan bisa diedit; tidak ada yang dihapus atau diarsipkan otomatis.
- Teks Slot: "Paket {nama} mencakup {batas} Slot aktif." dengan nama dan batas dari server (prototipe: cabang `devin/1795317581-slot-copy`).
- Pencarian tanpa key: hanya menyusun kata kunci siap pakai; tidak ada hasil penyedia yang ditampilkan.

### Uji

- `tests/backend/user-competitions*.test.ts`: RLS, isolasi, batas Gratis/Pro, turun paket, validasi, ekspor, hapus berantai, HTTP.
- `tests/unit/lomba-sinkron.test.ts` (10 kasus).
- `tests/e2e/lomba.spec.ts`: lima hash, belum masuk, teks Gratis/Pro, impor saat masuk pertama, Slot ditolak, Slot di atas batas, akun tak terjangkau, simpan dari Detail, pencarian tanpa key, tautan Hari Ini, axe terang dan gelap, luapan horizontal, 390 dan 1280 px.
- Hasil: typecheck lulus, lint 0 galat, 310 unit, 94 e2e, build lulus.

### Paritas (`pnpm visual:parity`, target `lomba-`: Radar)

- 0 kegagalan kontras di prototipe dan app, 390/1280, terang/gelap.
- Piksel beda di atas toleransi: 796 (390 terang), 715 (390 gelap), 211 (1280 terang), 143 (1280 gelap). Semuanya di sudut bingkai: di dalam `app.html`, iframe Lomba prototipe masih menggambar sudut membulat `.device .app` (38 px HP, 18 px desktop) karena aturan `border-radius: 0` di `shared/embed.css` kalah spesifisitas. App tidak punya sudut itu. Menunggu keputusan: perbaiki di prototipe, atau tiru di app. **Diputuskan dan diperbaiki di prototipe (ata-prototype PR #10); paritas lima layar dan pemeriksaan gerbang lain ada di docs/gerbang-m1-lomba.md.**
- Hanya Radar yang dibandingkan piksel; empat layar lain diperiksa lewat e2e dan screenshot manual.

### Keterbatasan

- Migrasi 0005 diuji di PGlite dan di Supabase lokal (docs/gerbang-m1-lomba.md, bagian F); belum dijalankan di `ata-dev`. Pemetaan 409 dan upsert belum diuji terhadap PostgREST sungguhan.
- Belum diuji di browser dengan sesi Google sungguhan.
- Target paritas Masuk gagal di mesin tanpa konfigurasi Google (tombol Google nonaktif); tidak terkait perubahan ini.

## M1 Progres per akun (23 November 2026)

Hari Ini dan Lomba memakai markup dan class prototipe yang sama; yang berubah hanya sumber datanya.

### Berkas yang diubah atau ditambah

- `src/app/(ata)/(apl)/hari-ini/HariIni.tsx`, `data.ts`: sumber data `lokal` (belum masuk) atau `akun` (`/api/v1/progress`, `/api/v1/tasks`); keadaan memuat, galat akun dengan "Coba lagi", dan gagal simpan ("Belum tersimpan ke akun. Coba lagi."). "Reset data demo" dan label DATA DEMO hanya untuk data perangkat.
- `src/app/(ata)/_layar/lingkup.ts` (baru): pemisahan store perangkat dan salinan akun.
- `src/app/(ata)/(apl)/lomba/Lomba.tsx`, `sinkron.ts`: tidak lagi mengunggah data perangkat saat pertama masuk; status langkah dikirim lewat `/api/v1/tasks`, tidak di dalam dokumen Peta Jalan.
- `src/lib/prototype/shared/bersama.js`, `shared/logic/bersama.js`: salinan akun tidak diisi data contoh. Ini satu-satunya penyimpangan dari logika prototipe, dan hanya berlaku saat `ata-lingkup` menunjuk akun.

### Berkas yang dihapus

Tidak ada.

### Uji

- e2e: `tests/e2e/hari-ini.spec.ts` (8 skenario akun baru, axe dan overflow untuk data perangkat dan akun, terang/gelap), `tests/e2e/lomba.spec.ts` (masuk tidak mengirim data contoh; keluar mengembalikannya).
- Unit/backend: `tests/unit/account-progress.test.ts`, `tests/unit/lomba-sinkron.test.ts`, `tests/backend/task-progress.test.ts`, `tests/backend/tasks-http.test.ts`.

### Regresi dan keterbatasan

- Perilaku yang sengaja berubah: akun yang masuk tidak lagi melihat atau menerima Slot contoh dari perangkat.
- `pnpm visual:parity` tidak dijalankan ulang: tidak ada CSS atau markup yang berubah.
- Profil: lihat "Fase A". (Progres: lihat "M1 Layar Progres".)
- Penutup (23 November 2026): tanggal di kepala Hari Ini memakai `today` dari `/api/v1/progress` (zona waktu akun) saat masuk; belum masuk tetap jam perangkat. Markup dan CSS tidak berubah. Uji: `tests/e2e/hari-ini.spec.ts` (jam perangkat 21 November 23.58, hari akun 22 November).

## M1 Layar Progres (23 November 2026)

Port `masuk/ui/progres.js` ke `/progres` di shell `(ata)/(apl)`, dengan markup, class, dan CSS prototipe (`masuk/masuk.css`, `shared/states.css`).

### Berkas yang diubah atau ditambah
- `src/app/(ata)/(apl)/progres/{page.tsx,Progres.tsx,progres-apl.css}`: layar. `progres-apl.css` hanya menyatakan ulang posisi toast shell (di prototipe layar ini hidup dalam iframe) dan ukuran judul cincin.
- `src/app/(ata)/(apl)/hari-ini/pakaiData.ts`: hook `useDataHari` (lingkup akun/perangkat, muat, buang jawaban lama) dipindah dari `HariIni.tsx` agar Hari Ini dan Progres memakai satu sumber. Perilaku Hari Ini tidak berubah.
- `src/app/(ata)/(apl)/hari-ini/data.ts`: `aktivitas` (akun: `activity` dari server; perangkat: `aktivitasHarian` dari store).
- `src/lib/account/progress.ts`, `src/app/api/v1/progress/route.ts`: bidang aditif `activity`.
- `tests/e2e/progres.spec.ts`, `tests/e2e/akun.ts`, `tests/unit/account-progress.test.ts`.

### Berkas yang dihapus
- `src/app/(fondasi)/(app)/progres/page.tsx` (placeholder). Audit: tidak diimpor berkas lain; satu-satunya pemakai adalah uji kerangka fondasi di `tests/e2e/design-system.spec.ts`, yang pindah ke `/ata`.

### Beda dari prototipe
- Ditambah: baris XP/level/streak dan kartu Pencapaian (class `xp-baris`, `pencapaian` dari Hari Ini), karena Product Owner meminta keduanya di Progres.
- Timer fokus, Kesiapan submit, Check-in mingguan: kartu bertanda "Belum tersedia" tanpa kontrol dan tanpa angka; "menit fokus tercatat" dihapus dari kalimat pembuka. Kartu "Data progres" tidak dipindahkan.
- Judul Slot di cincin memakai `h2` (prototipe `h3`) agar urutan heading lolos axe.
- Kotak centang baru berubah setelah server menjawab (bukan optimistis), dan nonaktif selama permintaan berjalan.

### Uji
- `tests/e2e/progres.spec.ts`: akun, belum masuk, memuat, kosong, galat + coba lagi, simpan gagal, klik ganda, pindah lingkup perangkat ke akun, axe dan luapan horizontal pada 390 px dan 1280 px, terang dan gelap.

### Keterbatasan
- `masuk.css` memuat `.toast { bottom:152px }`; setelah Progres dibuka, `progres-apl.css` menahan toast shell di 96 px untuk semua tab.
- Belum diuji terhadap Supabase sungguhan; e2e memakai API tiruan.

## Atribut dokumen dari server: hydration `<body>` (23 November 2026)

**Gejala.** Di `/hari-ini` dan `/lomba`, React melaporkan atribut `<body>` berbeda dari HTML server (mode dev).

**Akar masalah.** `app.css` prototipe menata `body.badan-aplikasi`, tetapi `<body>` dirender root layout bersama `(ata)/layout.tsx` tanpa class. Skrip `BOOT` di `(apl)/layout.tsx` menambah class itu sebelum hydration, jadi DOM tidak lagi sama dengan markup server. Skrip itu juga tidak berjalan pada navigasi client.

**Perbaikan.** Tiap jenis halaman prototipe menjadi root layout sendiri, dan atributnya ada di HTML server:

| Prototipe | Root layout | Atribut dari server |
|---|---|---|
| `app.html` | `(apl)/layout.tsx` | `<body class="badan-aplikasi">` |
| `masuk.html?embed=1` | `(layar)/layout.tsx` | `<html data-embed="1">` |
| `uji-visual/komponen.html` | `styleguide/layout.tsx`, `uji-visual/layout.tsx` | tidak ada |

### Berkas

- Ditambah: `_layar/Dokumen.tsx` (`<html>`/`<body>`, metadata, viewport), `styleguide/layout.tsx`, `uji-visual/layout.tsx`, `tests/e2e/dokumen.spec.ts`.
- Diubah: `(apl)/layout.tsx`, `(layar)/layout.tsx` (kini root layout; `BOOT` tidak lagi menyentuh class `<body>` atau `data-embed`), `_layar/PasangLayar.tsx` (pembersihan `data-embed` dihapus).
- Dihapus: `src/app/(ata)/layout.tsx`. Audit dependensi: tidak diimpor berkas lain; isinya (ds.css, fonts.css, metadata, viewport, `<html>`/`<body>`) pindah ke empat root layout di atas dengan urutan impor CSS yang sama.

### Perilaku

- Pindah antara kerangka layar (`/`, `/paket`) dan shell aplikasi (`/hari-ini`, `/lomba`) kini memuat dokumen penuh, seperti antarhalaman prototipe. Pindah tab di dalam shell tetap tanpa muat ulang.
- CSS prototipe, markup layar, dan tema tidak berubah.

### Keterbatasan

- `suppressHydrationWarning` pada `<html>` tetap ada untuk `data-theme` dari `?tema=`, dan pada `.device` untuk `data-device` dari lebar layar: keduanya hanya diketahui browser sebelum cat pertama.

## Fase A: Kenalan dan Profil per akun (23 November 2026)

Sumber prototipe: `masuk/ui/onboarding.js`, `masuk/ui/pengaturan.js`, `masuk/ui/data-progres.js`. Markup dan class prototipe dipertahankan; yang berubah sumber datanya (akun, bukan `localStorage`).

### Berkas yang diubah atau ditambah

- `src/app/(ata)/(layar)/kenalan/` (baru): onboarding tujuh langkah, simpan per langkah ke `PATCH /api/v1/profile`, lanjut dari jawaban wajib pertama yang kosong.
- `src/app/(ata)/(apl)/profil/` (baru): formulir profil, izin data AI, ekspor, keluar, hapus akun. `profil-apl.css` hanya menata tata letak formulir yang tidak ada di prototipe.
- `src/app/(ata)/_layar/akun.ts`, `_layar/profil.ts` (baru): pemanggil API dan aturan murni (pemetaan jawaban, validasi, selisih).
- `src/app/api/v1/profile/`, `src/app/api/v1/permissions/`, `src/lib/account/profile.ts`, `supabase/migrations/0007_profile_onboarding.sql`.
- `src/app/api/v1/auth/google/callback/route.ts`: akun yang belum selesai onboarding mendarat di `/kenalan`.

### Berkas yang dihapus

- `src/app/(fondasi)/(app)/profil/page.tsx`: placeholder fondasi tanpa fitur, tidak diimpor berkas lain; rutenya kini dilayani `(ata)/(apl)/profil`.

### Uji

- Backend (PGlite): `tests/backend/profile.test.ts` (25 uji: tanpa tulis langsung, anon dan sesi kedaluwarsa ditolak, validasi, isolasi dua akun, idempotensi, audit izin, ekspor).
- Unit: `tests/unit/profil.test.ts`. e2e: `tests/e2e/profil.spec.ts` (390 px dan 1280 px, terang/gelap, axe, memuat/galat/belum masuk, ketuk ganda, gagal simpan) dengan API akun tiruan.

### Keterbatasan

- Belum diuji terhadap `ata-dev`: migrasi 0007 belum diterapkan di sana, jadi `/kenalan` dan simpan Profil akan gagal di `ata-dev` sampai migrasi dijalankan.
- Tahun lahir maksimum dihitung dari tahun berjalan (usia minimal 10), bukan angka tetap 2012 di prototipe.
- Pengaturan tampilan prototipe (tema, kaca, gerak) dan "Data progres" perangkat belum dipindahkan ke `/profil`.
- `pnpm visual:parity` tidak dijalankan: tidak ada padanan satu-banding-satu untuk formulir Profil di prototipe.

## Tanya Ata (`/ata`), Fase B

- Layar: `src/app/(ata)/(apl)/ata/` (`TanyaAta.tsx`, `api.ts`, `tanya-apl.css`). Markup dan kelas mengikuti `tanya/ui/chat.js` prototipe (`chat`, `ctxline`, `ctxdetail`, `msg`, `chips`, `ai-status`, `composer`, `ai-penyedia`, `promptbox`) dengan `tanya.css` apa adanya. Placeholder lama di `(fondasi)/(app)/ata` dihapus.
- Yang dipindahkan: tab Chat saja. Resep, Langkah Resep, Ingatan, thread ganda, "Akhiri", "Tempel jawaban", dan jawaban contoh tidak dipindahkan.
- Berbeda dari prototipe: baris konteks menampilkan izin data akun (bukan profil contoh); tiap jawaban punya rincian "Data akun yang dipakai"; sheet sambungan memuat daftar provider dan model dari server.
- Uji: `tests/e2e/tanya.spec.ts` (390 px dan 1280 px, terang/gelap, axe, memuat/galat/kosong/belum masuk/berhasil, gerak dikurangi) dengan API tiruan.
- `pnpm visual:parity` tidak dijalankan untuk layar ini.
