#!/usr/bin/env python3
"""
Server MCP (FastMCP) lokal untuk mengendalikan aplikasi kreatif di macOS
lewat AppleScript, JXA (JavaScript for Automation) dan System Events.

Dijalankan oleh Claude Desktop lewat transport stdio. Lihat README.md.

PERINGATAN: run_applescript, run_jxa dan blender_run_python menjalankan kode
arbitrer dengan hak akses akun macOS Anda. Pasang hanya di mesin Anda sendiri.
"""

import json
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError

HERE = Path(__file__).resolve().parent
APPS_FILE = Path(os.environ.get("CREATIVE_APPS_CONFIG", HERE / "apps.json"))

# Path absolut: Claude Desktop menjalankan server dengan PATH yang terbatas.
OSASCRIPT = "/usr/bin/osascript"
OPEN_CMD = "/usr/bin/open"
BLENDER_BIN = os.environ.get(
    "BLENDER_BIN", "/Applications/Blender.app/Contents/MacOS/Blender"
)

DEFAULT_TIMEOUT = 60
MAX_OUTPUT = 20_000
VALID_MODIFIERS = {
    "command": "command down",
    "shift": "shift down",
    "option": "option down",
    "control": "control down",
}

# Nama default sesuai permintaan. Bisa diubah di apps.json bila nama persis
# di /Applications berbeda (pakai tool find_installed_apps untuk mengeceknya).
DEFAULT_APPS: dict[str, str] = {
    "figcraft": "figcraft",
    "blender": "Blender",
    "cadcraft": "CADcraft",
    "anicraft": "AniCraft",
    "texturecraft": "TextureCraft",
    "vectorcraft": "vectorcraft",
}


def _log(msg: str) -> None:
    # stdout dipakai protokol MCP, jadi semua log harus ke stderr.
    print(msg, file=sys.stderr)


def _load_apps() -> dict[str, str]:
    apps = dict(DEFAULT_APPS)
    if APPS_FILE.exists():
        try:
            data = json.loads(APPS_FILE.read_text(encoding="utf-8"))
            apps.update({str(k).lower(): str(v) for k, v in data.items()})
        except (OSError, ValueError, AttributeError) as exc:
            _log(f"[creative-apps] gagal membaca {APPS_FILE}: {exc}; pakai default")
    return apps


APPS = _load_apps()


def _resolve_app(app: str) -> str:
    """Terima key dari apps.json (mis. 'cadcraft') atau nama app langsung ('CADcraft')."""
    name = (app or "").strip()
    if not name:
        raise ToolError("Nama aplikasi kosong.")
    return APPS.get(name.lower(), name)


# ---------------------------------------------------------------------------
# Eksekusi proses
# ---------------------------------------------------------------------------

def _require_macos() -> None:
    if platform.system() != "Darwin":
        raise ToolError(
            "Tool ini butuh macOS (osascript / System Events). "
            f"Server ini berjalan di: {platform.system()}."
        )


def _exec(
    cmd: list[str],
    timeout: int = DEFAULT_TIMEOUT,
    env: Optional[dict[str, str]] = None,
) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, env=env, check=False
        )
    except subprocess.TimeoutExpired as exc:
        raise ToolError(f"Timeout setelah {timeout} detik: {cmd[0]}") from exc
    except FileNotFoundError as exc:
        raise ToolError(f"Program tidak ditemukan: {cmd[0]}") from exc


def _clip(text: str, limit: int = MAX_OUTPUT) -> str:
    text = text or ""
    return text if len(text) <= limit else "...[dipotong]...\n" + text[-limit:]


def _osascript(
    source: str,
    language: str = "AppleScript",
    args: Optional[list[str]] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> str:
    """Jalankan source AppleScript/JXA. Argumen dikirim sebagai argv, bukan
    di-interpolasi ke dalam source, supaya tidak ada injeksi kode."""
    _require_macos()
    suffix = ".js" if language == "JavaScript" else ".applescript"
    fd, path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(source)
        cmd = [OSASCRIPT]
        if language == "JavaScript":
            cmd += ["-l", "JavaScript"]
        cmd += [path, *(args or [])]
        proc = _exec(cmd, timeout)
    finally:
        os.unlink(path)

    if proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip()
        raise ToolError(f"osascript gagal (exit {proc.returncode}): {detail}")
    return _clip(proc.stdout.strip())


# ---------------------------------------------------------------------------
# Template AppleScript / JXA
# ---------------------------------------------------------------------------

AS_ACTIVATE = """on run argv
	set appName to item 1 of argv
	tell application appName to activate
	return "ok"
end run
"""

AS_QUIT = """on run argv
	set appName to item 1 of argv
	tell application appName to quit
	return "ok"
end run
"""

# __USING__ diganti oleh _using_clause() dari daftar modifier yang sudah divalidasi.
AS_KEYSTROKE = """on run argv
	set appName to item 1 of argv
	set keyText to item 2 of argv
	tell application appName to activate
	delay 0.3
	tell application "System Events"
		tell process appName
			keystroke keyText__USING__
		end tell
	end tell
	return "ok"
end run
"""

AS_KEY_CODE = """on run argv
	set appName to item 1 of argv
	set keyNum to (item 2 of argv) as integer
	tell application appName to activate
	delay 0.3
	tell application "System Events"
		tell process appName
			key code keyNum__USING__
		end tell
	end tell
	return "ok"
end run
"""

# Klik item menu bertingkat, mis. ["File", "Export", "STL"].
AS_MENU_CLICK = """on run argv
	set appName to item 1 of argv
	set pathItems to rest of argv
	tell application appName to activate
	delay 0.3
	tell application "System Events"
		tell process appName
			set frontmost to true
			set holder to menu bar 1
			set theItem to missing value
			set depth to count of pathItems
			repeat with i from 1 to depth
				set lbl to item i of pathItems
				if i = 1 then
					set theItem to menu bar item lbl of holder
				else
					set theItem to menu item lbl of holder
				end if
				if i < depth then set holder to menu 1 of theItem
			end repeat
			click theItem
		end tell
	end tell
	return "ok"
end run
"""

JS_LIST_MENUS = """function run(argv) {
  const proc = Application("System Events").processes.byName(argv[0]);
  const out = {};
  proc.menuBars[0].menuBarItems().forEach(function (mb) {
    const items = [];
    try {
      mb.menus[0].menuItems().forEach(function (mi) {
        items.push(mi.name() || "---");
      });
    } catch (e) {}
    out[mb.name() || ""] = items;
  });
  return JSON.stringify(out);
}
"""

JS_LIST_PROCESSES = """function run() {
  return JSON.stringify(Application("System Events").processes.name());
}
"""

JS_FRONTMOST = """function run() {
  return Application("System Events").processes.whose({frontmost: true})[0].name();
}
"""

JXA_HEADER = (
    "function run(argv) {\n"
    "  const APP_NAME = argv[0] || null;\n"
    "  const APP = APP_NAME ? Application(APP_NAME) : null;\n"
    "  const ARGS = argv.slice(1);\n"
)


def _as_wrap(body: str, with_app: bool) -> str:
    """Bungkus kode AppleScript dari user. Jika with_app, body berjalan di dalam
    `tell application <app>`; jika tidak, body berjalan langsung."""
    if with_app:
        indented = "\n".join("\t\t" + line for line in body.splitlines())
        return (
            "on run argv\n"
            "\tset appName to item 1 of argv\n"
            "\ttell application appName\n"
            f"{indented}\n"
            "\tend tell\n"
            "end run\n"
        )
    return "on run argv\n" + body + "\nend run\n"


def _using_clause(modifiers: Optional[list[str]]) -> str:
    if not modifiers:
        return ""
    parts = []
    for m in modifiers:
        key = str(m).strip().lower()
        if key not in VALID_MODIFIERS:
            raise ToolError(
                f"Modifier tidak dikenal: {m!r}. Pilih: {', '.join(VALID_MODIFIERS)}."
            )
        parts.append(VALID_MODIFIERS[key])
    return " using {" + ", ".join(parts) + "}"


def _app_bundles() -> list[Path]:
    """Kumpulkan .app di folder standar (sekali turun satu level untuk folder suite)."""
    found: list[Path] = []
    for base in (Path("/Applications"), Path("/System/Applications"), Path.home() / "Applications"):
        try:
            if not base.is_dir():
                continue
            for entry in base.iterdir():
                if entry.suffix == ".app":
                    found.append(entry)
                elif entry.is_dir():
                    found.extend(c for c in entry.iterdir() if c.suffix == ".app")
        except OSError:
            continue
    return found


def _running_process_names() -> list[str]:
    return json.loads(_osascript(JS_LIST_PROCESSES, "JavaScript"))


# ---------------------------------------------------------------------------
# Blender (tidak punya kamus AppleScript; kontrol lewat Python mode headless)
# ---------------------------------------------------------------------------

RENDER_SCRIPT = """import os
import bpy

out = os.environ["CREATIVE_MCP_RENDER_OUT"]
frame = os.environ.get("CREATIVE_MCP_RENDER_FRAME", "")
scene = bpy.context.scene
if frame:
    scene.frame_set(int(frame))
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("RENDERED", out)
"""


def _blender_path() -> str:
    if not Path(BLENDER_BIN).exists():
        raise ToolError(
            f"Blender tidak ditemukan di {BLENDER_BIN}. "
            "Set variabel env BLENDER_BIN ke executable Blender."
        )
    return BLENDER_BIN


def _run_blender_script(
    code: str,
    blend_file: Optional[str],
    timeout: int,
    env: Optional[dict[str, str]] = None,
) -> dict:
    blender = _blender_path()
    cmd = [blender, "-b"]
    if blend_file:
        blend = Path(blend_file).expanduser()
        if not blend.exists():
            raise ToolError(f"File .blend tidak ditemukan: {blend}")
        cmd.append(str(blend.resolve()))
    cmd += ["--python-exit-code", "1"]

    fd, script_path = tempfile.mkstemp(suffix=".py")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(code)
        cmd += ["--python", script_path]
        proc = _exec(cmd, timeout, env={**os.environ, **(env or {})})
    finally:
        os.unlink(script_path)

    result = {
        "returncode": proc.returncode,
        "stdout": _clip(proc.stdout),
        "stderr": _clip(proc.stderr),
    }
    if proc.returncode != 0:
        raise ToolError(
            f"Blender keluar dengan kode {proc.returncode}: "
            f"{_clip(proc.stderr or proc.stdout, 4000)}"
        )
    return result


# ---------------------------------------------------------------------------
# MCP server dan tool
# ---------------------------------------------------------------------------

mcp = FastMCP("creative-apps")


@mcp.tool
def list_apps() -> dict:
    """Tampilkan aplikasi yang dikonfigurasi (apps.json): nama, apakah terpasang,
    lokasi bundle, dan apakah sedang berjalan."""
    bundles = {p.stem.lower(): p for p in _app_bundles()}
    try:
        running: Optional[set[str]] = {n.lower() for n in _running_process_names()}
    except ToolError:
        running = None

    apps = []
    for key, name in APPS.items():
        bundle = bundles.get(name.lower())
        apps.append({
            "key": key,
            "name": name,
            "installed": bundle is not None,
            "path": str(bundle) if bundle else None,
            "running": None if running is None else name.lower() in running,
        })
    return {"config": str(APPS_FILE), "platform": platform.system(), "apps": apps}


@mcp.tool
def find_installed_apps(query: str = "") -> list[dict]:
    """Cari aplikasi .app terpasang yang namanya mengandung `query` (kosong = semua).
    Gunakan ini untuk menemukan nama persis yang dipakai macOS, lalu isi apps.json."""
    q = query.strip().lower()
    matches = [
        {"name": p.stem, "path": str(p)}
        for p in _app_bundles()
        if q in p.stem.lower()
    ]
    matches.sort(key=lambda m: m["name"].lower())
    return matches[:300]


@mcp.tool
def get_frontmost_app() -> str:
    """Nama aplikasi yang sedang aktif (di depan)."""
    _require_macos()
    return _osascript(JS_FRONTMOST, "JavaScript")


@mcp.tool
def activate_app(app: str) -> str:
    """Bawa aplikasi ke depan (atau jalankan jika belum berjalan)."""
    name = _resolve_app(app)
    _osascript(AS_ACTIVATE, args=[name])
    return f"{name} diaktifkan."


@mcp.tool
def quit_app(app: str) -> str:
    """Tutup aplikasi lewat perintah `quit`. Dokumen yang belum disimpan bisa memunculkan dialog."""
    name = _resolve_app(app)
    _osascript(AS_QUIT, args=[name])
    return f"{name} ditutup."


@mcp.tool
def open_document(app: str, path: str) -> str:
    """Buka file (mis. .blend, .stl, .svg, .fbx) dengan aplikasi tertentu: `open -a <app> <file>`."""
    _require_macos()
    target = Path(path).expanduser()
    if not target.exists():
        raise ToolError(f"File tidak ditemukan: {target}")
    name = _resolve_app(app)
    proc = _exec([OPEN_CMD, "-a", name, str(target.resolve())])
    if proc.returncode != 0:
        raise ToolError(f"open gagal: {proc.stderr.strip()}")
    return f"Membuka {target.name} dengan {name}."


@mcp.tool
def list_menus(app: str) -> dict:
    """Daftar menu bar aplikasi beserta item tingkat pertama (mis. {"File": ["New", "Open", ...]}).
    Gunakan ini untuk mencari jalur menu sebelum memanggil menu_click. Butuh izin Accessibility."""
    name = _resolve_app(app)
    return json.loads(_osascript(JS_LIST_MENUS, "JavaScript", args=[name]))


@mcp.tool
def menu_click(app: str, menu_path: list[str]) -> str:
    """Klik item menu lewat System Events. `menu_path` adalah jalur bertingkat,
    mis. ["File", "Export", "STL"]. Berguna untuk aplikasi tanpa kamus AppleScript.
    Butuh izin Accessibility."""
    if not menu_path or len(menu_path) > 6:
        raise ToolError("menu_path harus berisi 1–6 label menu.")
    name = _resolve_app(app)
    _osascript(AS_MENU_CLICK, args=[name, *menu_path])
    return f"Diklik: {' > '.join(menu_path)} di {name}."


@mcp.tool
def keystroke(app: str, text: str, modifiers: Optional[list[str]] = None) -> str:
    """Ketik teks ke aplikasi (UI scripting). Modifier: command, shift, option, control.
    Contoh Cmd+S: text='s', modifiers=['command']. Butuh izin Accessibility."""
    if not text:
        raise ToolError("text kosong.")
    name = _resolve_app(app)
    src = AS_KEYSTROKE.replace("__USING__", _using_clause(modifiers))
    _osascript(src, args=[name, text])
    return f"Mengetik di {name}."


@mcp.tool
def key_code(app: str, code: int, modifiers: Optional[list[str]] = None) -> str:
    """Tekan tombol berdasarkan key code macOS, mis. 36=Return, 53=Escape, 48=Tab,
    49=Spasi, 51=Delete, 123–126=panah kiri/kanan/bawah/atas. Butuh izin Accessibility."""
    if not isinstance(code, int) or not 0 <= code <= 127:
        raise ToolError("code harus bilangan bulat 0–127.")
    name = _resolve_app(app)
    src = AS_KEY_CODE.replace("__USING__", _using_clause(modifiers))
    _osascript(src, args=[name, str(code)])
    return f"Menekan key code {code} di {name}."


@mcp.tool
def run_applescript(script: str, app: Optional[str] = None) -> str:
    """Jalankan AppleScript mentah dan kembalikan hasilnya (stdout).
    Tulis kode biasa tanpa `on run`. Jika `app` diisi, kode dijalankan di dalam
    `tell application <app>`. Contoh: script='get name of front window', app='Blender'."""
    name = _resolve_app(app) if app else ""
    return _osascript(_as_wrap(script, with_app=bool(app)), args=[name])


@mcp.tool
def run_jxa(script: str, app: Optional[str] = None, args: Optional[list[str]] = None) -> str:
    """Jalankan JavaScript for Automation (JXA) dan kembalikan nilai `return`-nya sebagai teks.
    Kode berada di dalam `function run(argv)`. Variabel yang tersedia:
      APP  = objek Application(app) jika `app` diisi, jika tidak null
      ARGS = daftar `args` tambahan
    Untuk hasil terstruktur, `return JSON.stringify(...)`."""
    name = _resolve_app(app) if app else ""
    body = script if script.endswith("\n") else script + "\n"
    src = JXA_HEADER + body + "}\n"
    return _osascript(src, "JavaScript", args=[name, *(args or [])])


@mcp.tool
def blender_run_python(
    script: str, blend_file: Optional[str] = None, timeout: int = 600
) -> dict:
    """Jalankan skrip Python bpy di Blender mode headless (-b), opsional setelah membuka
    file .blend. Ini jalur kontrol Blender yang andal (Blender tidak punya kamus AppleScript).
    Contoh script: 'import bpy; bpy.ops.mesh.primitive_cube_add(); bpy.ops.wm.save_as_mainfile(filepath="/tmp/x.blend")'.
    Lokasi binary: env BLENDER_BIN (default /Applications/Blender.app/Contents/MacOS/Blender)."""
    return _run_blender_script(script, blend_file, timeout)


@mcp.tool
def blender_render_still(
    blend_file: str,
    output_path: str,
    frame: Optional[int] = None,
    timeout: int = 900,
) -> dict:
    """Render satu frame dari file .blend ke `output_path` (mis. /Users/you/out.png).
    `frame` opsional; kosong = frame saat ini di file."""
    out = Path(output_path).expanduser()
    if not out.is_absolute():
        raise ToolError("output_path harus berupa path absolut.")
    out.parent.mkdir(parents=True, exist_ok=True)
    env = {
        "CREATIVE_MCP_RENDER_OUT": str(out),
        "CREATIVE_MCP_RENDER_FRAME": "" if frame is None else str(int(frame)),
    }
    result = _run_blender_script(RENDER_SCRIPT, blend_file, timeout, env=env)
    result["output"] = str(out)
    return result


if __name__ == "__main__":
    _log(f"[creative-apps] konfigurasi: {APPS_FILE} ({len(APPS)} app)")
    mcp.run(show_banner=False)
