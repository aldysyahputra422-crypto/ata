# Ata

Asisten lomba untuk siswa dan mahasiswa: PWA mobile-first oleh Sobat Ambis.
Saat ini repo berisi fondasi backend akun (R0.1) dan migrasi bertahap layar dari prototipe ke Next.js 15 (R0.2/M1).

- Kebutuhan produk: [docs/PRD.md](docs/PRD.md)
- Design system (mengikuti prototipe): [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) · catatan migrasi UI: [docs/MIGRASI-UI.md](docs/MIGRASI-UI.md)
- Status pengerjaan: [docs/STATUS.md](docs/STATUS.md)
- Aturan kerja: [CLAUDE.md](CLAUDE.md)

## Menjalankan

Butuh Node 20+ dan pnpm.

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

```bash
pnpm dev
```

Buka `http://localhost:3000/styleguide` untuk review visual (hanya bila `DEMO_MODE=true`) dan `/hari-ini` untuk kerangka tab.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | Pemeriksaan wajib sebelum commit |
| `pnpm test:e2e` | Playwright (HP dan desktop), termasuk uji kontras |
| `pnpm screenshots` | Tangkapan layar `/styleguide` ke `docs/screenshots/` (app harus berjalan dengan `DEMO_MODE=true`) |
| `pnpm build` · `pnpm start` | Build produksi |

## Lain-lain

`tools/creative-apps-mcp/` berisi server MCP lokal (Python) untuk mengendalikan aplikasi desain di macOS. Itu alat pembantu terpisah, bukan bagian dari aplikasi.
