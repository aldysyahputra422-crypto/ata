// Takes the /styleguide review screenshots (DESIGN-SYSTEM 11.4, DS-05).
// Usage: start the app with DEMO_MODE=true, then `pnpm screenshots` (BASE_URL defaults to http://localhost:3000).
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "docs/screenshots";
const SCALE = Number(process.env.SCALE ?? 2);

const shots = [
  { name: "styleguide-390-light", path: "/styleguide", theme: "light", mobile: true },
  { name: "styleguide-390-dark", path: "/styleguide", theme: "dark", mobile: true },
  { name: "styleguide-1280-light", path: "/styleguide", theme: "light", mobile: false },
  { name: "styleguide-1280-dark", path: "/styleguide", theme: "dark", mobile: false },
  { name: "styleguide-390-light-glass-off", path: "/styleguide", theme: "light", mobile: true, glass: "off" },
  { name: "shell-390-light", path: "/hari-ini", theme: "light", mobile: true, fullPage: false },
  { name: "shell-1280-light", path: "/hari-ini", theme: "light", mobile: false, fullPage: false },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const s of shots) {
  const context = await browser.newContext(
    s.mobile
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: SCALE }
      : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: SCALE },
  );
  await context.addInitScript(
    ([theme, glass, mobile]) => {
      localStorage.setItem("ata.theme", theme);
      // Headless Chromium renders in software, which trips the fps governor; pin the tier so shots are stable.
      localStorage.setItem("ata.fx", mobile ? "minimal" : "rich");
      if (glass) localStorage.setItem("ata.glass", glass);
    },
    [s.theme, s.glass ?? null, s.mobile],
  );
  const page = await context.newPage();
  await page.goto(BASE + s.path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const fx = await page.evaluate(() => document.documentElement.dataset.fx);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: s.fullPage ?? true });
  console.log(`${s.name}.png  (fx=${fx})`);
  await context.close();
}
await browser.close();
