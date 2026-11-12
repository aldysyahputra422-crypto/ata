# ata

Server MCP lokal (FastMCP) untuk mengendalikan aplikasi kreatif di macOS lewat
AppleScript, JXA (JavaScript for Automation) dan System Events, dipakai dari
Claude Desktop.

Aplikasi yang dikonfigurasi default: **figcraft, Blender, CADcraft, AniCraft,
TextureCraft, vectorcraft** (lihat `apps.json`).

## Persyaratan

- macOS (AppleScript, `osascript` dan System Events hanya ada di macOS)
- Python 3.10 atau lebih baru
- Claude Desktop
- Aplikasi target sudah terpasang

## Instalasi

```bash
./setup.sh
```

Skrip ini membuat `.venv`, memasang `fastmcp==2.14.7` dari `requirements.txt`,
mengecek server, lalu mencetak konfigurasi Claude Desktop.

## Konfigurasi Claude Desktop

Cara otomatis (menggabungkan ke config yang sudah ada, dibuatkan backup `.bak`):

```bash
.venv/bin/python print_claude_config.py --write
```

Atau tambahkan manual ke `~/Library/Application Support/Claude/claude_desktop_config.json`
(contoh lengkap ada di `claude_desktop_config.example.json`, ganti path-nya):

```json
{
  "mcpServers": {
    "creative-apps": {
      "command": "/ABSOLUTE/PATH/TO/ata/.venv/bin/python",
      "args": [
        "/ABSOLUTE/PATH/TO/ata/server.py"
      ],
      "env": {
        "BLENDER_BIN": "/Applications/Blender.app/Contents/MacOS/Blender"
      }
    }
  }
}
```

Setelah itu tutup Claude Desktop sepenuhnya (Cmd+Q) lalu buka lagi.

## Izin macOS (wajib)

Claude Desktop yang menjalankan server, jadi izin diberikan ke **Claude**:

1. **Automation** — *System Settings → Privacy & Security → Automation*:
   izinkan Claude mengendalikan setiap aplikasi target dan System Events.
   macOS biasanya menampilkan dialog ini saat pertama kali tool dipanggil.
2. **Accessibility** — *System Settings → Privacy & Security → Accessibility*:
   tambahkan Claude. Dibutuhkan untuk `keystroke`, `key_code`, `menu_click`,
   dan `list_menus`.

## Mengatur nama aplikasi

Nama di `apps.json` harus sama dengan nama yang dipakai macOS. Jika berbeda
(mis. kapitalisasi atau nama bundle), cari nama persisnya lalu ubah `apps.json`:

- Tanya Claude: *"cari aplikasi yang mengandung 'craft'"* → memanggil `find_installed_apps`
- Atau cek manual: `ls /Applications | grep -i craft`

Tool apa pun juga menerima nama app langsung, jadi `app: "CADcraft"` tetap bisa dipakai
walau belum ada di `apps.json`.

## Tool yang tersedia

| Tool | Fungsi |
|---|---|
| `list_apps` | Status tiap app di `apps.json`: terpasang? berjalan? |
| `find_installed_apps` | Cari nama `.app` terpasang |
| `get_frontmost_app` | App yang sedang di depan |
| `activate_app` / `quit_app` | Aktifkan atau tutup app |
| `open_document` | Buka file dengan app tertentu (`open -a`) |
| `list_menus` | Lihat struktur menu bar (untuk mencari jalur menu) |
| `menu_click` | Klik item menu, mis. `["File", "Export", "STL"]` |
| `keystroke` | Ketik teks, dengan modifier `command/shift/option/control` |
| `key_code` | Tekan tombol berdasarkan key code (36=Return, 53=Escape, ...) |
| `run_applescript` | Jalankan AppleScript mentah, opsional di dalam `tell application` |
| `run_jxa` | Jalankan JXA; variabel `APP` dan `ARGS` tersedia |
| `blender_run_python` | Jalankan skrip `bpy` di Blender mode headless |
| `blender_render_still` | Render satu frame `.blend` ke file PNG/EXR, dll. |

### Catatan per aplikasi

- **Blender** tidak punya kamus AppleScript. Kontrol yang andal lewat
  `blender_run_python` / `blender_render_still` (Python mode headless),
  bukan lewat AppleScript.
- **Aplikasi lain**: apakah bisa dikendalikan AppleScript tergantung apakah
  aplikasinya menyediakan kamus skrip. Cek di *Script Editor → File → Open Dictionary…*.
  Jika ada kamus, pakai `run_applescript` atau `run_jxa` dengan `app`.
  Jika tidak ada, pakai `menu_click` dan `keystroke`.

## Menjalankan test

```bash
.venv/bin/python -m unittest -v test_server
```

Test di atas memverifikasi pendaftaran tool, pembentukan skrip, dan pengiriman
argumen (aman dari injeksi) dengan `osascript` tiruan. Eksekusi AppleScript
sungguhan hanya bisa diuji langsung di macOS.

## Keamanan

`run_applescript`, `run_jxa`, dan `blender_run_python` menjalankan kode arbitrer
dengan hak akses akun Anda. Server ini hanya boleh dijalankan di mesin Anda sendiri,
dan hanya oleh klien yang Anda percaya.

## Batasan yang perlu diketahui

- Kode ini ditulis dan diuji strukturnya di Linux (pendaftaran tool, argumen,
  sintaks JXA, transport stdio, jalur Blender dengan binary tiruan). **Eksekusi
  AppleScript/JXA sungguhan belum diuji di macOS.** Jalankan `list_apps` dan
  satu tool sederhana (`activate_app`) dulu untuk memastikan izin dan nama app sudah benar.
- Dukungan AppleScript untuk figcraft, CADcraft, AniCraft, TextureCraft, dan
  vectorcraft belum diverifikasi. Gunakan `list_menus` atau kamus skrip app
  untuk melihat kemampuannya.
- `menu_click` dan `keystroke` bergantung pada nama menu dan bahasa UI app.
  Jika UI memakai bahasa Indonesia, label menu harus sesuai dengan itu.
- Blender bisa menampilkan dialog simpan saat `quit_app`. Simpan dokumen dulu.
