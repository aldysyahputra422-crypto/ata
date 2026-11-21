# Desain kelompok 2: Lomba (Radar, detail, Slot, Peta Jalan)

Tanggal: 13 November 2026 · Bagian dari `2026-11-13-ata-desain-fitur-design.md` (bagian 6, kelompok 2) · Status: menunggu persetujuan

## Maksud
Calon pengguna harus merasakan Ata sebagai pembimbing yang **menemukan lomba yang cocok** lalu **memecahnya jadi jalan yang jelas**. Rasa "game" datang dari tumpukan kartu Radar dan labirin 3D Peta Jalan; sisanya rapi dan cepat dibaca.

## Keputusan Product Owner (13 Nov)
- **Radar = tumpukan kartu.** Satu poster besar per layar. Geser kanan = Simpan, kiri = Lewati, atas = Jadikan Slot. Tombol untuk ketiganya selalu ada (aksesibilitas dan desktop), panah keyboard juga.
- **Peta Jalan = labirin 3D** yang sudah ada (`assets/labirin-*`, `blender/maze_*.json`). Tiap langkah jadi titik di jalur menuju finish; jalur menyala sampai langkah terakhir yang selesai.

## Layar
1. **Radar** (`#radar`): sapaan "Ata nemu N lomba buat kamu hari ini", tumpukan kartu poster (lencana DATA DEMO, skor cocok %, 2–3 alasan cocok, stempel H-N), filter kategori (permata), tombol "Unggah poster" (maks 5/hari; memuat "Ata membaca poster…" lalu kartu baru). Keadaan: memuat, habis ("Hari ini sudah semua. Besok Ata cari lagi." + maskot tidur), kosong ("Hari ini belum ada yang cocok. Aku tetap pantau besok."), dijeda (Slot penuh: "Slotmu penuh… Radar istirahat dulu." + tombol "Cari lomba tambahan").
2. **Tersimpan dan riwayat 7 hari** (`#tersimpan`): lomba yang disimpan dan yang dilewati 7 hari terakhir, bisa dipulihkan.
3. **Detail lomba** (`#lomba-detail`): poster besar, penyelenggara, tingkat, biaya, hadiah, tenggat, syarat; "Kenapa cocok untukmu" dari profil; tombol Jadikan Slot, Simpan, Lihat sumber, dan Latihan Sidang Juri.
4. **Slot** (`#slot`): tiga folder (gaya referensi 2) dengan cincin progres dan H-N; slot kosong mengajak ke Radar. Slot ke-4 ditolak dengan lembar "Slotmu penuh. Selesaikan atau lepas satu dulu, biar tetap fokus." dan pilihan lepas Slot (dengan konfirmasi).
5. **Peta Jalan** (`#peta`): usulan Ata (5–8 langkah dibagi rata sampai H-2 sebelum tenggat) → Setujui atau Sunting. Labirin 3D dengan titik langkah; langkah aktif berdenyut; centang langkah → jalur menyala ke titik berikutnya dan maskot pindah. Daftar langkah di bawah dengan tanggal; sunting langkah (nama, tanggal, tambah, hapus) dengan validasi tanggal di luar tenggat.

## Logika yang diuji otomatis
- Skor cocok lomba terhadap profil (minat, tingkat, sisa waktu) dan alasannya.
- Mesin keputusan tumpukan kartu: simpan, lewati, jadikan Slot, urungkan; batas 3 Slot ditolak di logika, bukan hanya di UI.
- Pembuatan langkah Peta Jalan dari tenggat; progres; validasi tanggal; posisi titik di jalur labirin.

## Bukan sasaran
Pemindaian Instagram sungguhan, ekstraksi poster sungguhan (disimulasikan), kalender `.ics`, hari libur nasional.

## Keputusan pembuat
Delapan lomba contoh fiktif berlabel DATA DEMO; poster dibuat dengan CSS dan permata (bukan gambar pihak ketiga); urungkan keputusan kartu terakhir tersedia 5 detik lewat toast.
