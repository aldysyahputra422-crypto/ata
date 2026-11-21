import { describe, expect, it } from "vitest";
import { activeNavIndex } from "@/lib/nav";

describe("activeNavIndex", () => {
  it("matches a tab and its nested routes only", () => {
    expect(activeNavIndex("/hari-ini")).toBe(0);
    expect(activeNavIndex("/ata/resep/business-plan")).toBe(2);
    expect(activeNavIndex("/atap")).toBe(-1);
    expect(activeNavIndex("/styleguide")).toBe(-1);
  });
});
