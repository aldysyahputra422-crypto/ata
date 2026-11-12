# Status

Terakhir diperbarui: 12 November 2026 · tahap **SETUP (PROMPT 1)** · berhenti di **Gerbang 1**.

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
| FR-AUTH-01–10 | Hari 1 | belum |
| FR-ONB-01–08 | Hari 1 | belum |
| FR-PWA-01–08 | Hari 1 dan 3 | belum (FR-PWA-08 Efek Kaca: mekanisme siap, layar Pengaturan belum) |
| FR-SLT-01–05 | Hari 2 | belum |
| FR-RDM-01–12 | Hari 2 | belum |
| FR-PRG-01–10 | Hari 2 | belum (komponen cincin siap) |
| FR-BYOK-01–10 | Hari 3 | belum (registri `content/providers.json` siap) |
| FR-CCH-01–08, FR-MEM-01–07 | Hari 3 | belum |
| FR-RCP-01–11 | Hari 3 | belum |
| FR-SCN-* (Radar) | Hari 3 | belum |
| FR-RPT-* (Laporan), FR-MNT-* (Mentor) | Hari 4 | belum |
| FR-ADM-01–07 | Hari 4 | belum |
| DEMO-01 | — | selesai (banner) |
| DEMO-06 | — | sebagian: gerbang `isDemoMode()` + uji; jalur demo lain belum ada |
| DEMO-02–05, 07, 08 | Hari 3–4 | belum |
