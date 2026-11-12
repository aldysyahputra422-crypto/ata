# Preflight (PRD Lampiran E.4)

Dijalankan 12 November 2026 di sesi cloud Claude Code (Linux), bukan di Mac Product Owner.

| Alat | Tersedia | Versi | Catatan | Jalur cadangan |
|---|---|---|---|---|
| Node.js | ya | v22.23.4 | Memenuhi syarat 20+ | — |
| pnpm | ya | 10.28.0 | Dikunci lewat `packageManager` | — |
| git | ya | 2.43.0 | Remote `origin` → GitHub `aldysyahputra422-crypto/ata` | — |
| GitHub | ya (lewat MCP) | — | `gh` CLI tidak login di sesi cloud; commit, push, dan PR berjalan lewat git + konektor GitHub | `gh auth login` di Mac bila bekerja lokal |
| Supabase CLI | ya | 3.1.0 | Terpasang sebagai devDependency; `supabase init` sudah dijalankan | — |
| **Proyek Supabase** | **tidak** | — | Akun Supabase yang terhubung belum punya proyek, dan `.env.local` tidak ada di sesi ini. `supabase link` dan penerapan migrasi 0001 **belum dilakukan** | Lihat "Yang perlu dilakukan Product Owner" |
| Playwright | ya | 1.63.0 | Chromium tersedia; 18 uji E2E lulus | — |
| Vercel | sebagian | — | Konektor terhubung tetapi akun belum punya tim/proyek. Deploy lewat integrasi GitHub → Vercel | Impor repo dari dashboard Vercel |
| Google OAuth | belum | — | Setup manual oleh Product Owner | Akun demo (DEMO-02) saat fitur auth dibangun |
| Registry shadcn (ui.shadcn.com) | tidak | — | Diblokir kebijakan jaringan sesi cloud | shadcn dipasang manual (components.json + paket Radix); CLI bisa dipakai di Mac |

## Status kelas Wajib

GitHub, Node, pnpm, Supabase CLI, dan Playwright siap. **Satu hal Wajib belum terpenuhi: proyek Supabase dev.**
Pekerjaan yang tidak bergantung padanya (kerangka, design system, uji) sudah selesai; migrasi 0001 sudah ditulis tetapi belum diterapkan.

## Yang perlu dilakukan Product Owner

1. Buat proyek **Supabase Free** di dashboard Supabase (jangan pilih paket berbayar). Catat Project URL, anon key, service role key, project ref.
2. Di Mac, salin `.env.example` menjadi `.env.local` dan isi nilainya. Buat rahasia dengan `openssl rand -base64 32` (KEY_ENCRYPTION_SECRET) dan `openssl rand -hex 32` (CRON_SECRET).
3. Terapkan migrasi: `pnpm exec supabase login`, `pnpm exec supabase link --project-ref <ref>`, `pnpm exec supabase db push`.
4. Jalankan `pnpm dev`, buka `/api/health`; harus mengembalikan `{"ok":true}`.
5. Impor repo ke Vercel (langkah di docs/DEPLOY.md) dan isi secret GitHub `APP_URL`.

Bila proyek Supabase dibuat di akun yang terhubung ke Claude, sesi berikutnya bisa menerapkan migrasi langsung lewat konektor.
