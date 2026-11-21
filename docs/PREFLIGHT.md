# Preflight (PRD Lampiran E.4)

## R0.1 — Supabase development

| Alat | Tersedia | Versi | Catatan | Jalur cadangan |
|---|---|---|---|---|
| Node.js / pnpm | Ya | 22.23.5 / 10.28.0 | Aktifkan NVM jika perintah belum ada di PATH VM | — |
| Git / GitHub | Ya | 2.56.0 | Repo dan cabang R0.05 dapat diakses | — |
| Docker / Supabase CLI | Ya | 29.9.2 / 3.1.0 | Stack lokal berjalan dan migrasi `0001`–`0003` lulus dari database kosong | PGlite untuk uji SQL dan RLS |
| Playwright | Ya | 1.63.0 | R0.1 mengubah backend. Uji HTTP memakai Next.js dan Supabase lokal | — |
| Supabase Cloud | Ya | Free Tier | `ata-dev` aktif. Migrasi `0001`–`0003` diterapkan lewat Session pooler. Konektor MCP hanya baca | Secret repo `SUPABASE_DB_URL` untuk DDL |
| Google OAuth | Belum aktif | — | Endpoint PKCE tersedia. Uji kontrak memakai respons Auth tiruan | Supabase Auth lokal dengan akun email khusus uji |

### Pengujian lokal

1. Jalankan `pnpm exec supabase start` dan `pnpm exec supabase migration up`.
2. Isi variabel URL dasar API, anon key, dan service-role key di lingkungan proses Next.js dengan nilai stack lokal. Untuk smoke test, gunakan `APP_ORIGIN=http://127.0.0.1:3000` dan jalankan `pnpm dev --hostname 127.0.0.1`.
3. Jalankan `pnpm test` untuk uji kontrak akun dan migrasi PGlite. Jalankan `node scripts/test-account-local.mjs` untuk uji HTTP terhadap stack Docker. Skrip membuat akun sementara dan kode redeem khusus uji.

### Migrasi ke `ata-dev`

1. Ambil URL PostgreSQL dari **Connect → Session pooler** di proyek `ata-dev`. Simpan URL dengan kata sandinya sebagai secret `SUPABASE_DB_URL`. Tiga secret API Supabase dipakai oleh aplikasi dan pemeriksaan HTTP.
2. Periksa target dan daftar migrasi dengan `pnpm exec supabase db push --remote="$SUPABASE_DB_URL" --skip-vault --dry-run`. Setelah target development terverifikasi, terapkan dengan perintah yang sama tanpa `--dry-run`.
3. Verifikasi riwayat migrasi, seed, RLS dan `/api/health` dari Next.js lokal yang terhubung ke `ata-dev`. Pakai URL dasar proyek untuk `NEXT_PUBLIC_SUPABASE_URL`.
4. Untuk menguji Google sungguhan, aktifkan penyedia Google di Supabase Auth dan daftarkan URL callback aplikasi yang tepat, misalnya `http://127.0.0.1:3000/api/v1/auth/google/callback`. Daftarkan callback Supabase di Google Cloud sesuai [panduan Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Catatan preflight awal

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
