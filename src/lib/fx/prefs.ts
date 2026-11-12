import type { FxPref } from "./resolve-fx";

export type ThemePref = "light" | "dark" | "auto";
export type GlassPref = "full" | "light" | "off";

export const STORAGE = {
  theme: "ata.theme",
  glass: "ata.glass",
  fx: "ata.fx",
  fxSession: "fx", // sessionStorage: "minimal-auto" after the governor degraded
} as const;

export const THEME_PREFS: ThemePref[] = ["light", "dark", "auto"];
export const GLASS_PREFS: GlassPref[] = ["full", "light", "off"];
export const FX_PREFS: FxPref[] = ["auto", "rich", "minimal"];

export function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

/** First-visit default (DESIGN-SYSTEM 4.2): weak touch devices start with light glass. */
export function defaultGlass(): GlassPref {
  if (typeof window === "undefined") return "full";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  return coarse && weak ? "light" : "full";
}

/**
 * Inline script for <head>: applies stored preferences before first paint so the
 * page never flashes the wrong theme. Keep it dependency-free and in sync with
 * resolveFx / defaultGlass above (covered by tests/unit/boot-script.test.ts).
 */
export const BOOT_SCRIPT = `(function(){try{var d=document.documentElement,m=function(q){return window.matchMedia(q).matches},g=function(k){try{return localStorage.getItem(k)}catch(e){return null}};
var t=g("${STORAGE.theme}");if(t!=="light"&&t!=="dark")t=m("(prefers-color-scheme: dark)")?"dark":"light";d.dataset.theme=t;
var gl=g("${STORAGE.glass}");if(gl!=="full"&&gl!=="light"&&gl!=="off"){var weak=(navigator.deviceMemory||8)<=4||(navigator.hardwareConcurrency||8)<=4;gl=m("(pointer: coarse)")&&weak?"light":"full"}d.dataset.glass=gl;
var f=g("${STORAGE.fx}"),s=null;try{s=sessionStorage.getItem("${STORAGE.fxSession}")}catch(e){}
if(f!=="rich"&&f!=="minimal"){f=(s!=="minimal-auto"&&m("(min-width: 1024px)")&&m("(hover: hover) and (pointer: fine)")&&!m("(prefers-reduced-motion: reduce)"))?"rich":"minimal"}d.dataset.fx=f;
var ua=navigator.userAgentData;if(f==="rich"&&ua&&ua.brands&&ua.brands.some(function(b){return b.brand==="Chromium"}))d.dataset.refract="on";
}catch(e){document.documentElement.dataset.theme="light";document.documentElement.dataset.glass="full";document.documentElement.dataset.fx="minimal"}})();`;
