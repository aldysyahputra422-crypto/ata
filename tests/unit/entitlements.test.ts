import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_FEATURES, featuresFor, withinLimit } from "@/lib/entitlements/config";
// prototype single source (moved verbatim in R0.05-1)
import { HAK } from "@/lib/prototype/shared/logic/hak.js";

describe("entitlement config (single source)", () => {
  it("active Slots are final: Free 1 (K-23), Pro 3 (K-03); every other limit is still a proposal", () => {
    expect(PLAN_FEATURES.pro.activeSlots).toMatchObject({ limit: 3, status: "final" });
    expect(PLAN_FEATURES.free.activeSlots).toMatchObject({ limit: 1, status: "final" });
    for (const features of Object.values(PLAN_FEATURES)) {
      const final = Object.entries(features).filter(([, setting]) => setting.status === "final").map(([name]) => name);
      expect(final).toEqual(["activeSlots"]);
    }
  });

  it("matches the prototype's single source until the prototype screens are migrated", () => {
    expect(PLAN_FEATURES.free.activeSlots.limit).toBe(HAK.gratis.slotAktif);
    expect(PLAN_FEATURES.pro.activeSlots.limit).toBe(HAK.pro.slotAktif);
  });

  it("no plan grants AI or search usage paid by Ata (BYOK only)", () => {
    const keys = Object.keys(PLAN_FEATURES.free).concat(Object.keys(PLAN_FEATURES.pro)).join(" ");
    expect(keys).not.toMatch(/credit|token|quota|managedAi|aiMessages|searchQueries/i);
  });

  it("limits are enforced from config: reaching the limit refuses adding more; null means unlimited", () => {
    expect(withinLimit("free", "activeSlots", 0)).toBe(true);
    expect(withinLimit("free", "activeSlots", 1)).toBe(false);
    expect(withinLimit("pro", "activeSlots", 2)).toBe(true);
    expect(withinLimit("pro", "activeSlots", 3)).toBe(false);
    expect(withinLimit("pro", "savedPrompts", 10_000)).toBe(true);
    expect(withinLimit("free", "panelJury", 0)).toBe(false);
    expect(featuresFor("unknown" as never)).toBe(PLAN_FEATURES.free);
  });

  it("components and pages do not hard-code plan limits", () => {
    const pola = /(slot(Limit|Aktif|s)?|batasSlot|maxSlots?)\s*[:=]\s*\d/i;
    const temuan: string[] = [];
    const jelajah = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) jelajah(p);
        else if (/\.(tsx?|jsx?)$/.test(n) && pola.test(readFileSync(p, "utf8"))) temuan.push(p);
      }
    };
    for (const d of ["src/components", "src/app"]) jelajah(d);
    expect(temuan).toEqual([]);
  });
});
