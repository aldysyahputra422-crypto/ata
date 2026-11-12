# Skill dan sumber eksternal

Empat repo yang diminta Product Owner untuk membantu menaikkan kualitas hasil. Semuanya sudah di-clone dan
dibaca pada 12 November 2026. **Belum ada yang dipasang ke repo ini**: isinya instruksi pihak ketiga, jadi
diperlakukan sebagai referensi dan alat kritik, bukan sebagai aturan proyek.

Aturan pakai: `docs/DESIGN-SYSTEM.md` dan PRD tetap pemegang keputusan. Saran skill dipakai hanya bila tidak bertentangan.

| Repo | Lisensi | Commit dibaca | Isinya | Dipakai untuk Ata | Catatan penting |
|---|---|---|---|---|---|
| `pbakaus/impeccable` | Apache 2.0 | b4bff16 | Skill desain dengan sub-perintah (`audit`, `critique`, `polish`, `animate`, `harden`, `typeset`, dst.) dan detektor pola | Kritik dan poles layar setelah fitur jadi; pemeriksaan pola "buatan AI" (PRD 9.8) | Prinsipnya "the brief wins", jadi selaras dengan design system kita. Launcher-nya mengunduh mesin dan, menurut README, mengambil katalog dari impeccable.style serta punya telemetri. Jalankan hanya dengan persetujuan |
| `nextlevelbuilder/ui-ux-pro-max-skill` | MIT | 6ae86f6 | Data lokal yang bisa dicari: 120 pedoman UX, palet, pasangan font, jenis grafik, + skrip Python | Daftar periksa UX dan aksesibilitas per layar; pemilihan jenis grafik untuk Progres dan Laporan | Palet dan pasangan fontnya **tidak dipakai**: token Ata sudah dikunci |
| `Leonxlnx/taste-skill` | MIT | f6b7657 | Skill untuk situs perusahaan/landing: aturan copy, gerak, tata letak, + pemeriksa di browser | Hanya halaman landing `/` dan pemeriksaan copy ("copy tells") | **Bertentangan dengan merek Ata**: melarang violet/lavender, padahal `--primary` Ata adalah Ambis Violet dan lavender adalah permata kategori. Juga memasang hook `Stop` yang menjalankan skrip Node hingga 10 menit. Jangan dipasang sebagai skill proyek |
| `public-apis/public-apis` | MIT | cb58114 | Daftar API publik (bukan skill) | Kandidat API gratis untuk PRD 8.12, mis. hari libur nasional (FR-RDM-12) | Tiap API diverifikasi sendiri (cakupan Indonesia, batas, ketentuan) sebelum dipakai; selalu ada fallback statis |

## TRIBE v2 (`facebookresearch/tribev2`): tidak dipakai

Diminta untuk "memproyeksikan apa yang akan dirasakan pengguna". Setelah dibaca (commit af58661):

- Ini model riset yang memprediksi **respons fMRI otak** terhadap video, audio, atau teks, untuk "subjek rata-rata", di permukaan korteks (~20 ribu titik). Keluarannya peta aktivasi otak, **bukan** skor perasaan, kepuasan, atau kemudahan pakai. Mengubah peta itu menjadi "pengguna akan merasa X" bukan hal yang didukung modelnya.
- Lisensinya **CC BY-NC 4.0 (non-komersial)**. Ata punya langganan berbayar, jadi model ini tidak boleh menjadi bagian dari produk atau proses komersialnya.
- Butuh Python 3.11+, bobot model dari Hugging Face, dan praktis GPU. Itu di luar Profil Demo gratis.

Keputusan: tidak dipasang dan tidak dipakai untuk keputusan desain. Untuk tahu apa yang dirasakan pengguna, PRD sudah menyediakan cara yang sah dan lebih langsung: 10 percakapan pengguna (PRD 1.3), uji onboarding < 4 menit di HP (A.7), dan metrik aktivasi/retensi (2.3). Bila Product Owner tetap ingin bereksperimen secara pribadi dan non-komersial, itu dilakukan di luar repo ini.

## Cara pakai di tahap berikutnya

1. Setelah sebuah layar selesai dan lolos uji, jalankan kritik dengan referensi `impeccable` (critique/audit/polish) dan pedoman UX `ui-ux-pro-max`.
2. Temuan yang selaras dengan DESIGN-SYSTEM.md diperbaiki; temuan yang bertentangan dicatat di docs/ASSUMPTIONS.md beserta alasannya.
3. `taste-skill` dipakai sebagai bacaan saat membangun landing, tanpa hook-nya.

## Bila ingin memasangnya di Claude Code lokal (Mac)

Perintah dari README masing-masing repo. Pasang di cakupan pengguna, bukan di repo ini:

```bash
npx impeccable install
```

```text
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

`taste-skill` sebaiknya tidak dipasang untuk proyek ini karena larangan warna dan hook-nya.
