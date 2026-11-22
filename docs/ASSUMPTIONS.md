# Asumsi

Keputusan yang diambil tanpa bertanya, sesuai aturan kerja. Ubah di sini bila salah.

## K-23: matriks paket Gratis vs Pro (keputusan PO, R0.2-0)

Hanya **Slot aktif** yang final. Semua batas lain adalah **usulan (belum final)**: dievaluasi PO, tidak boleh ditampilkan sebagai ketentuan permanen. Sumber tunggal: `src/lib/entitlements/config.ts` (`CONFIG_VERSION = 2`), dicerminkan di tabel `plan_features` oleh migrasi `0004_entitlement_k23_active_slots.sql`.

| Fitur | Gratis | Pro | Status |
|---|---|---|---|
| Slot aktif | 1 | 3 | **final** (Gratis K-23, Pro K-03) |
| Lomba manual tersimpan | 10 | tanpa batas | usulan (belum final) |
| Handoff Pack | 15/bulan | tanpa batas | usulan (belum final) |
| Validasi berkas | 3/bulan | 50/bulan (kalibrasi dari biaya nyata) | usulan (belum final) |
| Prompt tersimpan | 10 | tanpa batas | usulan (belum final) |
| Jury Pack | 5/bulan | tanpa batas | usulan (belum final) |
| Persona juri | 1 | tanpa batas | usulan (belum final) |
| Riwayat versi juri | 3 | tanpa batas | usulan (belum final) |
| Item portofolio | 10 | tanpa batas | usulan (belum final) |
| Laporan orang tua | 1/bulan | tanpa batas | usulan (belum final) |
| Jendela analitik | 28 hari | tanpa batas | usulan (belum final) |
| Konteks pribadi penuh, Peta Jalan adaptif, workflow multi-langkah, panel juri, Red Team juri, rubrik resmi, workflow multi-koneksi, pemantauan sumber, laporan evaluasi PDF | tidak | ya | usulan (belum final) |

**Slot di atas batas** (mis. Pro turun ke Gratis, atau data demo): Slot lama, arsip, riwayat, dan Data Progres tidak dihapus dan tidak diarsipkan otomatis. Batas hanya mencegah menambah atau mengaktifkan Slot baru. Pengguna memilih sendiri Slot yang tetap aktif lewat UI (M1). Penegakan di database (trigger) dibuat bersama tabel Slot per akun di M1.

## Dari PRD Bagian 12 (asumsi default dipakai)

Semua 14 butir memakai kolom "Asumsi default". Yang paling memengaruhi tahap awal:

- #3 dan #14: tanpa akses Meta, Radar memakai `SeedAdapter` + unggah manual (Lampiran D).
- #9: aset maskot belum tersedia. `EmptyState` menampilkan lingkaran penanda berukuran sama (112 px) sampai berkas masuk ke `public/mascot/<pose>.png`.
- #11: domain demo `*.vercel.app`.

## Baru (tahap SETUP)

| # | Asumsi | Alasan |
|---|---|---|
| S1 | Server MCP macOS dipindah dari akar repo ke `tools/creative-apps-mcp/` | Akar repo dipakai aplikasi Next.js. Config Claude Desktop lama yang menunjuk `ata/server.py` perlu dibuat ulang |
| S2 | Next.js dikunci di `15.5.29`, Tailwind v4, React 19 | "15.x terbaru yang sudah ditambal" saat setup; bukan Next 16 |
| S3 | shadcn/ui dipasang manual (components.json + `radix-ui`, `sonner`, `cva`, `tailwind-merge`) | Registry `ui.shadcn.com` diblokir jaringan sesi cloud. Hasilnya setara; `pnpm dlx shadcn add` tetap bisa dipakai di Mac |
| S4 | Komponen design system di `src/components/ds/` | Mengikuti DESIGN-SYSTEM 11.1 (lebih baru daripada `components/glass` di PRD 8.3) |
| S5 | Efek desktop ada di `src/styles/fx.css` (berkas tambahan) | Memisahkan semua aturan `data-fx="rich"` agar mudah diaudit |
| S6 | Bentuk panel depan folder memakai mask SVG + garis tepi SVG | Satu lapisan blur per folder (batas ≤ 3 blur di HP) dengan tab menyatu seperti referensi 2 |
| S7 | Lencana di atas poster (`DATA DEMO`, deadline) berlatar solid terang di kedua tema | Poster selalu pastel; uji kontras otomatis gagal dengan warna semantik tema gelap |
| S8 | Panel sheet/dialog dan toast dibuat hampir solid (86–94%) walau Kaca Penuh | Ada teks di atasnya; kontras AA harus terjaga di atas latar bergerak |
| S9 | Lima rute tab (`/hari-ini`, `/lomba`, `/ata`, `/progres`, `/profil`) berisi placeholder | Hanya untuk meninjau kerangka responsif; belum ada fitur |
| S10 | `/api/health` memakai service role dan mengembalikan `{ok}` saja | `system_flags` hanya terbaca pengguna terautentikasi; ping keepalive tidak login |
| S11 | `DEMO_MODE` dibaca saat build untuk halaman statis | Mengubah `DEMO_MODE` di Vercel perlu redeploy |
| S12 | Stiker kategori = glif Lucide di atas bentuk gem, ditandai `TODO(design)` | DESIGN-SYSTEM 10: sementara, diganti ilustrasi desainer sebelum publik |
| S13 | PWA (manifest, service worker Serwist) belum dikonfigurasi; paketnya sudah terpasang | PROMPT SETUP melarang fitur aplikasi di tahap ini; FR-PWA-01/02 masuk Hari 1 |
| S14 | Kolom "Referensi" di `/styleguide` (DS-04, P1) belum dibuat | Gambar referensi berisi karya pihak ketiga; tidak disajikan dari `public/` |
| S15 | Video `ref-5-pull-paw-motion.mp4` disimpan sebagai referensi gerak ke-5 | Belum dipetakan di DESIGN-SYSTEM.md. Usulan: tarik-untuk-segarkan dengan maskot di Hari Ini, hanya `rich`/opsional. Butuh keputusan Product Owner |
| S16 | Skill desain eksternal tidak dipasang ke repo | Lihat docs/EXTERNAL-SKILLS.md |
| S17 | TRIBE v2 tidak dipakai | Lisensi non-komersial dan keluarannya peta aktivasi otak, bukan ukuran perasaan pengguna (docs/EXTERNAL-SKILLS.md) |
| S18 | Palet **Senja** (koral, peach, merah muda, netral hangat) menggantikan palet ungu-biru; permata `lavender` diganti `coral` dan `--gem-lavender-*` dipertahankan sebagai alias sementara | Keputusan Product Owner 12 Nov 2026: ungu terasa generik. Alias dihapus setelah semua komponen memakai `coral` |
| S19 | Harga Pro tetap ditampilkan di `/paket` (Rp69.000/bulan, tahunan diskon 10%, dihitung di `src/lib/billing/price.ts`) dan tombol bayar hanya menampilkan "Pembayaran belum diaktifkan di server ini" | Mengikuti prototipe dan blueprint 16; tanpa payment gateway (Lampiran D) |
| S20 | "Pakai tanpa akun dulu" hanya menyimpan penanda di perangkat (`localStorage`) lalu membuka `/hari-ini` | Onboarding dan penyimpanan lokal prototipe belum dimigrasikan |
| S21 | "Slot terpakai" di `/paket` selalu 0 | Tabel Slot per akun baru dibuat saat Lomba dimigrasikan; batasnya sudah dari entitlement server (K-23) |
