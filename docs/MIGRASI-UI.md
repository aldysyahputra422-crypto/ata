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

- **Kontras di prototipe (terang):** label `.status--ok` "Aktif" 3,26:1 dan `.status--warn` "Perlu cek" 4,29:1 (butuh 4,5:1). Cacat ini identik di prototipe. Di layar prototipe, `lingkungan.css` menimpa warna `.status--ok` (#04674A), tetapi `.status--warn` tidak ditimpa. Uji e2e mencatat dua selector ini sebagai cacat prototipe yang diketahui; kegagalan baru tetap menggagalkan uji. `pnpm visual:parity` tetap keluar gagal karena aturan "nol kegagalan kontras". Menunggu keputusan PO.
- `hak.js` di repo prototipe masih Gratis 3 Slot, jadi layar Paket prototipe dapat berbeda dari produksi sampai prototipe diperbarui. `src/lib/prototype/lomba/logic/radar.js` masih punya default `BATAS_SLOT = 3` (salinan prototipe, tidak diubah).
- Data demo `SLOT_AWAL` berisi 2 Slot, jadi pengguna demo Gratis berada di atas batas 1 Slot dan butuh UI pemilihan Slot aktif di M1.
- `pnpm visual:parity` hanya lokal; prototipe tidak tersedia di CI. CI juga belum menjalankan `pnpm test:e2e`.

### Verifikasi fitur prototipe

Referensi komponen (tombol, label/status, banner, isian, folder Slot, memuat dan aset maskot) identik piksel di 390 dan 1280 px, terang dan gelap. Layar lengkap diverifikasi per layar di M1.
