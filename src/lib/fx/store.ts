"use client";
// Tiny external store for the three appearance preferences (theme, glass, effects).
// It owns the <html> data-* attributes described in docs/DESIGN-SYSTEM.md 11.2.
import { startFxGovernor } from "./governor";
import { attachPointerFx } from "./pointer";
import { defaultGlass, FX_PREFS, GLASS_PREFS, isOneOf, STORAGE, THEME_PREFS, type GlassPref, type ThemePref } from "./prefs";
import { isChromium, resolveFx, type FxLevel, type FxPref } from "./resolve-fx";

export type FxState = {
  theme: ThemePref;
  glass: GlassPref;
  fx: FxPref;
  /** resolved tier actually applied to <html data-fx> */
  level: FxLevel;
  /** true when the governor lowered effects this session */
  degraded: boolean;
  ready: boolean;
};

const SERVER_STATE: FxState = { theme: "auto", glass: "full", fx: "auto", level: "minimal", degraded: false, ready: false };

let state: FxState = SERVER_STATE;
const listeners = new Set<() => void>();
let onDegradeNotice: (() => void) | null = null;
let stopGovernor: (() => void) | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: preference lasts for this page only */
  }
}
function session(action: "get" | "set" | "clear"): string | null {
  try {
    if (action === "get") return sessionStorage.getItem(STORAGE.fxSession);
    if (action === "set") sessionStorage.setItem(STORAGE.fxSession, "minimal-auto");
    else sessionStorage.removeItem(STORAGE.fxSession);
  } catch {
    /* ignore */
  }
  return null;
}

function computeLevel(fx: FxPref, degraded: boolean): FxLevel {
  if (fx === "auto" && degraded) return "minimal";
  return resolveFx(fx);
}

function apply(next: FxState) {
  const d = document.documentElement;
  const theme =
    next.theme === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next.theme;
  d.dataset.theme = theme;
  d.dataset.glass = next.glass;
  d.dataset.fx = next.level;
  if (next.level === "rich" && isChromium()) d.dataset.refract = "on";
  else delete d.dataset.refract;
}

function set(patch: Partial<FxState>) {
  const merged = { ...state, ...patch };
  merged.level = computeLevel(merged.fx, merged.degraded);
  state = merged;
  apply(state);
  listeners.forEach((l) => l());
}

function runGovernor() {
  stopGovernor?.();
  stopGovernor = null;
  // Respect an explicit "rich" choice: never auto-degrade it (DESIGN-SYSTEM 6.9).
  if (state.level !== "rich" || state.fx === "rich") return;
  stopGovernor = startFxGovernor(() => {
    session("set");
    set({ degraded: true });
    onDegradeNotice?.();
  });
}

export const fxStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  getServer: () => SERVER_STATE,

  /** Call once on the client. Returns a cleanup function. */
  init(opts: { onDegrade?: () => void } = {}) {
    onDegradeNotice = opts.onDegrade ?? null;
    const theme = read(STORAGE.theme);
    const glass = read(STORAGE.glass);
    const fx = read(STORAGE.fx);
    set({
      theme: isOneOf(THEME_PREFS, theme) ? theme : "auto",
      glass: isOneOf(GLASS_PREFS, glass) ? glass : defaultGlass(),
      fx: isOneOf(FX_PREFS, fx) ? fx : "auto",
      degraded: session("get") === "minimal-auto",
      ready: true,
    });

    const queries = [
      "(prefers-color-scheme: dark)",
      "(min-width: 1024px)",
      "(hover: hover) and (pointer: fine)",
      "(prefers-reduced-motion: reduce)",
    ].map((q) => window.matchMedia(q));
    let resizeTimer = 0;
    const onMedia = () => {
      set({});
      // large resize: re-check performance (DESIGN-SYSTEM 6.9)
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(runGovernor, 400);
    };
    queries.forEach((m) => m.addEventListener("change", onMedia));

    const onVisibility = () => {
      if (document.hidden) document.documentElement.dataset.pageHidden = "true";
      else delete document.documentElement.dataset.pageHidden;
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    // Another tab (or the styleguide preview frame) changed a preference: follow it.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE.theme && e.key !== STORAGE.glass && e.key !== STORAGE.fx) return;
      const t = read(STORAGE.theme);
      const g = read(STORAGE.glass);
      const f = read(STORAGE.fx);
      set({
        theme: isOneOf(THEME_PREFS, t) ? t : "auto",
        glass: isOneOf(GLASS_PREFS, g) ? g : state.glass,
        fx: isOneOf(FX_PREFS, f) ? f : "auto",
      });
    };
    window.addEventListener("storage", onStorage);

    const detachPointer = attachPointerFx();
    runGovernor();

    return () => {
      window.removeEventListener("storage", onStorage);
      queries.forEach((m) => m.removeEventListener("change", onMedia));
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(resizeTimer);
      detachPointer();
      stopGovernor?.();
      stopGovernor = null;
    };
  },

  setTheme(theme: ThemePref) {
    write(STORAGE.theme, theme);
    set({ theme });
  },
  setGlass(glass: GlassPref) {
    write(STORAGE.glass, glass);
    set({ glass });
  },
  setFx(fx: FxPref) {
    write(STORAGE.fx, fx);
    session("clear");
    set({ fx, degraded: false });
    runGovernor();
  },
  /** Styleguide only: restart the 10 s performance watch. */
  restartGovernor: runGovernor,
};
