# Migrasi 0009 (Tanya Ata): ringkasan untuk tinjauan Product Owner

Berkas: `supabase/migrations/0009_tanya_ata.sql`. Diterapkan setelah 0008 (persetujuan wali, PR #26); 0009 tidak mengubah objek 0008 dan rollback 0009 membiarkan 0008 utuh (diuji). Belum pernah dijalankan di proyek Supabase mana pun; hanya diuji di PGlite.

## Isi

| Objek | Fungsi |
|---|---|
| Tabel `ai_credentials` | Satu key BYOK terenkripsi per sesi masuk (kunci utama `user_id, session_id`). Hanya ciphertext, IV, tag, data key terbungkus, versi KEK, 4 karakter terakhir, provider, model, URL kustom, dan dua batas waktu (2 jam tanpa pakai, 12 jam mutlak). Tanpa policy: peran klien tidak bisa membaca atau menulis baris. Terhapus otomatis bila sesi atau akun dihapus (`on delete cascade`). |
| Tabel `ai_request_counters` | Penghitung per akun: `request` (30 per menit) dan `test` (Uji Koneksi, 5 per 10 menit). Tanpa akses klien. |
| Tabel `tanya_runs` | Jejak satu kali tanya: mode, niat, provider, model, kategori dan ID sumber yang dikirim, kategori yang ditahan, status, kode galat, jumlah token. Tidak ada kolom untuk pertanyaan, jawaban, prompt, atau key. Pemilik hanya bisa membaca barisnya sendiri. |
| `ai_credential_begin/put/get/delete` | Satu-satunya jalan menulis dan membaca key. Akun dan sesi diambil dari JWT, bukan dari argumen. `put` menolak batas waktu di luar 12 jam. `get(false)` tidak pernah mengembalikan ciphertext. |
| `ai_credentials_purge` | Menghapus sungguhan semua key yang kedaluwarsa, sesinya berakhir, atau akunnya butuh persetujuan wali (memakai `ai_processing_gate` dari 0008), untuk semua akun. Dipanggil di setiap panggilan AI dan, bila `pg_cron` terpasang, tiap 10 menit. |
| `ai_credentials_drop_on_consent_end` + trigger `ai_credentials_consent_end` pada `guardian_consents` | Saat persetujuan wali berhenti terverifikasi (dicabut pelajar, ditarik wali, diganti), semua key akun itu di semua sesi langsung dihapus, bila akun itu memang masih butuh persetujuan wali (key akun yang sudah dewasa tidak disentuh). |
| `ai_take_request`, `ai_take_test` | Batas laju; mengembalikan detik tunggu. |
| `tanya_run_start/finish` | Menulis jejak `tanya_runs`. |

## Dampak pada data yang ada

Tidak ada. Migrasi ini hanya menambah tiga tabel, sebelas fungsi, satu policy, dan satu trigger pada tabel `guardian_consents` milik 0008 (trigger itu hanya menghapus baris `ai_credentials`; tidak mengubah `guardian_consents`). Tidak ada tabel, kolom, fungsi, policy, atau baris dari migrasi 0001–0008 yang diubah atau dihapus (dibuktikan uji: daftar objek sebelum dan sesudah dibandingkan). Fungsi `ai_credential_put/delete` menambah baris ke `audit_log` saat key disambung atau diputus (tanpa key maupun ciphertext).

## Rollback

`supabase/rollback/0009_tanya_ata_down.sql`, dijalankan manual bila 0009 harus dibatalkan. Menghapus jadwal `pg_cron` (bila ada), trigger pada `guardian_consents`, sebelas fungsi, dan tiga tabel. Yang hilang: key tersimpan (pengguna menyambung ulang), penghitung, dan jejak `tanya_runs`. Baris `audit_log` dipertahankan. Aplikasi versi ini memerlukan 0009; rollback SQL harus dibarengi rollback kode (tanpa 0009, `/api/v1/tanya/*` dan `/api/v1/connections` membalas 503, layar lain tidak terpengaruh).

Diuji di PGlite (`tests/backend/tanya-rollback.test.ts`): setelah down, daftar tabel, fungsi, policy, dan trigger sama persis dengan keadaan sebelum 0009; jumlah baris tabel lain tidak berubah; down aman dijalankan dua kali; 0009 bisa diterapkan lagi.

Belum diuji: cabang `pg_cron` (PGlite tidak punya ekstensi itu), baik saat menjadwalkan maupun saat membatalkan jadwal.

## Syarat BYOK dan buktinya

| Syarat | Implementasi | Bukti (uji) |
|---|---|---|
| Authenticated + envelope encryption | Data key acak 32 byte mengenkripsi API key (AES-256-GCM); data key dibungkus AES-256-GCM dengan kunci turunan HKDF-SHA256 dari KEK + salt cookie | `tanya-lib.test.ts`: bentuk data key terbungkus, tag atau ciphertext yang diubah ditolak |
| KEK hanya di env server | `KEY_ENCRYPTION_SECRET` (dan versi bernomor); tanpa itu `seal` mengembalikan null dan sambungan ditolak | `tanya-lib.test.ts`, `tanya-http.test.ts` (503 tanpa KEK) |
| Terikat user, sesi, provider, versi key, expiry | Semua ada di AAD kedua lapis, beserta ID koneksi | `tanya-lib.test.ts`: mengganti salah satu nilai membuat dekripsi gagal; lewat expiry ditolak |
| Isolasi akun dan sesi | Kunci utama `user_id, session_id` dari JWT; salt hanya di cookie HttpOnly sesi itu | `tanya-migration.test.ts`: akun lain dan sesi lain tidak melihat baris |
| Plaintext tidak di-log | Tidak ada `console.*` di modul Tanya; galat provider disaring | `tanya-http.test.ts`: semua level log ditangkap dan diperiksa; pindai sumber |
| Dihapus saat logout | Route logout memanggil `ai_credential_delete` sebelum sign-out; cascade sesi sebagai cadangan | `account-http.test.ts`, `tanya-migration.test.ts` |
| Dihapus saat akses dicabut | Putuskan sambungan menghapus baris; sesi yang dicabut atau dihapus: baris ikut terhapus dan semua fungsi menolak; persetujuan wali berakhir: key di semua sesi akun itu terhapus | `tanya-migration.test.ts`, `tanya-gate.test.ts` |
| Dihapus saat kedaluwarsa | `ai_credentials_purge` menghapus baris, bukan menyaring saat baca | `tanya-migration.test.ts`: key akun A terhapus oleh panggilan akun B |
| Key tidak ke frontend | Respons hanya provider, model, 4 karakter terakhir, waktu habis | `tanya-http.test.ts`, e2e |
| Hanya `node:crypto` | `randomBytes`, `hkdfSync`, `createCipheriv`, `createDecipheriv` | `tanya-lib.test.ts` memeriksa impor |
