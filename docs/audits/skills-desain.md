# Audit skill desain dan engineering (2026-11-22)

Lingkup: 13 repositori yang diminta Product Owner, ditambah `iart-ai/web-animation-skills` (paket yang ditunjuk `iart-ai/motion-skills`). Semua diklon dangkal dan dibaca; tidak ada installer, hook, atau skrip pihak ketiga yang dijalankan, kecuali `ui-ux-pro-max/scripts/search.py` setelah impor-nya diperiksa (hanya pustaka standar).

Otoritas tetap: PRD/blueprint > prototipe > DESIGN-SYSTEM.md > skill. Skill hanya alat kritik.

## Ringkasan keputusan

| Repositori | Commit | Lisensi | Keputusan | Alasan |
|---|---|---|---|---|
| `pbakaus/impeccable` | `b49177d` | Apache-2.0 + NOTICE | Dipasang sebagian | Punya varian `.devin/skills`. Rubrik kritik dan referensi polish berguna. Launcher mengunduh binary engine (terverifikasi checksum) dari GitHub Releases dan plugin-nya memasang hook di setiap edit; keduanya tidak dipasang |
| `nextlevelbuilder/ui-ux-pro-max-skill` | `f76d165` | MIT | Dipasang | Basis data CSV lokal + pencarian Python tanpa dependensi dan tanpa jaringan. Rekomendasi palet/font/gaya generik TIDAK dipakai; yang dipakai domain `ux` dan aksesibilitas |
| `GoogleChrome/modern-web-guidance` | `64a6d70` | Apache-2.0 | Dipasang (panduan lokal) | 209 panduan Markdown ikut tersalin. Alur resminya `npx -y modern-web-guidance@latest` (unduh dari npm, tidak dipin); tidak dijalankan |
| `iart-ai/motion-skills` | `e8ba1f4` | MIT | Tidak dipasang | Hanya indeks 19 paket; tidak berisi SKILL.md |
| `iart-ai/web-animation-skills` | `ed3a045` | MIT | 5 dari 9 modul | Dipasang: `micro-interaction`, `page-transition-animation`, `glassmorphism`, `accessible-animation`, `60fps-animation`. Dilewati: `gsap-web`, `lottie-animation`, `svg-animation`, `ascii-animation` (butuh pustaka yang tidak dipakai Ata) |
| `zanwei/design-dna` | `593e39b` | MIT | Dipasang | Skema analisis referensi visual. Skrip ukur warna butuh `npm install sharp` di folder skill; belum dijalankan |
| `CloudAI-X/threejs-skills` | `0e18186` | MIT | Tidak dipasang | 13 skill, 9 namanya bentrok dengan suite `emiliodominguez/threejs-skills` yang sudah ada dan sama-sama menarget r186. Yang baru hanya `postprocessing`, `shaders`, `geometry`, `lighting`/`materials` terpisah; dievaluasi lagi saat Study Room 3D dimulai |
| `greensock/gsap-skills` | `aed9cfd` | MIT | Tidak dipasang | Bersih (tanpa skrip/hook), tetapi hanya berguna bila GSAP menjadi dependensi runtime, yang belum disetujui |
| `haider-nawaz/liquid-glass-skill` | `2c1b278` | Tidak ada berkas lisensi | Tidak dipasang | Untuk SwiftUI/iOS 26, bukan web; tanpa lisensi |
| `kajisho5/ffmpeg-skill` | `39b9143` | MIT | Tidak dipasang | 64 MB, punya server MCP; tidak relevan dengan UI Ata saat ini |
| `openai/codex-security` | `dcb270c` | Apache-2.0 | Tidak dipasang | CLI/SDK untuk Codex dengan hook dan telemetri; bukan skill mandiri. Devin punya Code Scan sendiri |
| `JuliusBrussee/caveman` | `a192894` | Apache-2.0 + MIT | Tidak dipasang | Installer, hook, proxy, dan telemetri; mengubah gaya jawaban agen, bukan kualitas produk |
| `Jakeschincariol/arena-skill` | `df07b8e` | MIT | Tidak dipasang | Alur perbandingan multi-agen; tidak terkait desain Ata |
| `AThevon/genjutsu` | `a22540b` | MIT | Tidak dipasang | Pipeline "art direction" yang mengganti identitas visual dan menyalin ulang `ui-ux-pro-max`, GSAP, dan Three.js; bertentangan dengan aturan prototipe sebagai otoritas |

## Pemeriksaan keamanan untuk yang dipasang

| Skill | Skrip | Jaringan | Telemetri | Hook | Dependensi |
|---|---|---|---|---|---|
| `impeccable` | Tidak disalin | Tidak ada (launcher tidak disalin) | Tidak ada di berkas yang disalin | Tidak disalin | Tidak ada |
| `ui-ux-pro-max` | 6 berkas Python | Tidak ada | Tidak ada | Tidak ada | Python 3 standar |
| `modern-web-guidance` | Tidak ada | Hanya bila `npx` dijalankan | Tidak diperiksa (CLI tidak dijalankan) | Tidak ada | Tidak ada untuk panduan lokal |
| 5 modul web-animation | Tidak ada | Tidak ada | Tidak ada | Tidak ada | Contoh memakai Framer Motion; tidak ditambahkan |
| `design-dna` | 3 berkas Node | Hanya bila `npm install` dijalankan | Tidak ada | Tidak ada | `sharp` (opsional, tidak dipasang) |

Tidak ada dependensi yang ditambahkan ke `package.json`.

## Skill yang sudah ada (25)

Tetap seperti di MANIFEST. Catatan untuk pemakaian ke depan:
- UI Ata sehari-hari: `web-design-guidelines`, `react-best-practices`, ditambah sembilan skill baru.
- Suite Three.js dan game-dev hanya relevan untuk Study Room 3D; versi Three.js (r186 vs r187) masih perlu dikunci sebelum implementasi.

## Keterbatasan

- `impeccable` belum terbukti dimuat dari `.devin/skills/` di sesi ini (indeks sesi masih menunjuk klon yang sudah dihapus).
- `skill_list`/`skill_search` dengan `path` tidak berfungsi di lingkungan ini; lihat MANIFEST.
- Skill baru terbaca sesi lain setelah cabang ini di-merge.
