# Asumsi

Keputusan yang diambil tanpa bertanya, sesuai aturan kerja. Ubah di sini bila salah.

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
