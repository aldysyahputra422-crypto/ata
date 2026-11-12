#!/usr/bin/env bash
# Setup sekali jalan (macOS): buat venv, pasang FastMCP, cek server, cetak config Claude Desktop.
set -euo pipefail
cd "$(dirname "$0")"

PY="${PYTHON:-python3}"
"$PY" -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt
.venv/bin/python -c "import fastmcp, sys; print('FastMCP terpasang, Python', sys.version.split()[0])"
.venv/bin/python -m py_compile server.py && echo "server.py OK"

echo
echo "Config untuk Claude Desktop (tambahkan --write untuk menulisnya otomatis):"
.venv/bin/python print_claude_config.py
