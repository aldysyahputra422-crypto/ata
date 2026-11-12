// docs/DESIGN-SYSTEM.md 6.9: decides between the "rich" (desktop) and "minimal" (touch) tiers.
export type FxPref = "auto" | "rich" | "minimal";
export type FxLevel = "rich" | "minimal";

export function resolveFx(pref: FxPref): FxLevel {
  if (typeof window === "undefined") return "minimal";
  if (pref !== "auto") return pref;
  const q = (m: string) => window.matchMedia(m).matches;
  const capable = q("(min-width: 1024px)") && q("(hover: hover) and (pointer: fine)");
  const calm = q("(prefers-reduced-motion: reduce)");
  return capable && !calm ? "rich" : "minimal";
}

export function isChromium(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } };
  return !!n.userAgentData?.brands.some((b) => b.brand === "Chromium");
}
