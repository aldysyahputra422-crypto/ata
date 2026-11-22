# Ata Design System — implementasi prototipe

Berlaku sejak R0.2-0 (22 November 2026). Menggantikan "Airy Glass" (arsip: [docs/arsip/DESIGN-SYSTEM-airy-glass.md](arsip/DESIGN-SYSTEM-airy-glass.md)).

## 1. Otoritas

| Ruang lingkup | Acuan |
|---|---|
| Kebutuhan dan perilaku produk | docs/PRD.md dan blueprint keputusan final (`ata-prototype/docs/blueprint/`) |
| Lingkup demo gratis | Lampiran D PRD. Tidak mengesampingkan keamanan, BYOK, atau spesifikasi produk lain |
| Visual dan interaksi | Prototipe terbaru di `ata-prototype` |
| Aturan implementasi | Dokumen ini. Bila berbeda dengan prototipe, prototipe yang menang dan dokumen ini diperbarui |

## 2. Sumber di prototipe

- `shared/ds.css`: token Senja, tipografi, komponen dasar. CSS lain: `shared/{states,fx,folder,lingkungan,maskot,tarik,embed}.css` dan CSS per modul (`app/`, `lomba/`, `masuk/`, `tanya/`, `sidang/`, `portofolio/`, `parts/`).
- `_r005-referensi.html` + `uji-visual/komponen.html`: halaman referensi komponen untuk uji paritas.
- Layar `*.html` dan `assets/`: acuan layar dan aset.
- `shared/audit-kontras.js`: audit kontras WCAG dari warna yang benar-benar dirender.

## 3. Lokasi di produksi

| Isi | Lokasi |
|---|---|
| CSS prototipe (disalin apa adanya, hanya path aset diubah ke `/prototype/assets/`) | `src/styles/prototype/` |
| Logika murni prototipe | `src/lib/prototype/` |
| Aset | `public/prototype/assets/` |
| Font Plus Jakarta Sans v12 (berkas yang sama dengan yang dimuat prototipe dari Google Fonts) | `public/prototype/fonts/` + `src/app/(ata)/fonts.css` |
| Root layout layar hasil migrasi | `src/app/(ata)/layout.tsx` |
| Markup referensi komponen | `src/app/(ata)/uji-visual/komponen.html` (salinan persis, jangan diubah) |

## 4. Token Senja

Nilai ada di `src/styles/prototype/shared/ds.css`; jangan disalin ke tempat lain.

| Kelompok | Token (nilai terang) |
|---|---|
| Halaman dan permukaan | `--page` #F5E6DC, `--bg` #FFF8F3, `--surface` #FFFFFF, `--surface-sunken` #FBEEE6, skala `--mist-*` |
| Teks dan garis | `--text` #2A1410, `--text-muted` #6E574C, `--border`, `--border-strong` |
| Aksen | `--primary` #CF3A1C, `--primary-hover`, `--primary-ink`, `--primary-soft`; hero `--hero-a` #FFB07A → `--hero-b` #FF7FA3; `--spark` #FFC400 |
| Semantik | `--success`, `--warn`, `--danger`, `--info` dan pasangan `*-soft` |
| Kaca dan bayangan | `--glass`, `--glass-hi`, `--seg-a/b`, `--shadow-1..3` |
| Tipografi | `--font-display`, `--font-body` ('Plus Jakarta Sans'); `--fs-tampil`, `--fs-judul`, `--fs-sub`, `--fs-teks`, `--fs-dukung`, `--fs-meta`, `--fs-label` |

Tema gelap: `:root[data-theme="dark"]` (dan `prefers-color-scheme` bila `data-theme` tidak di-set) mengganti nilai token yang sama.

## 5. Tema, font, ikon

- **Tema:** atribut `data-theme="light|dark"` di `<html>`. Halaman referensi membaca `?tema=`.
- **Font:** `src/app/(ata)/fonts.css` mendeklarasikan family `'Plus Jakarta Sans'` dengan berkas self-hosted, sehingga token font prototipe berlaku tanpa jembatan. `next/font` tidak dipakai karena mengunduh build berkas latin yang berbeda dan menggeser glyph serta baris dibanding prototipe.
- **Ikon:** `mountIcons(root)` dari `src/lib/prototype/shared/ds.js` mengisi setiap `[data-icon]`. Panggil di `useEffect` setelah markup terpasang.

## 6. Aturan migrasi ke React

1. Pertahankan markup, struktur elemen, nama class, dan atribut ARIA prototipe. Data diganti dari API (`/api/v1/me`, dst.), bukan dari `SeedAdapter` bila datanya sudah ada di server.
2. Import CSS prototipe yang dibutuhkan layar; jangan menulis ulang gayanya. Tidak ada Tailwind, shadcn, atau komponen `src/components/ds/` di layar hasil migrasi.
3. Batas paket dibaca dari `src/lib/entitlements/config.ts`. Angka berstatus usulan tidak ditampilkan sebagai ketentuan final.
4. Setiap layar punya keadaan memuat, kosong, galat, dan belum masuk.
5. Galat ditampilkan dengan copy yang aman, tanpa detail teknis, token, atau data sensitif.
6. Bila tampilan berbeda dari prototipe, perbaiki migrasinya. Prototipe tidak diubah agar cocok.

## 7. Aksesibilitas

- Kontras teks AA (4,5:1; 3:1 untuk teks besar) di terang dan gelap, diukur dengan axe (Playwright) dan `audit-kontras.js`.
- Keyboard: kontrol radiogroup memakai panah/Home/End (`mountSeg`). Fokus terlihat.
- Hormati `prefers-reduced-motion` sesuai CSS prototipe.
- Cacat kontras yang ditemukan di prototipe diperbaiki di prototipe dulu, lalu disalin ke produksi; tidak diperbaiki diam-diam di produksi. Teks status memakai `--sukses-teks` dan `--peringatan-teks` (rona sama, lebih dalam) di atas latar `-soft`.

## 8. Review dan paritas

- `/styleguide` (hanya `DEMO_MODE=true`, 404 bila tidak) merender referensi komponen prototipe dengan CSS produksi. `/uji-visual` merender markup yang sama, hanya di mode development.
- `pnpm screenshots`: screenshot /styleguide 390 dan 1280 px, terang dan gelap.
- `pnpm test:e2e`: bagian referensi tampil, tema `?tema=`, tanpa scroll horizontal di 390 px, kontras axe di dua tema.
- `pnpm visual:parity` (lokal saja, prototipe tidak ada di CI):
  1. `python3 -m http.server 4321` di folder `ata-prototype`.
  2. `pnpm build && DEMO_MODE=true pnpm start` di repo ini.
  3. `pnpm visual:parity`. Variabel: `PROTO_URL`, `APP_URL`, `OUT_DIR` (default `docs/screenshots/parity`), `PROTO_DIR` (default `../ata-prototype`).
  Skrip membandingkan screenshot halaman penuh 390×844 dan 1280×900, terang dan gelap, menyimpan PNG beda, menjalankan `audit-kontras.js` di kedua halaman, dan gagal bila ada piksel dengan selisih > 8/255 atau kegagalan kontras.

## 9. Fondasi lama yang tersisa

Fondasi "Airy Glass" masih melayani rute `src/app/(fondasi)/` (`/`, `/hari-ini`, `/lomba`, `/ata`, `/progres`, `/profil`). Bagian itu dipensiunkan saat layarnya dimigrasikan:

| Bagian lama | Dipensiunkan saat |
|---|---|
| `/hari-ini`, `/lomba` dan `EmptyState` di halamannya | M1 (Hari Ini, Lomba) |
| `/` (beranda), `/ata`, `/progres`, `/profil` | saat layar Masuk, Tanya, Progres, Profil dimigrasikan |
| `AppShell`, `NavRail`, `TabBar`, `nav-icons`, `src/lib/nav.ts` | rute bertab terakhir di `(fondasi)` |
| `(fondasi)/layout.tsx`, `DemoBanner`, `FxProvider`, `MeshBackground`, `RefractDefs`, `Toaster`, `src/lib/fx/`, `src/app/globals.css`, `src/styles/{tokens,canvas,glass,layout,components,fx}.css` | rute `(fondasi)` terakhir |

Rincian audit per berkas: docs/MIGRASI-UI.md.
