import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  for (const k of Object.keys(document.documentElement.dataset)) delete document.documentElement.dataset[k];
});

/** jsdom has no matchMedia: tests declare which media queries are "true". */
export function mockMatchMedia(matching: string[]) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: matching.includes(query),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}
