import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/app/(ata)/_referensi/ReferensiKomponen", () => ({ ReferensiKomponen: () => null }));

const { default: Styleguide } = await import("@/app/(ata)/styleguide/page");

// DEMO-06: /styleguide is a demo-only review page and must 404 unless DEMO_MODE is exactly "true".
describe("/styleguide gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["", "false", "1", "TRUE"])("is not found for DEMO_MODE=%j", (value) => {
    vi.stubEnv("DEMO_MODE", value);
    expect(() => Styleguide()).toThrow("NEXT_NOT_FOUND");
  });

  it("renders the prototype reference when DEMO_MODE=true", () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(Styleguide()).toBeTruthy();
  });
});
