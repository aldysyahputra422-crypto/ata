# Manifest skills proyek

Diperiksa 2026-11-22 di worktree cabang `research/immersive-experience-recovery`. Setiap skill dipanggil satu per satu dengan `skill_invoke`; kolom terakhir mencatat hasilnya. Folder disalin utuh dari sumber (SKILL.md, `references/`, `scripts/`, `assets/`, `agents/`). Lisensi sumber ada di `_licenses/`.

| Skill | Repository sumber | Commit | Lisensi | Jumlah berkas | Status verifikasi |
|---|---|---|---|---|---|
| `camera-systems` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/camera-systems/SKILL.md` |
| `create-game-assets` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 11 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/create-game-assets/SKILL.md` |
| `game-feel` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/game-feel/SKILL.md` |
| `game-ui-ux` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/game-ui-ux/SKILL.md` |
| `performance-optimization` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/performance-optimization/SKILL.md` |
| `react-best-practices` | `vercel-labs/agent-skills` | `5a37a63` | MIT menurut README; tanpa berkas LICENSE di sumber | 76 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/react-best-practices/SKILL.md` |
| `router` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 5 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/router/SKILL.md` |
| `threejs` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs/SKILL.md` |
| `threejs-animation` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-animation/SKILL.md` |
| `threejs-asset-pipeline` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-asset-pipeline/SKILL.md` |
| `threejs-fundamentals` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-fundamentals/SKILL.md` |
| `threejs-gltf-loading` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-gltf-loading/SKILL.md` |
| `threejs-interaction` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-interaction/SKILL.md` |
| `threejs-loaders` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-loaders/SKILL.md` |
| `threejs-materials-lighting` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-materials-lighting/SKILL.md` |
| `threejs-model-animate` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 5 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-model-animate/SKILL.md` |
| `threejs-model-fix` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 3 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-model-fix/SKILL.md` |
| `threejs-model-inspect` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 7 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-model-inspect/SKILL.md` |
| `threejs-model-optimize` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 3 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-model-optimize/SKILL.md` |
| `threejs-performance` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-performance/SKILL.md` |
| `threejs-react-three-fiber` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-react-three-fiber/SKILL.md` |
| `threejs-scene-doctor` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 4 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-scene-doctor/SKILL.md` |
| `threejs-scene-setup` | `gamedev-skills/awesome-gamedev-agent-skills` | `c6ca6c4` | Apache-2.0 + NOTICE | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-scene-setup/SKILL.md` |
| `threejs-textures` | `emiliodominguez/threejs-skills` | `ac4464c` | MIT | 1 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/threejs-textures/SKILL.md` |
| `web-design-guidelines` | `vercel-labs/agent-skills` | `5a37a63` | MIT menurut README; tanpa berkas LICENSE di sumber | 2 | Dimuat lewat `skill_invoke`, sumber `.devin/skills/web-design-guidelines/SKILL.md` |

Catatan:
- `react-best-practices`: nama di frontmatter adalah `vercel-react-best-practices`, tetapi Devin mendaftarkannya dengan nama folder.
- `skill_list` dan `skill_search` dengan `path` worktree mengembalikan "No skills found" walau `skill_invoke` berhasil; penyebabnya belum diketahui.
- Skrip yang dijalankan: hanya `threejs-model-inspect/scripts/inspect.mjs --help` (Node v22.23.5). Skrip lain belum dijalankan.
- Tidak ada dependensi runtime (three, @react-three/fiber, @react-three/drei) yang ditambahkan ke `package.json`.
- Sumber menarget rilis Three.js berbeda (threejs-skills r186; gamedev-skills r187). Versi belum dikunci; menunggu keputusan stack.

## Tambahan 2026-11-22: skill desain, UX, web modern, dan animasi

Dipasang di cabang terpisah dari implementasi fitur. Sumber diklon dangkal, diperiksa, lalu disalin; tidak ada installer, hook, atau `npx`/`npm install` pihak ketiga yang dijalankan. Audit lengkap 13 repositori: `docs/audits/skills-desain.md`.

| Skill | Repository sumber | Commit | Lisensi | Jumlah berkas | Yang disalin | Status verifikasi |
|---|---|---|---|---|---|---|
| `impeccable` | `pbakaus/impeccable` (`.devin/skills/impeccable`) | `b49177d` | Apache-2.0 + NOTICE | 51 | `SKILL.md`, `reference/`. `scripts/` TIDAK disalin (launcher mengunduh binary engine dari GitHub Releases) | `skill_invoke` berhasil, tetapi sesi ini memuatnya dari klon sumber yang masih ter-cache, bukan dari `.devin/skills/`. Perlu dicek ulang di sesi baru |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` (`.claude/skills/ui-ux-pro-max`) | `f76d165` | MIT | 48 | `SKILL.md`, `data/`, `references/`, `scripts/` tanpa `scripts/tests/` | Dimuat dari `.devin/skills/ui-ux-pro-max/SKILL.md`; `python3 scripts/search.py "…" --domain ux -n 2` mengembalikan 2 hasil (hanya pustaka standar Python, tanpa jaringan) |
| `modern-web-guidance` | `GoogleChrome/modern-web-guidance` | `64a6d70` | Apache-2.0 | 211 | `SKILL.md`, `guides/` | Dimuat dari `.devin/skills/modern-web-guidance/SKILL.md`. CLI `npx modern-web-guidance@latest` TIDAK dijalankan; panduan dibaca langsung dari `guides/` |
| `micro-interaction` | `iart-ai/web-animation-skills` | `ed3a045` | MIT | 4 | utuh | Dimuat dari `.devin/skills/micro-interaction/SKILL.md` |
| `page-transition-animation` | `iart-ai/web-animation-skills` | `ed3a045` | MIT | 3 | utuh | Dimuat dari `.devin/skills/page-transition-animation/SKILL.md` |
| `glassmorphism` | `iart-ai/web-animation-skills` | `ed3a045` | MIT | 3 | utuh | Dimuat dari `.devin/skills/glassmorphism/SKILL.md` |
| `accessible-animation` | `iart-ai/web-animation-skills` | `ed3a045` | MIT | 3 | utuh | Dimuat dari `.devin/skills/accessible-animation/SKILL.md` |
| `60fps-animation` | `iart-ai/web-animation-skills` | `ed3a045` | MIT | 3 | utuh | Dimuat dari `.devin/skills/60fps-animation/SKILL.md` |
| `design-dna` | `zanwei/design-dna` | `593e39b` | MIT | 7 | `SKILL.md`, `references/`, `scripts/` tanpa `scripts/test/` | Dimuat dari `.devin/skills/design-dna/SKILL.md`. `npm install` (sharp) TIDAK dijalankan, jadi `measure-colors.mjs` belum bisa dipakai |

Aturan pakai:
- Otoritas: PRD dan blueprint, lalu prototipe `ata-prototype`, lalu `docs/DESIGN-SYSTEM.md`, baru skill. Skill hanya alat kritik dan referensi; sarannya tidak boleh mengubah Ambis Violet, tipografi, material kaca, komponen signature, atau pola interaksi.
- Contoh di skill animasi memakai Framer Motion/GSAP. Pakai prinsipnya (transform/opacity, reduced motion, View Transitions) dengan CSS prototipe; jangan menambah dependensi runtime.
- `impeccable`: pakai jalur "Launcher unavailable" di SKILL.md (baca `reference/*.md` langsung). Jangan menyalin atau menjalankan launcher tanpa persetujuan.
- `modern-web-guidance`: cari di `guides/` dengan grep. Menjalankan `npx` mengunduh paket dari npm dan butuh persetujuan.

Temuan `skill_list`/`skill_search`/`skill_invoke` (diselidiki 2026-11-22):
- `skill_list` dan `skill_search` dengan `path` selalu menjawab "No skills found", juga untuk repo uji minimal berisi satu SKILL.md sah di `.devin/skills/`, `.agents/skills/`, dan `.claude/skills/`. Jadi ini bukan masalah format skill kita.
- `skill_invoke` memakai indeks sesi. Skill baru masuk indeks setelah ada perintah shell yang dijalankan di dalam repo; sebelum itu jawabannya "not found".
- Indeks menyimpan jalur lama: skill dari klon sumber yang sudah dihapus masih bisa dimuat. Selalu periksa baris `Source:` pada keluaran `skill_invoke`.
- Klon repositori skill di VM ikut terindeks dan bisa menimpa nama yang sama. Hapus klon setelah audit.
