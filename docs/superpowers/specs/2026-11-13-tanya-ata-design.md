# Desain kelompok 3: Tanya Ata (Chat, Resep, Ingatan)

Tanggal: 13 November 2026 · Bagian dari `2026-11-13-ata-desain-fitur-design.md` (5.1, kelompok 3) · Sumber: PRD 5.5, 5.6, 6.4, 6.5 · Status: menunggu persetujuan

## Maksud
Ata terasa sebagai **dosen pembimbing** yang mengenal profil dan Slot siswa: memberi langkah kecil hari ini, tidak mengarang aturan lomba, dan transparan soal apa yang ia ingat. Rasa "canggih" datang dari jalur pipa multi-AI di Resep; rasa "berguna" dari kartu aksi di chat.

## Keputusan Product Owner (13 Nov)
- **Chat = chat + kartu aksi.** Jawaban Ata bisa berupa kartu: "Langkah hari ini" (dengan tombol "+ ke Peta Jalan"), dan baris konteks "Ata pakai: profil, Slot, N ingatan [lihat]".
- **Resep = jalur pipa AI.** Langkah sebagai node tersambung (AI yang disarankan di bawah tiap node); hasil langkah sebelumnya terlihat mengalir ke langkah berikutnya. Vertikal di HP.
- **Ingatan = papan kartu per jenis** (Fakta, Tujuan, Preferensi, Keputusan): sematkan, sunting, hapus, Lupakan semua.

## Layar (segmen Chat · Resep · Ingatan, sesuai PRD navigasi)
1. **Chat** (`#chat`): pemilih thread (Umum atau per Slot), baris konteks, aksi cepat (Review ideku, Pecah tugas ini, Simulasi juri, Aku mentok, Cek aturan lomba), tempel teks maks 12.000 karakter. Jawaban demo mengalir bertahap (streaming disimulasikan). Catatan integritas AI muncul sekali per lomba. Pertanyaan aturan lomba tanpa data → Ata bilang tidak tahu dan minta juknis (tidak menyebut angka). "Ingat ini" dan tawaran akhir sesi "Simpan ini ke Ingatan?" dengan butir yang bisa disunting/dihapus sebelum disimpan.
   - Keadaan: belum terhubung AI → dua pilihan (Hubungkan AI ke Sidang/Sambungkan AI, atau **Mode Tanpa Key**: Siapkan Prompt → Salin → Tempel jawaban). Galat demo: key ditolak, batas permintaan, koneksi putus saat streaming, masing-masing dengan tombol perbaikan. Titik mengetik saat memuat.
2. **Resep** (`#resep`): pustaka 8 Resep resmi + tab "Punyaku" (Racikan; kosong: "Belum ada Racikan"). Rekomendasi "Resep untuk lomba ini" dari Slot (deterministik dari jenis lomba).
3. **Stepper Resep** (`#resep-jalan`): jalur pipa node; **pratinjau privasi** dengan saklar per bidang sebelum salin; per langkah: tujuan, AI disarankan + alasan, prompt (variabel terisi; variabel tak dikenal jadi kolom isian), Salin prompt, Tempel hasil, cek kualitas, tips teknis, estimasi menit; hasil langkah N otomatis masuk ke prompt langkah N+1. Selesai → Simpan sebagai Racikan; ekspor Markdown.
4. **Ingatan** (`#ingatan`): papan kartu per jenis, sematkan, sunting, hapus (urungkan), Lupakan semua (konfirmasi), saklar "Ingat otomatis". Penanda bahwa Ingatan privat dan tidak masuk Laporan orang tua.

## Logika yang diuji otomatis
- Mesin templat tanpa eval: `{{profile.*}}`, `{{lomba.*}}`, `{{step[id].output}}`; bidang yang dimatikan di pratinjau privasi tidak muncul; variabel tak dikenal dikembalikan sebagai daftar kolom isian.
- Pemilihan Resep untuk jenis lomba (deterministik) dan Racikan (duplikasi, ubah langkah, ekspor Markdown).
- Context pack: memori ≤ 12 (pinned dulu, lalu terbaru), urutan pemangkasan sesuai anggaran token.
- Penyaring Ingatan: menolak kredensial/nomor kartu/data kesehatan sebelum disimpan.
- Batas tempel 12.000 karakter dan penjawab demo (aturan lomba tanpa juknis → tidak menyebut angka).

## Bukan sasaran
Panggilan AI sungguhan (semua jawaban demo), enkripsi key, embedding/semantic recall, unggah PDF.

## Keputusan pembuat
Profil demo sama dengan kelompok 2 (Raka, SMA, Slot LKTI Garuda Muda). Isi Resep ditulis ringkas (3–4 langkah) untuk 8 Resep, dua di antaranya lengkap dengan spesifikasi teknis (Business Plan, KTI). Nama AI yang disarankan adalah data yang bisa diedit, bukan klaim. Halaman baru `tanya.html`, modul `tanya/`, fondasi `shared/`.
