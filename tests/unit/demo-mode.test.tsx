import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemoBanner } from "@/components/ds/DemoBanner";
import { isDemoMode } from "@/lib/env";

// DEMO-06: demo paths must be completely off unless DEMO_MODE is exactly "true".
describe("DEMO_MODE gate", () => {
  it.each(["", "false", "1", "TRUE", "yes"])("is off for %j", (value) => {
    vi.stubEnv("DEMO_MODE", value);
    expect(isDemoMode()).toBe(false);
    const { container } = render(<DemoBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is on only for the exact string 'true'", () => {
    vi.stubEnv("DEMO_MODE", "true");
    expect(isDemoMode()).toBe(true);
    render(<DemoBanner />);
    expect(screen.getByRole("note")).toHaveTextContent("Versi Demo — data contoh");
  });
});
