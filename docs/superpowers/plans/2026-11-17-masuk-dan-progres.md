# Masuk dan Progres (kelompok 5) Implementation Plan

**Goal:** Prototipe masuk/OTP, onboarding L0–L1, Progres, Pengaturan, dan Paket.
**Architecture:** `masuk.html` di akar `ata-prototype/`, modul di `masuk/` (data, logic, ui), fondasi `shared/`. Logika murni diuji `node --test`.
**Spec:** `docs/superpowers/specs/2026-11-17-masuk-dan-progres-design.md`

## Global Constraints
Palet Senja, Bahasa Indonesia, DATA DEMO, maskot resmi, keadaan memuat/kosong/galat, 375 dan 1280 px, terang dan gelap, reduced motion, target 44 px.

## Review Focus
- Kode OTP salah 5 kali → batas tercapai dengan pesan jelas; kode benar setelahnya tetap ditolak sampai jendela 10 menit lewat.
- Kode kedaluwarsa (> 10 menit) → minta kirim ulang, bukan menerima kode lama.
- Onboarding: validasi tahun lahir dan jenjang; data tersimpan per langkah; "Lewati" tidak menyimpan nilai kosong sebagai jawaban.
- Progres: cincin 0% saat belum ada tugas (bukan pembagian nol), sisa hari negatif → "Lewat tenggat" + kata, heatmap 12 minggu punya tabel alternatif.
- Paket: kode demo salah ditolak; Slot ke-4 ditolak saat paket Gratis.

### Task 1: Data dan logika (TDD)
`masuk/data/{akun,onboarding,progres,paket}.js`; `masuk/logic/otp.js` (`periksaOtp`, `bisaKirimUlang`, `hitungMundur`, `BATAS`), `onboarding.js` (`LANGKAH`, `validasiLangkah`, `kenalPersen`), `progres.js` (`cincin`, `heatmap`, `streak`, `kesiapanSubmit`), `paket.js` (`PAKET`, `aktivasi`, `bisaTambahSlot`). Tes: `tests/{otp,onboarding-ata,progres-ata,paket-ata}.test.mjs`.

### Task 2: Halaman, Masuk, dan Onboarding
`masuk.html`, `app.js`, `state.js`, `ui/masuk.js`, `ui/onboarding.js`, `masuk.css`: Google, OTP, galat, kirim ulang, 7 langkah onboarding, layar selesai.

### Task 3: Progres
`ui/progres.js`: cincin per Slot, linimasa, heatmap + tabel alternatif, timer fokus 25/45, check-in, kesiapan submit, tandai submit.

### Task 4: Pengaturan dan Paket
`ui/pengaturan.js`, `ui/paket.js`: tema, Efek Kaca, notifikasi, reset data, hapus akun, aktivasi demo.

### Task 5: Uji browser dan terbit
HP dan desktop, terang dan gelap; perbarui `hub.html`, `docs/STATUS.md`, ledger.
