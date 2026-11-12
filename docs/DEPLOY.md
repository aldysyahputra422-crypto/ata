# Deploy (Profil Demo: Vercel Hobby + Supabase Free)

Belum ada deployment. Dokumen ini berisi langkah dan variabel; URL demo diisi setelah deploy pertama.

## 1. Supabase

1. Buat proyek Free. Catat Project URL, anon key, service role key, project ref.
2. Terapkan migrasi dari Mac:

```bash
pnpm exec supabase login
```

```bash
pnpm exec supabase link --project-ref <project-ref>
```

```bash
pnpm exec supabase db push
```

3. Auth → Providers → Google: isi client ID/secret dari Google Cloud. Redirect URI di Google: `https://<project-ref>.supabase.co/auth/v1/callback`.

## 2. Vercel

1. Dashboard Vercel → Add New → Project → impor repo `ata` (framework terdeteksi: Next.js; root: akar repo).
2. Isi variabel lingkungan di bawah untuk Production dan Preview.
3. Deploy. Production mengikuti branch `main`; setiap PR mendapat Preview.

## 3. Variabel lingkungan

Nama saja; nilainya tidak pernah ditulis di repo.

| Variabel | Wajib sekarang | Catatan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | Hanya server |
| `DEMO_MODE` | ya | `true` untuk demo. Dibaca saat build: ubah nilai = redeploy |
| `KEY_ENCRYPTION_SECRET` | Hari 3 | 32 byte base64 |
| `CRON_SECRET` | Hari 3 | |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Hari 3 | Web Push |
| `EXTRACTION_DAILY_BUDGET` | Hari 3 | `0` = hanya seed + aturan |
| `ADMIN_BOOTSTRAP_EMAILS` | Hari 4 | |
| `SUPABASE_PROJECT_REF` | tidak (lokal saja) | Untuk CLI |

## 4. GitHub

- Settings → Secrets and variables → Actions → secret `APP_URL` = URL produksi (mis. `https://ata-xxxx.vercel.app`). Workflow `Keepalive` memanggil `/api/health` sekali sehari agar proyek Supabase Free tidak dijeda; tanpa secret ini workflow melewati ping.
- Workflow `CI` menjalankan install, typecheck, lint, dan unit test pada setiap push dan PR.

## 5. Pemeriksaan setelah deploy

- `GET /api/health` → `{"ok":true}`.
- `/styleguide` terbuka (hanya bila `DEMO_MODE=true`).
- Banner "Versi Demo — data contoh" tampil di semua halaman.

## URL demo

Belum ada.
