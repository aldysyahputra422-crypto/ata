# Asumsi

Keputusan yang diambil tanpa bertanya, sesuai aturan kerja. Ubah di sini bila salah.

## K-23: matriks paket Gratis vs Pro (keputusan PO, R0.2-0)

Hanya **Slot aktif** yang final. Semua batas lain adalah **usulan (belum final)**: dievaluasi PO, tidak boleh ditampilkan sebagai ketentuan permanen. Sumber tunggal: `src/lib/entitlements/config.ts` (`CONFIG_VERSION = 2`), dicerminkan di tabel `plan_features` oleh migrasi `0004_entitlement_k23_active_slots.sql`.

| Fitur | Gratis | Pro | Status |
|---|---|---|---|
| Slot aktif | 1 | 3 | **final** (Gratis K-23, Pro K-03) |
| Lomba manual tersimpan | 10 | tanpa batas | usulan (belum final) |
| Handoff Pack | 15/bulan | tanpa batas | usulan (belum final) |
| Validasi berkas | 3/bulan | 50/bulan (kalibrasi dari biaya nyata) | usulan (belum final) |
| Prompt tersimpan | 10 | tanpa batas | usulan (belum final) |
| Jury Pack | 5/bulan | tanpa batas | usulan (belum final) |
| Persona juri | 1 | tanpa batas | usulan (belum final) |
| Riwayat versi juri | 3 | tanpa batas | usulan (belum final) |
| Item portofolio | 10 | tanpa batas | usulan (belum final) |
| Laporan orang tua | 1/bulan | tanpa batas | usulan (belum final) |
| Jendela analitik | 28 hari | tanpa batas | usulan (belum final) |
| Konteks pribadi penuh, Peta Jalan adaptif, workflow multi-langkah, panel juri, Red Team juri, rubrik resmi, workflow multi-koneksi, pemantauan sumber, laporan evaluasi PDF | tidak | ya | usulan (belum final) |

**Slot di atas batas** (mis. Pro turun ke Gratis, atau data demo): Slot lama, arsip, riwayat, dan Data Progres tidak dihapus dan tidak diarsipkan otomatis. Batas hanya mencegah menambah atau mengaktifkan Slot baru. Pengguna memilih sendiri Slot yang tetap aktif lewat UI (M1). Penegakan di database (trigger) dibuat bersama tabel Slot per akun di M1.

## Dari PRD Bagian 12 (asumsi default dipakai)

Semua 14 butir memakai kolom "Asumsi default". Yang paling memengaruhi tahap awal:

- #3 dan #14: tanpa akses Meta, Radar memakai `SeedAdapter` + unggah manual (Lampiran D).
- #9: aset maskot belum tersedia. `EmptyState` menampilkan lingkaran penanda berukuran sama (112 px) sampai berkas masuk ke `public/mascot/<pose>.png`.
- #11: domain demo `*.vercel.app`.

## Baru (tahap SETUP)

| # | Asumsi | Alasan |
|---|---|---|
| S1 | Server MCP macOS dipindah dari akar repo ke `tools/creative-apps-mcp/` | Akar repo dipakai aplikasi Next.js. Config Claude Desktop lama yang menunjuk `ata/server.py` perlu dibuat ulang |
| S2 | Next.js dikunci di `15.5.29`, Tailwind v4, React 19 | "15.x terbaru yang sudah ditambal" saat setup; bukan Next 16 |
| S3 | shadcn/ui dipasang manual (components.json + `radix-ui`, `sonner`, `cva`, `tailwind-merge`) | Registry `ui.shadcn.com` diblokir jaringan sesi cloud. Hasilnya setara; `pnpm dlx shadcn add` tetap bisa dipakai di Mac |
| S4 | Komponen design system di `src/components/ds/` | Mengikuti DESIGN-SYSTEM 11.1 (lebih baru daripada `components/glass` di PRD 8.3) |
| S5 | Efek desktop ada di `src/styles/fx.css` (berkas tambahan) | Memisahkan semua aturan `data-fx="rich"` agar mudah diaudit |
| S6 | Bentuk panel depan folder memakai mask SVG + garis tepi SVG | Satu lapisan blur per folder (batas ≤ 3 blur di HP) dengan tab menyatu seperti referensi 2 |
| S7 | Lencana di atas poster (`DATA DEMO`, deadline) berlatar solid terang di kedua tema | Poster selalu pastel; uji kontras otomatis gagal dengan warna semantik tema gelap |
| S8 | Panel sheet/dialog dan toast dibuat hampir solid (86–94%) walau Kaca Penuh | Ada teks di atasnya; kontras AA harus terjaga di atas latar bergerak |
| S9 | Empat rute tab (`/lomba`, `/ata`, `/progres`, `/profil`) berisi placeholder; `/hari-ini` sudah dimigrasikan | Hanya untuk meninjau kerangka responsif; belum ada fitur |
| S10 | `/api/health` memakai service role dan mengembalikan `{ok}` saja | `system_flags` hanya terbaca pengguna terautentikasi; ping keepalive tidak login |
| S11 | `DEMO_MODE` dibaca saat build untuk halaman statis | Mengubah `DEMO_MODE` di Vercel perlu redeploy |
| S12 | Stiker kategori = glif Lucide di atas bentuk gem, ditandai `TODO(design)` | DESIGN-SYSTEM 10: sementara, diganti ilustrasi desainer sebelum publik |
| S13 | PWA (manifest, service worker Serwist) belum dikonfigurasi; paketnya sudah terpasang | PROMPT SETUP melarang fitur aplikasi di tahap ini; FR-PWA-01/02 masuk Hari 1 |
| S14 | Kolom "Referensi" di `/styleguide` (DS-04, P1) belum dibuat | Gambar referensi berisi karya pihak ketiga; tidak disajikan dari `public/` |
| S15 | Video `ref-5-pull-paw-motion.mp4` disimpan sebagai referensi gerak ke-5 | Belum dipetakan di DESIGN-SYSTEM.md. Usulan: tarik-untuk-segarkan dengan maskot di Hari Ini, hanya `rich`/opsional. Butuh keputusan Product Owner |
| S16 | Skill desain eksternal tidak dipasang ke repo | Lihat docs/EXTERNAL-SKILLS.md |
| S17 | TRIBE v2 tidak dipakai | Lisensi non-komersial dan keluarannya peta aktivasi otak, bukan ukuran perasaan pengguna (docs/EXTERNAL-SKILLS.md) |
| S18 | Palet **Senja** (koral, peach, merah muda, netral hangat) menggantikan palet ungu-biru; permata `lavender` diganti `coral` dan `--gem-lavender-*` dipertahankan sebagai alias sementara | Keputusan Product Owner 12 Nov 2026: ungu terasa generik. Alias dihapus setelah semua komponen memakai `coral` |
| S19 | Harga Pro tetap ditampilkan di `/paket` (Rp69.000/bulan, tahunan diskon 10%, dihitung di `src/lib/billing/price.ts`) dan tombol bayar hanya menampilkan "Pembayaran belum diaktifkan di server ini" | Mengikuti prototipe dan blueprint 16; tanpa payment gateway (Lampiran D) |
| S20 | "Pakai tanpa akun dulu" hanya menyimpan penanda di perangkat (`localStorage`) lalu membuka `/hari-ini` | Onboarding dan penyimpanan lokal prototipe belum dimigrasikan |
| S21 | "Slot terpakai" di `/paket` selalu 0 | Tabel Slot per akun baru dibuat saat Lomba dimigrasikan; batasnya sudah dari entitlement server (K-23) |
| S22 | (Diganti S24–S27 untuk akun yang masuk.) Belum masuk: Hari Ini membaca Slot dan tugas dari penyimpanan perangkat (`ata-bersama`), bukan dari database | Tabel Slot per akun baru dibuat saat Lomba dimigrasikan; batas Slot tetap dari server (K-23) |
| S23 | Lomba lokal-dulu: data perangkat (`ata-bersama`) tetap sumber layar; baris akun digabung saat masuk dan perubahan dicerminkan ke `/api/v1/user-competitions`. Antrean Radar tidak disimpan per akun | Prototipe memakai store perangkat; keadaan belum masuk dan API gagal harus tetap bekerja |
| S24 | Membatalkan tugas selesai (selesai → dikerjakan/belum) menghapus tanggal selesainya; XP, bonus Peta Jalan tuntas, dan streak ikut turun. Menyelesaikan lagi memakai tanggal baru | Diputuskan PO 23 November 2026. Sama dengan perilaku prototipe (`aturStatusTugas`). XP v1 adalah skor progres efektif dari status tugas saat ini, bukan akumulasi seumur hidup; riwayat peristiwa (event ledger) belum dibuat pada tahap ini |
| S25 | Zona waktu hari selesai dan streak = `profiles.timezone`; bila kosong atau tidak dikenal Postgres, `Asia/Jakarta`. Jam yang dipakai jam server | Diputuskan PO 23 November 2026. XP, tenggat, streak, dan tanggal di kepala Hari Ini memakai zona yang sama. Kolomnya sudah ada (0002) dengan default WIB; UI pengaturan zona waktu di luar lingkup ini |
| S26 | Tepat waktu/terlambat dinilai terhadap tenggat langkah pada saat diselesaikan (`task_progress.due_on`); mengubah tenggat sesudahnya tidak mengubah XP yang sudah dihitung | Diputuskan PO 23 November 2026 sebagai baseline XP v1: +10 tepat waktu, +5 terlambat, +20 sekali saat seluruh langkah Peta Jalan selesai, naik level tiap 100 XP (`shared/logic/xp.js`). Bonus dihitung dari status saat ini, jadi perubahan status berulang tidak menggandakannya |
| S27 | Masuk memulai salinan akun yang kosong di perangkat; data perangkat/demo disisihkan (`ata-lokal:*`) dan kembali saat keluar. Tidak ada impor data perangkat ke akun | Butir "data demo dan lokal tidak boleh otomatis tersinkron". Menggantikan S23 (unggah saat pertama masuk). Diputuskan PO 23 November 2026: tidak ada unggah otomatis; impor manual dievaluasi terpisah setelah progres akun stabil |
| S28 | Status tugas hanya bisa diubah selama lombanya Slot aktif dengan Peta Jalan disetujui. Setelah Slot dilepas, tugasnya hilang dari Hari Ini tetapi langkah yang sudah selesai tetap dihitung ke XP, level, dan streak; baris `task_progress` baru terhapus bila lombanya dihapus dari akun | Prototipe menyimpan Peta Jalan Slot yang dilepas sebagai riwayat dan `hitungXP` menghitung semuanya. Kalau XP hilang saat Slot dilepas, akun Gratis (1 Slot) kehilangan seluruh XP setiap ganti lomba. Diputuskan PO 23 November 2026 |
| S29 | Nama panggilan, target, dan kemampuan disimpan sebagai kolom baru di `profiles` (`display_name`, `targets`, `skills`; migrasi 0007), bukan tabel `ambition_profiles` terpisah | Onboarding prototipe menanyakan nama dan target, dan skema 0002 tidak punya tempatnya. Tiga kolom adalah perubahan terkecil; tabel terpisah dievaluasi saat profil L2 dibuat |
| S30 | Onboarding dianggap selesai bila nama panggilan, jenjang, dan tahun lahir terisi; langkah lain boleh dilewati. Persetujuan wali untuk usia di bawah 18 (FR-AUTH-07) belum ditegakkan | Mengikuti langkah wajib prototipe. FR-AUTH-07 berprioritas P1 dan ditandai perlu tinjauan hukum; butuh keputusan PO |
| S31 | Izin data AI disimpan per kategori (delapan kategori, semua mati sejak awal) dan tiap perubahan dicatat di `audit_log`. Belum ada fitur AI yang membacanya | Lapis izin harus ada sebelum orkestrasi AI (Fase B) agar bawaannya mati |

## FR-AUTH-07: persetujuan wali (PR tersendiri, 23 November 2026)

Menggantikan kalimat kedua S30. Instruksi PO (P0): persetujuan wali ditegakkan di server dan tidak boleh berupa centang saja.

| # | Asumsi | Alasan |
|---|---|---|
| W1 | Baris PRD FR-AUTH-07 ("centang + nama wali") tidak dipakai. Persetujuan hanya sah bila wali membuka tautan sekali pakai yang dikirim ke emailnya, lalu mengetik namanya dan menyatakan dirinya wali | Instruksi PO lebih baru dan lebih ketat daripada PRD. Baris PRD perlu diperbarui oleh PO |
| W2 | "Di bawah 18" dihitung dari tahun lahir saja: akun dianggap anak selama `tahun WIB sekarang − tahun lahir < 19`. Tahun lahir kosong = usia tidak diketahui = izin AI terkunci | Tanpa tanggal lahir, orang yang lahir Desember masih 17 di tahun ia genap 18. Pilihan aman: paling lama terlambat satu tahun melepas kunci, tidak pernah terlalu cepat |
| W3 | Akun anak tidak bisa mengubah tahun lahirnya menjadi dewasa atau mengosongkannya (`age_locked`). Dewasa → anak boleh, dan langsung mematikan semua izin AI | Mencegah lolos dengan mengganti usia. Koreksi salah ketik perlu jalur admin/dukungan yang belum ada: **butuh keputusan PO** |
| W4 | Pengiriman email memakai Resend (HTTP API, tier gratis) lewat adapter `src/lib/account/consent-delivery.ts`, aktif hanya bila `RESEND_API_KEY` dan `GUARDIAN_CONSENT_EMAIL_FROM` diisi. Keduanya **belum diisi di lingkungan mana pun**: tombol kirim mati, UI mengatakan email belum tersambung, dan akun anak tetap terkunci | Lampiran D: tanpa SMTP wajib. Tidak ada jalur pengganti yang menganggap centang sebagai persetujuan. Pemilihan penyedia email dan domain pengirim **butuh keputusan PO** |
| W5 | Verifikasi membuktikan kendali atas kotak masuk email wali, bukan identitas hukum wali. Email wali tidak boleh sama dengan email akun; pelajar yang memakai email kedua miliknya sendiri tidak terdeteksi | Setara praktik "email plus" persetujuan orang tua. Bukti lebih kuat (KTP, video, pembayaran kecil) di luar tier gratis; **perlu tinjauan hukum UU PDP** |
| W6 | Tautan berlaku 72 jam, sekali pakai, maksimal 5 permintaan per akun per 24 jam; permintaan baru membatalkan tautan lama. Hanya hash SHA-256 token dan hash email wali yang disimpan; email tersamar (`w***@domain`) untuk ditampilkan | Meminimalkan data pihak ketiga (wali) dan dampak kebocoran database |
| W7 | Persetujuan mencakup kedelapan kategori; pelajar tetap menyalakan tiap kategori sendiri. Cakupan disimpan per persetujuan sehingga gate menolak kategori di luar cakupan | Cakupan sebagian per wali belum ada di UI; skemanya sudah mendukung |
| W8 | Pencabutan: pelajar (dari Profil) atau wali (tautan pencabutan yang ditampilkan sekali setelah menyetujui). Mencabut mematikan semua izin AI dan membuka kembali onboarding. Wali yang kehilangan tautan pencabutan belum punya jalur lain | Jalur dukungan/admin belum ada; **butuh keputusan PO** |
| W9 | Saat migrasi 0008 diterapkan, akun anak yang sudah ada kehilangan izin AI yang menyala dan status onboarding selesai; akun dewasa dengan tahun lahir kosong kehilangan izin yang menyala sampai tahun lahir diisi | Tidak ada persetujuan terverifikasi untuk mereka. Belum ada fitur AI yang membaca izin, jadi tidak ada fungsi yang hilang |
| W10 | Versi dokumen persetujuan `2026-11-wali-1`; teksnya adalah teks di halaman `/wali/persetujuan`. Menaikkan versi belum memaksa persetujuan ulang | Belum ada teks hukum final dari PO |
