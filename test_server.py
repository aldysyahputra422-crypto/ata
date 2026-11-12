"""
Test ringan untuk server.py. Dijalankan dengan:  python -m unittest -v test_server

Sebagian besar test berjalan di Linux/macOS. Test yang menyentuh osascript
sungguhan hanya berjalan di macOS (di-skip di tempat lain).
"""

import asyncio
import os
import platform
import stat
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from fastmcp import Client
from fastmcp.exceptions import ToolError

import server

EXPECTED_TOOLS = {
    "list_apps", "find_installed_apps", "get_frontmost_app", "activate_app",
    "quit_app", "open_document", "list_menus", "menu_click", "keystroke",
    "key_code", "run_applescript", "run_jxa", "blender_run_python",
    "blender_render_still",
}


class RegistrationTests(unittest.TestCase):
    def test_all_tools_registered(self):
        async def names():
            async with Client(server.mcp) as client:
                return {t.name for t in await client.list_tools()}

        self.assertEqual(asyncio.run(names()), EXPECTED_TOOLS)

    def test_default_apps_cover_requested_list(self):
        for key in ("figcraft", "blender", "cadcraft", "anicraft", "texturecraft", "vectorcraft"):
            self.assertIn(key, server.DEFAULT_APPS)


class HelperTests(unittest.TestCase):
    def test_resolve_app_by_key_and_by_name(self):
        self.assertEqual(server._resolve_app("blender"), "Blender")
        self.assertEqual(server._resolve_app("Blender"), "Blender")
        self.assertEqual(server._resolve_app("SomeOtherApp"), "SomeOtherApp")

    def test_resolve_app_rejects_empty(self):
        with self.assertRaises(ToolError):
            server._resolve_app("   ")

    def test_using_clause(self):
        self.assertEqual(server._using_clause(None), "")
        self.assertEqual(
            server._using_clause(["Command", "shift"]),
            " using {command down, shift down}",
        )
        with self.assertRaises(ToolError):
            server._using_clause(["hyper"])

    def test_as_wrap_with_app_nests_body_in_tell(self):
        src = server._as_wrap("return name", with_app=True)
        self.assertIn("tell application appName", src)
        self.assertIn("\t\treturn name", src)
        self.assertTrue(src.rstrip().endswith("end run"))

    def test_as_wrap_without_app(self):
        src = server._as_wrap("return 1", with_app=False)
        self.assertNotIn("tell application", src)
        self.assertIn("return 1", src)

    def test_macos_only_tools_fail_clearly_off_macos(self):
        if platform.system() == "Darwin":
            self.skipTest("hanya relevan di luar macOS")
        with self.assertRaises(ToolError) as ctx:
            server._osascript("return 1")
        self.assertIn("macOS", str(ctx.exception))


class OsascriptArgvTests(unittest.TestCase):
    """Memastikan argumen dikirim sebagai argv (aman dari injeksi), memakai stub osascript."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.record = self.tmp / "record.txt"
        stub = self.tmp / "osascript_stub"
        stub.write_text(
            "#!/usr/bin/env bash\n"
            f'{{ for a in "$@"; do echo "[$a]"; done; }} > "{self.record}"\n'
            "echo ok\n"
        )
        stub.chmod(stub.stat().st_mode | stat.S_IEXEC)
        self.patches = [
            mock.patch.object(server, "OSASCRIPT", str(stub)),
            mock.patch.object(server.platform, "system", return_value="Darwin"),
        ]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        for f in self.tmp.iterdir():
            f.unlink()
        self.tmp.rmdir()

    def test_app_name_with_shell_metacharacters_stays_one_argument(self):
        evil = 'CAD"craft; rm -rf ~'
        server.activate_app.fn(evil)
        args = self.record.read_text().splitlines()
        self.assertIn(f"[{evil}]", args)
        self.assertEqual(sum(1 for a in args if a.startswith("[/")), 1)  # hanya satu path skrip

    def test_javascript_uses_dash_l(self):
        server._osascript(server.JS_FRONTMOST, "JavaScript")
        args = self.record.read_text().splitlines()
        self.assertEqual(args[:2], ["[-l]", "[JavaScript]"])


class BlenderTests(unittest.TestCase):
    def test_missing_blender_binary_is_reported(self):
        with mock.patch.object(server, "BLENDER_BIN", "/nonexistent/Blender"):
            with self.assertRaises(ToolError) as ctx:
                server.blender_run_python.fn("import bpy")
        self.assertIn("BLENDER_BIN", str(ctx.exception))

    def test_render_requires_absolute_output_path(self):
        with self.assertRaises(ToolError):
            server.blender_render_still.fn("/tmp/x.blend", "relative/out.png")


if __name__ == "__main__":
    unittest.main()
