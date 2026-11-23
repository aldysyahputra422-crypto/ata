# Penilaian risiko singkat: peluncuran Ata ke pengguna anak

Status: catatan kerja teknis, 23 November 2026. **Bukan pendapat hukum dan bukan pernyataan kepatuhan.**
Dokumen ini tidak mengutip atau menafsirkan isi pasal peraturan mana pun. Setiap butir di bagian 3 adalah
pertanyaan yang harus dijawab oleh penasihat hukum sebelum Ata dibuka untuk pengguna di bawah 18 tahun.

## 1. Yang dilakukan mekanisme sekarang (FR-AUTH-07)

- Usia dihitung dari tanggal lahir yang diisi pengguna sendiri. Tidak ada pemeriksaan dokumen.
- Akun di bawah 18 tahun berstatus menunggu sampai ada persetujuan wali: tidak bisa menyelesaikan onboarding,
  semua izin data AI mati, dan `canProcessAi` menolak setiap kategori. Ini ditegakkan di database.
- Persetujuan diberikan lewat tautan sekali pakai ke alamat email yang diisi pelajar sebagai email wali. Wali
  mengetik namanya dan menyatakan dirinya orang tua/wali. Yang tersimpan: status, waktu, versi dokumen, cakupan,
  metode, nama pemberi pernyataan, pernyataannya, hash alamat email.
- Wali dan pelajar bisa mencabut. Wali yang menolak bisa meminta akun anak dihapus.

## 2. Batas yang diketahui

| Batas | Akibat |
|---|---|
| Tanggal lahir adalah pernyataan sendiri | Anak bisa mengisi tanggal dewasa saat mendaftar dan tidak pernah masuk alur persetujuan |
| Verifikasi email hanya membuktikan akses ke kotak masuk | Tidak membuktikan identitas pemilik kotak masuk, bahwa ia orang dewasa, atau hubungan hukumnya dengan anak. Pelajar bisa memakai alamat email kedua miliknya |
| Pengiriman email belum dikonfigurasi | Di lingkungan sekarang tidak ada persetujuan yang bisa diberikan; akun anak tidak bisa memakai Ata |
| Teks persetujuan belum ditinjau | Versi `2026-11-wali-1` ditulis tim pengembang, bukan teks hukum final |
| Penghapusan atas permintaan wali belum terjadwal | Fungsinya ada, tetapi harus dijalankan operator; belum ada pemberitahuan email |
| Koreksi tanggal lahir di luar batas butuh operator | Belum ada peran operator, prosedur, atau bukti yang ditetapkan |
| Tidak ada batas usia minimum | Tanggal lahir diterima sampai lima tahun ke belakang; tidak ada aturan berbeda untuk anak yang lebih muda |
| Pembatasan fitur hanya pada pemrosesan AI | Fitur non-AI (daftar lomba, tugas, progres berbasis aturan) tidak dibedakan menurut usia setelah persetujuan ada |

Kesimpulan teknis: mekanisme ini layak untuk **demo terbatas** dengan pengguna yang dikenal. Ia tidak dirancang
sebagai bukti persetujuan orang tua yang kuat.

## 3. Yang butuh validasi hukum sebelum peluncuran

Peraturan yang oleh Product Owner diminta dievaluasi: **UU Pelindungan Data Pribadi (UU PDP)**,
**PP 17/2025**, dan **Permen Komdigi 9/2026**. Tim pengembang belum menilai isi ketiganya dan tidak mengklaim
Ata memenuhi salah satunya. Pertanyaan untuk penasihat hukum:

1. Apakah batas 18 tahun dan cara menghitungnya (tanggal lahir, zona waktu akun) sesuai dengan definisi anak yang berlaku?
2. Apakah ada batas usia minimum atau kelompok usia yang memerlukan perlakuan berbeda, dan fitur apa yang harus dibatasi per kelompok?
3. Apakah persetujuan lewat tautan email dengan pernyataan sendiri cukup sebagai persetujuan orang tua/wali, atau diperlukan verifikasi identitas dan hubungan yang lebih kuat? Metode apa yang diterima?
4. Apakah verifikasi usia berbasis pernyataan sendiri cukup, atau diperlukan mekanisme verifikasi usia lain?
5. Apa isi wajib teks persetujuan dan pemberitahuan privasi untuk anak dan wali, dan dalam bentuk apa?
6. Berapa lama bukti persetujuan dan log audit boleh atau wajib disimpan, termasuk setelah akun dihapus?
7. Apakah prosedur penolakan dan penghapusan (masa tunggu 7 hari, siapa yang boleh memicu, apa yang dihapus) sesuai, termasuk tenggat waktunya?
8. Apakah pemrosesan data anak oleh penyedia model AI pihak ketiga (termasuk kunci milik pengguna dan transfer ke luar negeri) diperbolehkan, dan dengan syarat apa?
9. Apakah diperlukan penilaian dampak pelindungan data sebelum peluncuran, dan siapa penanggung jawabnya?
10. Apakah fitur lain (pengingat, radar lomba, ajakan mentor, pelacakan progres) memerlukan pembatasan atau pengaturan bawaan khusus untuk anak?

## 4. Syarat teknis minimum sebelum peluncuran ke anak (usulan)

- Jawaban tertulis atas bagian 3 dan teks persetujuan final dengan versi baru.
- Penyedia email dengan domain pengirim terverifikasi; uji pengiriman nyata.
- Penjadwal dan pemantauan untuk penghapusan atas permintaan wali; pemberitahuan sebelum penghapusan.
- Peran operator dengan prosedur dan jejak audit untuk koreksi tanggal lahir dan permintaan wali di luar tautan.
- Keputusan batas usia minimum dan pembatasan fitur per kelompok usia.
