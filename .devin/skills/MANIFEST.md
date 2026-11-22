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
