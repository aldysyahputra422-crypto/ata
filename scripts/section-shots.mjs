// Per-section close-ups of /styleguide for visual comparison with docs/references.
// Usage: BASE_URL=http://localhost:3000 OUT_DIR=<dir> node scripts/section-shots.mjs [theme]
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "docs/screenshots/sections";
const theme = process.argv[2] ?? "light";
const sections = (process.env.SECTIONS ?? "segmented,gem,poster,folder,ring,hero,material").split(",");

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const mobile of [false, true]) {
  const context = await browser.newContext(
    mobile
      ? { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }
      : { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 },
  );
  await context.addInitScript(
    ([t, m]) => {
      localStorage.setItem("ata.theme", t);
      localStorage.setItem("ata.fx", m ? "minimal" : "rich");
    },
    [theme, mobile],
  );
  const page = await context.newPage();
  await page.goto(`${BASE}/styleguide`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (const id of sections) {
    const el = page.locator(`#${id}`);
    await el.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector(".sg-toolbar")?.setAttribute("style", "position: static"));
    await page.waitForTimeout(150);
    await el.screenshot({ path: `${OUT}/${id}-${mobile ? 390 : 1280}-${theme}.png` });
  }
  await context.close();
}
await browser.close();
console.log("done");
