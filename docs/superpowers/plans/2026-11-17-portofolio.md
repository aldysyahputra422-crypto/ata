# Portofolio (kelompok 4) Implementation Plan

**Goal:** Prototipe Galeri sertifikat, tautan orang tua, dan Laporan Bulanan.
**Architecture:** `portofolio.html` di akar `ata-prototype/`, modul di `portofolio/` (data, logic, ui), memakai fondasi `shared/`. Logika murni diuji `node --test`.
**Spec:** `docs/superpowers/specs/2026-11-17-portofolio-design.md`

## Global Constraints
Palet Senja, Bahasa Indonesia, DATA DEMO, maskot resmi, keadaan memuat/kosong/galat, 375 dan 1280 px, terang dan gelap, reduced motion, target 44 px.

## Review Focus
- Data sertifikat tidak valid (nama kosong, tahun di luar rentang, berkas > 10 MB) → pesan jelas, isian tidak hilang.
- Tautan orang tua yang dicabut/kedaluwarsa → tampilan orang tua menolak dengan kalimat jelas, bukan layar kosong.
- Laporan tidak pernah memuat isi chat, Ingatan Ata, atau API key, meski bagian "aktivitas" dinyalakan.
- Bagian laporan yang dimatikan hilang dari pratinjau **dan** hasil cetak.
- Pesan pribadi > 280 karakter ditolak dengan sisa karakter yang terlihat.

### Task 1: Data dan logika (TDD)
`portofolio/data/{sertifikat,pencapaian}.js`; `portofolio/logic/sertifikat.js` (`validasiSertifikat`, `saring`, `urutkan`), `tautan.js` (`buatTautan`, `periksaTautan`, `cabut`, `teksBagikan`), `laporan.js` (`bangunLaporan`, `kodeVerifikasi`, `namaBerkas`). Tes: `tests/{sertifikat,tautan-ortu,laporan}.test.mjs` termasuk lima baris Review Focus.

### Task 2: Halaman dan Galeri
`portofolio.html`, `app.js`, `state.js`, `ui/galeri.js`, `portofolio.css`: ringkasan, filter, kartu, kirim sertifikat, detail, hapus + urungkan.

### Task 3: Tautan orang tua
`ui/tautan.js`: buat, pilih bagian, salin, WhatsApp, cabut, pratinjau tampilan orang tua (read-only).

### Task 4: Laporan Bulanan
`ui/laporan.js`: pilih bulan, bagian, pesan pribadi, pratinjau A4, kode verifikasi, cetak/simpan PDF.

### Task 5: Uji browser dan terbit
HP dan desktop, terang dan gelap; perbarui `hub.html`, `docs/STATUS.md`, ledger.
