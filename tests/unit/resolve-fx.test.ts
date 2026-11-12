import { describe, expect, it } from "vitest";
import { resolveFx } from "@/lib/fx/resolve-fx";
import { mockMatchMedia } from "./setup";

const WIDE = "(min-width: 1024px)";
const MOUSE = "(hover: hover) and (pointer: fine)";
const CALM = "(prefers-reduced-motion: reduce)";

// DESIGN-SYSTEM 6.1: phones stay simple, desktop gets the full effects.
describe("resolveFx", () => {
  it("is rich on a wide screen with a mouse", () => {
    mockMatchMedia([WIDE, MOUSE]);
    expect(resolveFx("auto")).toBe("rich");
  });

  it("is minimal on touch devices even when wide", () => {
    mockMatchMedia([WIDE]);
    expect(resolveFx("auto")).toBe("minimal");
  });

  it("is minimal on narrow screens with a mouse", () => {
    mockMatchMedia([MOUSE]);
    expect(resolveFx("auto")).toBe("minimal");
  });

  it("respects prefers-reduced-motion in auto mode", () => {
    mockMatchMedia([WIDE, MOUSE, CALM]);
    expect(resolveFx("auto")).toBe("minimal");
  });

  it("honours an explicit user choice in both directions", () => {
    mockMatchMedia([]);
    expect(resolveFx("rich")).toBe("rich");
    mockMatchMedia([WIDE, MOUSE]);
    expect(resolveFx("minimal")).toBe("minimal");
  });
});
