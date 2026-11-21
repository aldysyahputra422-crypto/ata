// Takes the /styleguide review screenshots (docs/DESIGN-SYSTEM.md): 390 and 1280 px, light and dark.
// Usage: start the app with DEMO_MODE=true, then `pnpm screenshots` (BASE_URL defaults to http://localhost:3000).
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "docs/screenshots";
const SCALE = Number(process.env.SCALE ?? 2);

const shots = [
  { name: "styleguide-390-light", path: "/styleguide?tema=light", mobile: true },
  { name: "styleguide-390-dark", path: "/styleguide?tema=dark", mobile: true },
  { name: "styleguide-1280-light", path: "/styleguide?tema=light", mobile: false },
  { name: "styleguide-1280-dark", path: "/styleguide?tema=dark", mobile: false },
  // Old (fondasi) shell, kept until Hari Ini migrates in M1.
  { name: "shell-390-light", path: "/hari-ini", mobile: true, fullPage: false, legacy: true },
  { name: "shell-1280-light", path: "/hari-ini", mobile: false, fullPage: false, legacy: true },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const s of shots) {
  const context = await browser.newContext(
    s.mobile
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: SCALE }
      : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: SCALE },
  );
  if (s.legacy) {
    await context.addInitScript((mobile) => {
      localStorage.setItem("ata.theme", "light");
      // Headless Chromium renders in software, which trips the fps governor; pin the tier so shots are stable.
      localStorage.setItem("ata.fx", mobile ? "minimal" : "rich");
    }, s.mobile);
  }
  const page = await context.newPage();
  await page.goto(BASE + s.path, { waitUntil: "networkidle" });
  if (s.legacy) await page.evaluate(() => document.fonts.ready);
  else await page.waitForSelector('body[data-siap="1"]', { state: "attached" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: s.fullPage ?? true });
  console.log(`${s.name}.png`);
  await context.close();
}
await browser.close();
