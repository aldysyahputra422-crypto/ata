import { describe, expect, it } from "vitest";
import { BOOT_SCRIPT, STORAGE } from "@/lib/fx/prefs";
import { mockMatchMedia } from "./setup";

const WIDE = "(min-width: 1024px)";
const MOUSE = "(hover: hover) and (pointer: fine)";

function boot() {
  new Function(BOOT_SCRIPT)();
  return document.documentElement.dataset;
}

// The inline <head> script must agree with resolveFx/defaultGlass so the first paint is never wrong.
describe("BOOT_SCRIPT", () => {
  it("defaults to light theme, full glass, minimal effects on a phone", () => {
    mockMatchMedia([]);
    const d = boot();
    expect(d.theme).toBe("light");
    expect(d.glass).toBe("full");
    expect(d.fx).toBe("minimal");
  });

  it("follows the system dark preference when no theme is stored", () => {
    mockMatchMedia(["(prefers-color-scheme: dark)"]);
    expect(boot().theme).toBe("dark");
  });

  it("applies stored preferences", () => {
    mockMatchMedia([WIDE, MOUSE, "(prefers-color-scheme: dark)"]);
    localStorage.setItem(STORAGE.theme, "light");
    localStorage.setItem(STORAGE.glass, "off");
    localStorage.setItem(STORAGE.fx, "minimal");
    const d = boot();
    expect(d.theme).toBe("light");
    expect(d.glass).toBe("off");
    expect(d.fx).toBe("minimal");
  });

  it("is rich on desktop, unless the governor degraded this session", () => {
    mockMatchMedia([WIDE, MOUSE]);
    expect(boot().fx).toBe("rich");
    sessionStorage.setItem(STORAGE.fxSession, "minimal-auto");
    expect(boot().fx).toBe("minimal");
  });

  it("ignores garbage values in storage", () => {
    mockMatchMedia([]);
    localStorage.setItem(STORAGE.theme, "<script>");
    localStorage.setItem(STORAGE.glass, "ultra");
    const d = boot();
    expect(d.theme).toBe("light");
    expect(d.glass).toBe("full");
  });
});
