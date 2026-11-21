# Fondasi Prototipe dan Sidang Juri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi prototipe bersama, halaman beranda, dan kelompok fitur 1 (Sambungkan AI + Sidang Juri) sebagai prototipe HTML yang bisa dibuka calon pengguna di HP dan desktop.

**Architecture:** Prototipe statis (HTML/CSS/JS tanpa build) di `/Users/mac/Documents/Claude/ata-prototype/`. Fondasi bersama di `shared/` dipakai semua kelompok fitur. Logika murni (pemilihan panel juri, perkiraan biaya) ditulis sebagai modul ES terpisah supaya bisa diuji dengan `node --test`. Tiap kelompok fitur diterbitkan sebagai artifact sendiri; beranda menautkan semuanya.

**Tech Stack:** HTML, CSS (token + container query), JavaScript ES2020 tanpa library, `node:test` (Node 24), Blender 4.5 (Cycles) untuk ruang sidang, Artifact tool untuk menerbitkan.

**Spec:** `/Users/mac/ata/docs/superpowers/specs/2026-11-13-ata-desain-fitur-design.md`

## Global Constraints

- Palet senja: `--primary:#CF3A1C`, `--hero-a:#FFB07A`, `--hero-b:#FF7FA3`, `--bg:#FFF8F3`, `--text:#2A1410`; tema gelap `--bg:#1A0F0C`, `--primary:#FF8A5C`. Salin nilai lengkap dari blok `:root` di `ata-prototype/index.html`.
- Font: Plus Jakarta Sans (judul, 700–800, `letter-spacing:-.03em`), Inter (isi, minimal 400).
- Tiap layar: keadaan normal, memuat, kosong, galat. Jalan di 390 px dan 1280 px, terang dan gelap.
- Bahasa UI Indonesia, "kamu" untuk pengguna, "Ata" untuk diri sendiri, maksimal satu emoji per pesan, tanpa kalimat motivasi generik.
- Data contoh berlabel "DATA DEMO"; nama lomba, penyelenggara, dan juri fiktif.
- Maskot hanya dari 7 pose resmi di `ata-prototype/assets/` (gelantung, wink, lompat, jempol, panik, tidur, melambai). Tidak dibuat ulang atau diubah.
- Efek gerak menghormati `prefers-reduced-motion`; efek 3D kaya hanya di desktop atau momen tertentu.
- Status selalu ikon + kata, bukan warna saja. Target sentuh ≥ 44 px. Fokus terlihat (`outline:2px solid var(--primary)`).
- Ajakan mentor berlabel "Dari Sobat Ambis", tanpa harga, tanpa hitung mundur, tanpa klaim juara (PRD 10.5).
- Sesi juri berlabel "Simulasi, bukan nilai resmi".
- Render Blender: uji di resolusi kecil (`ATA_TEST=1`) dulu, render penuh di latar belakang; buka berkas `.blend` dengan `--disable-autoexec`.
- Folder `ata-prototype/` bukan repo git: tidak ada langkah commit untuk berkas prototipe. Perubahan di `~/ata` hanya di-commit bila Product Owner meminta.

## Review Focus

- **Juknis tanpa kategori yang dikenali** (misalnya lomba "Cerdas Cermat Budaya"): pemilihan panel tetap menghasilkan 3 juri dengan alasan umum, bukan error atau panel kosong. Diuji di Task 3.
- **API key belum tersambung** saat membuka Sidang Juri: layar ajakan "Sambungkan AI" dengan perkiraan biaya, bukan tombol mulai yang gagal. Diuji di Task 5.
- **Mikrofon ditolak atau tidak tersedia** (browser tanpa SpeechRecognition, izin ditolak): beralih otomatis ke mode ketik dengan pesan jelas. Diuji di Task 6.
- **Teks jawaban sangat panjang dan nama lomba panjang di HP 390 px**: tidak meluap ke samping, terbungkus rapi. Diuji di Task 6.
- **Pengguna menutup sesi di tengah jalan**: riwayat menyimpan sesi sebagai "Belum selesai" dan bisa dilanjutkan. Diuji di Task 6.

---

### Task 1: Perbarui design system ke palet senja

**Files:**
- Modify: `/Users/mac/ata/docs/DESIGN-SYSTEM.md` (Bagian 3.1 dan 3.2)
- Modify: `/Users/mac/ata/src/styles/tokens.css`
- Modify: `/Users/mac/ata/docs/ASSUMPTIONS.md` (tambah baris S18)

**Interfaces:**
- Produces: token warna senja di `tokens.css` dengan nama variabel yang sama seperti sekarang (`--primary`, `--hero-a`, `--gem-*`), sehingga komponen di `src/components/ds/` tidak perlu diubah. Permata `lavender` diganti `coral` di dokumen; di kode, nama variabel lama tetap ada sebagai alias ke nilai coral.

- [ ] **Step 1:** Salin nilai token terang dan gelap dari blok `:root` dan `:root[data-theme="dark"]` di `ata-prototype/index.html` ke Bagian 3.1, ganti gem lavender dengan coral (`#FFE3D8 / #FFB9A0 / #8A2409`), dan tulis catatan "Diganti 12 November 2026 atas keputusan Product Owner: ungu terasa generik".
- [ ] **Step 2:** Terapkan nilai yang sama ke `src/styles/tokens.css`; tambahkan `--gem-coral-*` dan arahkan `--gem-lavender-*` ke nilainya.
- [ ] **Step 3:** Run `cd ~/ata && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`. Expected: semua lulus, termasuk uji kontras AA terang dan gelap. Bila uji kontras gagal, gelapkan nilai `--text-muted` atau tinta permata sampai lulus, lalu catat nilainya di dokumen.
- [ ] **Step 4:** Tambah baris S18 di `docs/ASSUMPTIONS.md`: palet senja menggantikan ungu; alias `--gem-lavender-*` dipertahankan sementara.

### Task 2: Fondasi bersama dan halaman beranda

**Files:**
- Create: `ata-prototype/shared/ds.css` (token, reset, tipografi, kaca, komponen dasar)
- Create: `ata-prototype/shared/ds.js` (ikon, segmented control, tema, perangkat HP/Desktop)
- Create: `ata-prototype/shared/states.css` (pola memuat, kosong, galat)
- Create: `ata-prototype/hub/index.html`
- Create: `ata-prototype/tests/ds.test.mjs`

**Interfaces:**
- Produces (`shared/ds.js`, modul ES):
  - `export const ICONS: Record<string,string>` (jalur SVG 24×24, termasuk semua ikon di `index.html` plus `mic`, `mic-off`, `key`, `gavel`, `upload`, `history`, `shield`).
  - `export function icon(name: string): string` → string `<svg …>`; nama tak dikenal mengembalikan string kosong.
  - `export function mountIcons(root: ParentNode): void` → mengisi semua `[data-icon]`.
  - `export function mountSeg(el: HTMLElement, onChange: (value: string) => void): void` → radiogroup dengan panah/Home/End.
  - `export function mountDeviceFrame(opts: { storageKey: string }): void` → toggle HP/Desktop dan bingkai perangkat seperti di prototipe sekarang.
- Produces (`shared/ds.css`): kelas `.btn`, `.btn--primary`, `.card`, `.glass`, `.gem.g-{mint,coral,apricot,sky,rose,lemon}`, `.status.status--{ok,warn,info,danger}`, `.pill`, `.sheet`, `.toast`, `.ring`, `.skeleton`, `.empty`, `.error`, `.device[data-device]`, `.app` (container `app`).

- [ ] **Step 1: Write the failing test** `tests/ds.test.mjs`: `icon('mic')` mengandung `<svg` dan `viewBox="0 0 24 24"`; `icon('tidak-ada') === ''`; setiap kunci di `ICONS` hanya berisi elemen `path|circle|rect` (regex terhadap string).
- [ ] **Step 2:** Run `cd ata-prototype && node --test tests/`. Expected: FAIL, modul tidak ada.
- [ ] **Step 3:** Pindahkan token, komponen dasar, dan ikon dari `index.html` ke `shared/`; tambahkan ikon baru dan kelas keadaan.
- [ ] **Step 4:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 5:** Buat `hub/index.html`: logo, judul "Ata · Prototipe", kartu per kelompok fitur (1 Sidang Juri, 2 Lomba, 3 Tanya Ata, 4 Portofolio, 5 Masuk & Progres) dengan status "Siap ditinjau" / "Belum", dan tautan ke prototipe putaran sebelumnya. Uji di browser 390 px dan 1280 px: tidak ada gulir horizontal, konsol bersih.

### Task 3: Data juri dan pemilihan panel

**Files:**
- Create: `ata-prototype/sidang/data/juri.js`
- Create: `ata-prototype/sidang/logic/panel.js`
- Create: `ata-prototype/tests/panel.test.mjs`

**Interfaces:**
- Produces (`data/juri.js`): `export const JURI: Juri[]` dengan tepat 20 entri. `Juri = { id: string, nama: string, peran: string, kepribadian: string, gaya: string, fokus: Kategori[], ciriPertanyaan: string, warna: GemName }`. `Kategori = 'karya-tulis'|'poster'|'video'|'bisnis'|'olimpiade'|'pidato'|'umum'`.
- Produces (`logic/panel.js`):
  - `export function bacaJuknis(teks: string): { kategori: Kategori, kriteria: {nama: string, bobot: number}[], jumlahJuri: 3|4|5 }` → kategori dari kata kunci; kriteria dari baris berpola "Nama (NN%)" atau "Nama: NN%"; bila tidak ada kriteria, `[{nama:'Kesesuaian tema',bobot:40},{nama:'Kualitas isi',bobot:40},{nama:'Penyajian',bobot:20}]`; `jumlahJuri` = jumlah juri yang disebut juknis (3–5) atau 3.
  - `export function pilihPanel(juknis: ReturnType<typeof bacaJuknis>, seed: number): { juri: Juri[], alasan: Record<string,string> }` → selalu tepat `jumlahJuri` juri, berbeda-beda, minimal satu dengan `fokus` cocok kategori bila ada, minimal satu juri `umum`; seed yang sama → panel sama, seed beda → urutan/komposisi boleh beda.

- [ ] **Step 1: Write the failing tests** `tests/panel.test.mjs`:
  - `JURI.length === 20` dan semua `id` unik.
  - `bacaJuknis('Lomba Karya Tulis Ilmiah ... Orisinalitas (30%) ... Metodologi (40%) ... Presentasi (30%) ... dinilai oleh 4 juri').kategori === 'karya-tulis'`, kriteria berisi 3 item dengan bobot 30, 40, 30, `jumlahJuri === 4`.
  - `bacaJuknis('Cerdas Cermat Budaya tingkat kota')` → `kategori === 'umum'`, kriteria default, `jumlahJuri === 3` (Review Focus 1).
  - `pilihPanel(j, 7)` → panjang sama dengan `jumlahJuri`, id unik, ada juri dengan `fokus` memuat kategori, ada juri `umum`, setiap juri punya `alasan[id]` tidak kosong.
  - `pilihPanel(j, 7)` dua kali → id sama; `pilihPanel(j, 8)` boleh berbeda.
- [ ] **Step 2:** Run `node --test tests/panel.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Tulis 20 juri fiktif (nama Indonesia, peran beragam: akademisi, praktisi, desainer, jurnalis, investor, guru, mahasiswa berprestasi, juri awam, dan lainnya) dan implementasikan kedua fungsi (PRNG mulberry32 untuk seed).
- [ ] **Step 4:** Run `node --test tests/`. Expected: PASS.

### Task 4: Perkiraan biaya dan registri mitra

**Files:**
- Create: `ata-prototype/sidang/logic/biaya.js`
- Create: `ata-prototype/sidang/data/penyedia.js`
- Modify: `/Users/mac/ata/content/providers.json` (tambah kolom `partner`, `priceIdr`, `payments`)
- Create: `ata-prototype/tests/biaya.test.mjs`

**Interfaces:**
- Produces (`data/penyedia.js`): `export const PENYEDIA: Penyedia[]`, `Penyedia = { id, nama, mitra: boolean, catatan: string, bayar: string[], hargaPer1kToken: number /* rupiah */, butuhBaseUrl: boolean }`. Satu mitra contoh berlabel "Mitra lokal (DATA DEMO)", lalu `openai`, `anthropic`, `google`, `openrouter`, `custom` sesuai id di `providers.json`.
- Produces (`logic/biaya.js`): `export function perkiraanSesi({ jumlahJuri: number, pertanyaanPerJuri: number, penyedia: Penyedia }): { tokenMin: number, tokenMax: number, rupiahMin: number, rupiahMax: number, label: string }`. Asumsi: 900–1.400 token per pertanyaan-jawab, 1.500 token ringkasan per juri. `label` berbentuk `"≈ Rp1.800–Rp2.700"` (titik ribuan, dibulatkan ke 100).

- [ ] **Step 1: Write the failing test**: `perkiraanSesi({jumlahJuri:4, pertanyaanPerJuri:2, penyedia:{hargaPer1kToken:0.5}})` → `tokenMin === 4*2*900 + 4*1500`, `tokenMax === 4*2*1400 + 4*1500`, `label` cocok `/^≈ Rp[\d.]+–Rp[\d.]+$/`; `PENYEDIA[0].mitra === true`.
- [ ] **Step 2:** Run test → FAIL. **Step 3:** Implementasi. **Step 4:** Run `node --test tests/` → PASS.
- [ ] **Step 5:** Tambah kolom `partner:false`, `priceIdr:null`, `payments:[]` ke semua entri `providers.json`; jalankan `cd ~/ata && pnpm test` → tetap lulus.

### Task 5: Prototipe Sambungkan AI

**Files:**
- Create: `ata-prototype/sidang/sambung.html` (bagian dari prototipe kelompok 1; dimuat sebagai layar di `sidang/index.html`)
- Create: `ata-prototype/sidang/index.html`, `ata-prototype/sidang/app.js`, `ata-prototype/sidang/sidang.css`

**Interfaces:**
- Consumes: `shared/ds.*`, `PENYEDIA`, `perkiraanSesi`.
- Produces: router hash `#sambung`, `#sidang`, `#sidang-setup`, `#sidang-panel`, `#sidang-sesi`, `#sidang-hasil`, `#sidang-riwayat`; state `window.ataDemo = { keyTersambung: boolean, penyedia: string|null }` disimpan di `localStorage` kunci `ata-demo-key` (try/catch).

- [ ] **Step 1:** Layar daftar penyedia: kartu mitra di atas (badge "Mitra lokal", harga rupiah, QRIS), lalu penyedia global; tiap kartu menampilkan perkiraan satu sidang 4 juri dari `perkiraanSesi`.
- [ ] **Step 2:** Lembar isi key: input tersamar, tombol "Uji key", keadaan memuat, berhasil (status ok + "Key tersambung"), galat ("Key ditolak provider. Cek lagi key-nya atau ganti model."), dan catatan privasi (key disimpan terenkripsi, tidak pernah ditampilkan ulang). Key demo: `ata-demo-0000` berhasil, selain itu galat.
- [ ] **Step 3:** Layar `#sidang` saat `keyTersambung` false: maskot `wink`, judul "Sidang Juri butuh AI-mu sendiri", perkiraan biaya, tombol ke `#sambung` (Review Focus 2).
- [ ] **Step 4:** Uji di browser 390 px dan 1280 px, terang dan gelap: alur key benar → kembali ke `#sidang` tanpa layar ajakan; key salah → pesan galat; tanpa gulir horizontal; konsol bersih.

### Task 6: Prototipe Sidang Juri

**Files:**
- Create: `ata-prototype/sidang/sesi.js` (alur tanya-jawab, mikrofon, riwayat)
- Modify: `ata-prototype/sidang/index.html`, `app.js`, `sidang.css`
- Create: `ata-prototype/sidang/data/contoh.js` (juknis contoh, karya contoh, naskah pertanyaan dan alasan per juri untuk demo tanpa AI)
- Create: `ata-prototype/tests/sesi.test.mjs`

**Interfaces:**
- Consumes: `bacaJuknis`, `pilihPanel`, `perkiraanSesi`, `JURI`, asset `assets/sidang-*.webp` dari Task 7 (pakai warna latar senja sebagai pengganti bila belum ada).
- Produces (`sesi.js`): `export function buatSesi(panel, juknis): Sesi`, `export function jawab(sesi: Sesi, teks: string): Sesi` (maju ke pertanyaan berikutnya), `export function ringkas(sesi: Sesi): { perJuri: {id, alasan: string[], skor: Record<string,number>}[], catatan: string }`, `export function simpanRiwayat(sesi: Sesi, store: Storage|null): void` / `muatRiwayat(store): Sesi[]`. `Sesi = { id, lomba, panel, giliran: number, tanyaJawab: {juriId, tanya, jawab: string|null}[], status: 'berjalan'|'selesai'|'belum-selesai', mulai: number }`.

- [ ] **Step 1: Write the failing tests** `tests/sesi.test.mjs`: `buatSesi` membuat `pertanyaanPerJuri * panel.length` giliran berurutan bergantian antar juri; `jawab` mengisi jawaban dan menaikkan `giliran`; setelah jawaban terakhir `status === 'selesai'`; `ringkas` memberi skor untuk setiap kriteria juknis dengan nilai 1–5; `simpanRiwayat` dengan sesi `berjalan` menyimpannya sebagai `'belum-selesai'` dan `muatRiwayat` mengembalikannya (Review Focus 5); `simpanRiwayat(sesi, null)` tidak melempar galat.
- [ ] **Step 2:** Run test → FAIL. **Step 3:** Implementasi. **Step 4:** Run `node --test tests/` → PASS.
- [ ] **Step 5: Layar setup** (`#sidang-setup`): pilih lomba dari Slot (contoh: LKTI Garuda Muda) atau isi manual; lampirkan juknis (unggah PDF/teks atau tempel teks) dan karya (PDF/gambar; video sebagai tautan); keadaan memuat "Ata membaca juknis…", galat berkas terlalu besar (> 10 MB) atau format salah.
- [ ] **Step 6: Layar panel** (`#sidang-panel`): kartu tiap juri (inisial di lingkaran permata, nama, peran, kepribadian, alasan terpilih), kriteria juknis dengan bobot, perkiraan biaya, tombol "Acak panel lain" (seed baru) dan "Mulai sidang". Di desktop, kartu juri tersusun di atas meja panel dengan tilt halus.
- [ ] **Step 7: Layar sesi** (`#sidang-sesi`): latar ruang sidang 3D (Task 7), juri yang sedang bertanya disorot, gelembung pertanyaan bertipe karakter; tombol mikrofon besar (tahan untuk bicara, transkrip langsung) dan tombol "Ketik saja". Bila `SpeechRecognition` tidak ada atau izin ditolak: banner "Mikrofon tidak tersedia, jawab dengan mengetik." dan mode ketik aktif (Review Focus 3). Teks jawaban panjang dan nama lomba panjang terbungkus di 390 px (Review Focus 4). Tombol "Akhiri" menyimpan sesi `belum-selesai`.
- [ ] **Step 8: Layar hasil** (`#sidang-hasil`): label "Simulasi, bukan nilai resmi"; per juri: pertanyaan, jawabanmu, **alasan di balik pertanyaan**, skor per kriteria; catatan Ata "langkah perbaikan"; maskot `jempol`; kartu "Dari Sobat Ambis: Mau drafmu dilihat mentor Sobat Ambis? Kamu yang tentukan." dengan tombol "Lihat caranya" dan "Jangan tampilkan 14 hari".
- [ ] **Step 9: Layar riwayat** (`#sidang-riwayat`): daftar sesi (selesai / belum selesai + "Lanjutkan"), keadaan kosong dengan maskot `tidur`, keadaan memuat (skeleton).
- [ ] **Step 10:** Uji seluruh alur di browser 390 px dan 1280 px, terang dan gelap, dengan `prefers-reduced-motion` aktif sekali: setup → panel → sesi (mode ketik) → hasil → riwayat; tidak ada gulir horizontal; konsol bersih.

### Task 7: Ruang sidang 3D

**Files:**
- Create: `ata-prototype/blender/sidang.py`
- Create: `ata-prototype/assets/sidang-desktop.webp`, `ata-prototype/assets/sidang-phone.webp`, `ata-prototype/blender/sidang_desktop.json`, `sidang_phone.json`

**Interfaces:**
- Consumes: `/Users/mac/Downloads/source 2/STAGE.blend` (dibuka dengan `--disable-autoexec`, tidak diubah).
- Produces: dua render dari sudut podium siswa menghadap meja panel, palet senja (dinding koral gelap, cahaya hangat dari jendela tinggi, lampu sorot ke podium), dan JSON berisi posisi 5 kursi juri dalam pecahan bingkai `{ kursi: [{u, v}] }` untuk menempatkan kartu juri di atasnya.

- [ ] **Step 1:** Tulis skrip: muat STAGE, ganti material ke palet senja, tambah meja panel dengan 5 kursi menghadap podium, lampu sorot, kamera di podium (desktop 1280×720, HP 720×1280), ekspor posisi kursi lewat `world_to_camera_view`.
- [ ] **Step 2:** Run uji: `ATA_TEST=1 Blender -b --disable-autoexec "/Users/mac/Downloads/source 2/STAGE.blend" --python-expr "KIND='desktop'; OUT='…/blender/test'; exec(open('…/blender/sidang.py').read())"`. Expected: exit 0, berkas webp dan JSON ada; lihat hasilnya dan pastikan meja panel dan kursi terlihat.
- [ ] **Step 3:** Render penuh desktop dan HP di latar belakang, salin ke `assets/`, pasang di `sidang.css` sebagai latar `#sidang-sesi` dan `#sidang-panel` (desktop).

### Task 8: Terbitkan dan tinjau

**Files:**
- Modify: `ata-prototype/hub/index.html` (status kelompok 1 "Siap ditinjau")

- [ ] **Step 1:** Run `cd ata-prototype && node --test tests/`. Expected: semua PASS.
- [ ] **Step 2:** Terbitkan `sidang/index.html` sebagai artifact baru "Ata Sidang Juri" dengan `files` berisi `shared/*`, `sidang/**`, dan aset yang dipakai; terbitkan `hub/index.html` sebagai artifact "Ata Prototipe" yang menautkan tautan Sidang Juri dan prototipe lama.
- [ ] **Step 3:** Buka kedua artifact yang sudah terbit di browser 390 px dan 1280 px; pastikan aset termuat (tidak ada gambar rusak) dan alur Task 6 Step 10 jalan.
- [ ] **Step 4:** Perbarui `/Users/mac/ata/docs/STATUS.md`: tambah bagian "Prototipe desain" dengan tautan artifact dan status kelompok 1–5.
