# Status MCP dan alat pembantu (PRD Lampiran E.7)

Diperiksa 12 November 2026 di sesi cloud Claude Code. Di sesi cloud, konektor dipasang dari akun claude.ai
(bukan lewat `claude mcp add`), jadi kolom "cara pasang" menyebut sumbernya. Tidak ada rahasia yang ditulis ke repo.

| Alat | Cara pasang | Cakupan | Uji (1 panggilan baca-saja) | Status | Catatan |
|---|---|---|---|---|---|
| GitHub | Konektor sesi cloud | Repo `ata` saja | Daftar PR repo | **terpasang** | Dipakai untuk push dan PR. `gh` CLI tidak login di cloud |
| Supabase | Konektor claude.ai | Akun | `list_projects` → daftar kosong | **terpasang, belum ada proyek** | Tidak membuat proyek (aturan: tanpa `confirm_cost`). Butuh Product Owner |
| Vercel | Konektor claude.ai | Akun | `list_teams` → daftar kosong | **terpasang, belum ada proyek** | Deploy lewat integrasi GitHub → Vercel |
| Adobe | Konektor claude.ai | Akun | belum diuji | terpasang, tidak dipakai | Butuh akun Adobe; cek biaya dulu. Tidak menjadi syarat build |
| Higgsfield | Konektor claude.ai | Akun | belum diuji | terpasang, tidak dipakai | Konektor ini hanya bisa melihat hasil dan saldo, tidak bisa membuat media |
| Figma, Canva | Konektor claude.ai | Akun | belum diuji | terpasang, tidak dipakai | Tidak diminta PRD; tersedia bila perlu |
| ElevenLabs | — | — | — | **tidak tersedia** di sesi ini | Opsional (narasi video demo) |
| Blender | Server MCP lokal `tools/creative-apps-mcp` | Mac Product Owner | Belum diuji di macOS | **butuh tindakan** | Instalasi di Mac gagal karena Python < 3.10; perlu Python 3.12 (lihat README di folder itu) |
| Keluarga ArtCraft (figcraft, CADcraft, AniCraft, TextureCraft, vectorcraft) | Server MCP lokal yang sama | Mac Product Owner | Belum diuji | **butuh tindakan** | Bukan konektor. Dukungan AppleScript tiap aplikasi belum diverifikasi |
| Cloudflare, Slack, Notion, Linear, dan konektor plugin lain | Plugin | — | — | gagal tersambung | Diblokir jaringan sesi cloud (403). Tidak dibutuhkan Ata |

## Ringkasan

- Siap dipakai: GitHub (push/PR), Playwright, Supabase CLI.
- Terpasang tetapi kosong: Supabase dan Vercel (belum ada proyek di akun yang terhubung).
- Gagal atau tidak tersedia: ElevenLabs; konektor plugin yang diblokir jaringan (tidak relevan untuk Ata).
- Butuh Product Owner: membuat proyek Supabase Free, mengimpor repo ke Vercel, menyelesaikan instalasi server MCP lokal di Mac (Python 3.12).
- Alat aset opsional (Adobe, Higgsfield, Blender, ArtCraft) tidak menghalangi build: aset demo dibuat sebagai SVG/CSS di repo.
- Maskot Ata tetap harus berasal dari aset resmi Sobat Ambis.
