---
tags: [desain, kaca, lingkungan, gerak, asisten]
tanggal: 2026-11-20
status: diterapkan
---

# Lingkungan senja + material kaca + gerak + asisten jujur

## 1. Referensi yang dipakai
- **Mockup "Liquid Glass"** (dock 4 item di atas lanskap): yang membuatnya meyakinkan bukan blur, tetapi
  (a) latar yang kaya detail, (b) tepi tebal yang terang (bevel/specular), (c) latar **terbias** di tepi, tengah jernih,
  (d) segmen aktif = lensa lain di dalam lensa (beda bahan, bukan sekadar warna).
- **Lanskap senja** (merah muda–jingga–ungu, matahari di lembah kiri): palet ini persis "Palet Senja" Ata, jadi dipakai
  sebagai kanvas, bukan gradien ungu-biru generik. Matahari menjadi sumber cahaya untuk lapisan cahaya.
- Bingkai `_ref_frames` sebelumnya (folder macOS, travel app, food app, OTP) tetap menjadi acuan gerak.

## 2. Arsitektur latar (dipilih dari 3 opsi)
| Opsi | Masalah |
|---|---|
| Latar hanya di shell, iframe transparan | `backdrop-filter` tidak menembus iframe → kaca di dalam tab datar |
| Tiap halaman menggambar latar sendiri | ukuran "cover" berbeda → latar patah di garis rail/iframe |
| **Tiap halaman menggambar lingkungan yang sama; shell mengirim ukuran & offset** | dipilih: mulus melintasi rail+iframe, semua kaca membiaskan lanskap yang sama |

Lapisan: foto (`assets/lingkungan/senja-2000|1280|potret.webp`, 89–196 KB) → cahaya matahari yang bernapas 26 dtk
(fase dari jam dinding, jadi serempak antar-iframe) → tirai keterbacaan (gradasi `--bg`). Parallax ±10 px mengikuti
penunjuk, juga saat penunjuk di atas iframe. Uji penerimaan: ganti foto dengan warna rata → kaca kehilangan pembiasan,
kilau, dan kedalaman (latar memang bagian dari material).

## 3. Material (3 tingkat, per hierarki)
| Tingkat | Dipakai | Isi |
|---|---|---|
| lensa | dock HP, rail desktop, pil aktif | SVG `#kaca-lensa`: peta perpindahan yang hanya menggeser 14 % tepi (tengah jernih) + blur 9 px + saturasi 1.9; kilau tepi atas; Chromium saja, lainnya blur biasa |
| kaca / kaca tebal | sheet, panel folder, bilah lengket, tombol hero | gradien putih 46→24 % (tebal 70→52 %) + blur 22 + saturasi 1.8 + tepi dalam terang |
| padat | kartu berisi teks | 86 % opak + blur 16 — latar terasa sebagai suhu warna, teks tetap kontras |
Fallback: Efek Kaca "ringan/mati", `prefers-reduced-transparency`, `prefers-reduced-motion`.

## 4. Gerak
- Dock rail: pembesaran kosinus berdasarkan jarak penunjuk (maks 1,5×, jangkau 140 px), tetangga ikut; 90 ms saat mengikuti,
  memantul saat dilepas; penanda aktif bergeser dengan pegas. Sentuhan: tanpa pembesaran, umpan balik tekan.
- Folder Slot: klik → folder yang SAMA melebar jadi panel (View Transition, nama bersama, 380 ms `cubic-bezier(.32,.72,0,1)`),
  isi muncul berurutan setelah morph (stagger 45 ms), tutup lebih cepat (260 ms) dan kembali ke folder asal; fokus dikembalikan.
- Transisi yang dilewati (tab latar) tidak lagi memunculkan galat konsol.

## 5. Asisten: apa yang nyata
Prototipe ini **tidak** tersambung ke model AI. "Langkah berikutnya" di Hari Ini adalah aturan terbaca
(`app/logic/saran.js`, 6 tes) dari Slot, Peta Jalan, tugas, dan tenggat lomba nyata; setiap saran membawa alasannya dan
dilabeli "bukan tebakan model AI". Integrasi AI sungguhan (BYOK, FR-BYOK) tetap di backend yang belum dibangun.

## 6. TRIBE v2 (Meta FAIR) — posisi yang jujur
Berdasarkan pengetahuan umum, bukan unduhan repo pada sesi ini (lisensi & syarat model/dataset WAJIB diperiksa ulang di repo):
TRIBE v2 adalah model *brain encoding* yang memprediksi respons fMRI terhadap stimulus video, audio, dan bahasa, dilatih pada
data neuroimaging. Lisensi yang disebut pengguna: CC BY-NC 4.0 (non-komersial). Ia **bukan** prediktor retensi, preferensi UI,
atau profil psikologis. Peran yang masuk akal untuk proyek akademik: instrumen riset *offline* untuk membandingkan respons
otak terprediksi terhadap materi multimodal (mis. video pitch Sidang Juri) — dengan izin etik, tanpa data pengguna, di luar
aplikasi. Tidak dipasang di frontend.

## 7. Usulan intelijen perilaku (belum dibangun)
Instrumentasi peristiwa minimal & lokal-dulu, dengan persetujuan: `slot_dibuat`, `peta_disetujui`, `tugas_dicentang`,
`saran_diklik(jenis)`, `sidang_selesai`. Ukur: penyelesaian tugas per Slot, waktu dari Slot→Peta disetujui, adopsi saran.
Eksperimen A/B hanya untuk urutan/teks saran, bukan untuk memaksimalkan waktu layar. Tidak ada skor prediksi sebelum data cukup.
