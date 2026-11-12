#!/usr/bin/env python3
"""
Cetak konfigurasi MCP untuk Claude Desktop dengan path absolut ke proyek ini.

  python print_claude_config.py            # hanya cetak JSON
  python print_claude_config.py --write    # gabungkan ke claude_desktop_config.json (backup dibuat dulu)
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SERVER_NAME = "creative-apps"
CONFIG_PATH = Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"


def build_entry() -> dict:
    venv_python = HERE / ".venv" / "bin" / "python"
    python = venv_python if venv_python.exists() else Path(sys.executable)
    return {
        "command": str(python),
        "args": [str(HERE / "server.py")],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--write", action="store_true",
                        help="gabungkan entri ke claude_desktop_config.json (backup .bak dibuat dulu)")
    args = parser.parse_args()

    entry = build_entry()
    print(json.dumps({"mcpServers": {SERVER_NAME: entry}}, indent=2))

    if not args.write:
        return

    existing: dict = {}
    if CONFIG_PATH.exists():
        raw = CONFIG_PATH.read_text(encoding="utf-8").strip()
        existing = json.loads(raw) if raw else {}
        shutil.copy2(CONFIG_PATH, CONFIG_PATH.with_name(CONFIG_PATH.name + ".bak"))

    existing.setdefault("mcpServers", {})[SERVER_NAME] = entry
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    print(f"\nDitulis ke {CONFIG_PATH}")
    print("Tutup total Claude Desktop (Cmd+Q), lalu buka lagi.")


if __name__ == "__main__":
    main()
