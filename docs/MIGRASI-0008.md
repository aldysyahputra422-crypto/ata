# Migrasi 0008: persetujuan wali (FR-AUTH-07)

Untuk review Product Owner. Berkas: `supabase/migrations/0008_guardian_consent.sql`.
Rollback: `supabase/rollback/0008_guardian_consent.down.sql`. Keduanya diuji di PGlite saja
(`tests/backend/guardian-consent.test.ts`); **belum diterapkan di proyek Supabase mana pun**.

## Isi SQL

| Bagian | Isi |
|---|---|
| Kolom baru di `profiles` | `birth_date date`, `birth_date_corrections smallint` (jumlah koreksi, bawaan 0) |
| `age_status`, `account_age` | Status usia `adult` / `minor` / `unknown` dari tanggal lahir di zona waktu akun; aturan khusus untuk akun yang hanya punya tahun |
| Tabel `guardian_consents` | Satu baris per permintaan persetujuan: status, versi, cakupan, nama wali, hash dan samaran email, hash token, kedaluwarsa, status pengiriman, bukti verifikasi (waktu, metode, nama, pernyataan), penolakan, pencabutan, permintaan hapus. RLS aktif; pemilik hanya membaca kolom tanpa hash; tidak ada peran yang menulis langsung |
| Tabel `birth_date_corrections` | Permintaan koreksi tanggal lahir anak→dewasa yang menunggu konfirmasi wali. RLS dan hak akses dengan pola yang sama |
| Gate AI | `ai_processing_gate(user, kategori)` (service role) dan `can_process_ai(kategori)` (sesi pengguna) |
| Trigger `ata_enforce_ai_permission_consent` | Menolak penulisan izin AI yang menyala untuk akun anak tanpa persetujuan atau usia tidak diketahui, siapa pun penulisnya |
| `set_ai_permission`, `update_profile` | Fungsi 0007 diganti nama menjadi `*_unchecked` (tanpa hak eksekusi) dan dibungkus pemeriksaan usia, persetujuan, dan aturan koreksi tanggal lahir |
| `complete_onboarding` | Diganti: butuh tanggal lahir, dan untuk anak butuh persetujuan terverifikasi |
| Fungsi persetujuan | `guardian_consent_status`, `create_guardian_consent_request`, `record_guardian_consent_delivery`, `guardian_consent_lookup`, `confirm_guardian_consent`, `withdraw_guardian_consent`, `revoke_guardian_consent`, `end_guardian_consent`, `reset_ai_permissions` |
| Fungsi koreksi | `create_birth_date_correction`, `record_birth_date_correction_delivery`, `confirm_birth_date_correction`, `cancel_birth_date_correction`, `set_birth_date_by_operator`, `apply_age_change` |
| Penghapusan | `purge_guardian_requested_deletions()` (service role; tidak dijadwalkan oleh migrasi) |
| `export_account_data` | Diganti: ekspor akun kini memuat catatan persetujuan dan koreksi, tanpa hash dan tanpa nama verifikator |

## Dampak pada data yang sudah ada

Migrasi menjalankan dua `update` dan tidak ada `delete`:

1. `ai_permissions`: untuk akun yang **bukan pasti dewasa** (anak, tahun ambigu, atau tanpa tahun lahir), semua kategori yang menyala dimatikan.
2. `profiles`: `onboarding_done` menjadi `false` untuk akun anak yang sudah selesai onboarding, sehingga mereka masuk langkah persetujuan wali saat membuka aplikasi.

Yang tidak berubah: jumlah baris semua tabel, tahun lahir yang tersimpan, isi profil, lomba, tugas, progres,
paket. `birth_date` kosong untuk semua akun lama.

| Akun lama | Setelah migrasi |
|---|---|
| Tahun lahir pasti dewasa (selisih tahun ≥ 19) | Tidak berubah. Tanggal lahir boleh dilengkapi kapan saja |
| Tahun lahir anak atau ambigu (selisih < 19) | Menunggu: izin AI mati, onboarding terbuka lagi, diminta melengkapi tanggal dan persetujuan wali |
| Tanpa tahun lahir | Izin AI mati sampai tanggal lahir diisi |

Belum ada fitur AI yang membaca izin di cabang ini, jadi tidak ada fungsi yang sedang dipakai yang berhenti.

## Rollback

`supabase/rollback/0008_guardian_consent.down.sql` dijalankan manual dalam satu transaksi. Ia:

- menghapus trigger dan pembungkus, mengembalikan nama `set_ai_permission` dan `update_profile` milik 0007 beserta hak eksekusinya;
- memasang kembali `complete_onboarding` (0007) dan `export_account_data` (0006) dari teks aslinya;
- menghapus kedua tabel baru, kedua kolom baru, dan semua fungsi 0008.

Uji PGlite membandingkan daftar fungsi, tabel, kolom `profiles`, dan trigger setelah rollback dengan database
yang hanya berisi 0001–0007 (harus sama persis), memanggil kembali fungsi 0007 sebagai pengguna, lalu
menerapkan 0008 sekali lagi di atasnya.

Yang **tidak** dikembalikan rollback:

- catatan persetujuan, catatan koreksi, dan tanggal lahir lengkap ikut terhapus (tahun lahir tetap);
- izin AI yang dimatikan dan onboarding yang dibuka lagi oleh 0008 tetap seperti itu;
- setelah rollback, celah awal terbuka lagi: akun anak bisa menyelesaikan onboarding dan menyalakan izin AI tanpa persetujuan. Rollback hanya layak bila fitur AI belum membaca izin, atau bersamaan dengan mematikan fitur itu.

Kode aplikasi di PR ini bergantung pada 0008; rollback database harus diikuti revert PR.
