import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// Four findings from browser testing of M1 Lomba, fixed in the prototype first (docs/perbaikan-lomba-empat-temuan.md):
// Slot folder under reduced motion, Radar query overwritten, poster drag with the mouse, text contrast over the photo.
const me = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 },
  signed_in: false, user: null, plan: { plan: "free", status: "free", sources: [], features: { activeSlots: { status: "final", limit: 1 } } } };
const open = async (page: Page, hash: string, motion: "reduce" | "no-preference" = "reduce") => {
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: me }));
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto("/lomba#" + hash);
  await expect(page.locator(`#screen[data-layar="${hash}"]`)).toBeVisible();
};
const watch = (page: Page) => { const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); return errors; };
const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
const inPanel = (page: Page) => page.evaluate(() => !!document.activeElement?.closest(".folder-buka"));
const onFolder = (page: Page) => page.evaluate(() => document.activeElement?.matches("[data-buka]") ?? false);
const topCard = async (page: Page) => {
  await page.locator(".lb-card.is-top, #tambahan").first().waitFor();
  if (await page.locator("#tambahan").count()) await page.locator("#tambahan").click();
  await page.locator(".lb-card.is-top").waitFor();
  await page.waitForTimeout(900); // cards finish dealing; the delayed Radar render has happened
};

test.describe("lomba: four browser findings", () => {
  for (const motion of ["reduce", "no-preference"] as const) {
    test(`Slot folder (${motion}): focus moves in, Tab stays in, Escape and Tutup close, focus returns`, async ({ page }) => {
      const errors = watch(page);
      await open(page, "slot", motion);
      const panel = page.locator(".folder-buka"), box = page.locator("[data-buka]").first();
      await box.focus();
      await page.keyboard.press("Enter");
      await expect(panel).toHaveCount(1);
      await expect.poll(() => inPanel(page)).toBe(true);
      for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); expect(await inPanel(page)).toBe(true); }
      await page.keyboard.press("Shift+Tab");
      expect(await inPanel(page)).toBe(true);
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
      await expect.poll(() => onFolder(page)).toBe(true);
      await page.keyboard.press("Enter");
      await expect(panel).toHaveCount(1);
      await page.locator(".folder-panel__tutup").click();
      await expect(panel).toHaveCount(0);
      await expect.poll(() => onFolder(page)).toBe(true);
      await noOverflow(page);
      expect(errors).toEqual([]);
    });

    test(`Radar query (${motion}): typing right after opening and during initialisation is kept`, async ({ page }) => {
      const errors = watch(page);
      await open(page, "radar", motion);
      const q = page.locator("#qTemukan");
      await q.fill("");
      await q.pressSequentially("lomba debat", { delay: 15 });
      await page.waitForTimeout(300); // still before the cards are ready (700 ms)
      await page.keyboard.type(" mahasiswa", { delay: 60 }); // typed across the re-render, into whatever has focus
      await page.waitForTimeout(1500);
      await expect(q).toHaveValue("lomba debat mahasiswa");
      expect(await page.evaluate(() => document.activeElement?.id)).toBe("qTemukan");
      await page.goto("/lomba#tersimpan");
      await page.goto("/lomba#radar");
      await expect(page.locator("#qTemukan")).not.toHaveValue("");
      await noOverflow(page);
      expect(errors).toEqual([]);
    });
  }

  for (const part of [".poster-art", ".lb-card__body"]) {
    test(`mouse drag from ${part} decides the card`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "mouse");
      const errors = watch(page);
      await open(page, "radar", "no-preference");
      await topCard(page);
      await expect(page.locator(".lb-card.is-top .poster-art__img")).toHaveCount(1);
      await page.evaluate(() => { (window as unknown as { ds: number }).ds = 0; document.addEventListener("dragstart", (e) => { if (!e.defaultPrevented) (window as unknown as { ds: number }).ds++; }); });
      const b = (await page.locator(".lb-card.is-top " + part).boundingBox())!;
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) { await page.mouse.move(x + i * 20, y, { steps: 2 }); await page.waitForTimeout(16); }
      await page.mouse.up();
      await expect(page.locator(".toast").first()).toContainText("Disimpan:");
      expect(await page.evaluate(() => (window as unknown as { ds: number }).ds)).toBe(0);
      expect(errors).toEqual([]);
    });
  }

  test("a click on the poster without movement still opens the detail", async ({ page }) => {
    await open(page, "radar", "no-preference");
    await topCard(page);
    await page.locator(".lb-card.is-top .poster-art").click();
    await expect(page.locator('#screen[data-layar="lomba-detail"]')).toBeVisible();
  });

  test("touch swipe from the poster still decides the card", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "touch");
    await open(page, "radar", "no-preference");
    await topCard(page);
    const b = (await page.locator(".lb-card.is-top .poster-art").boundingBox())!;
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const send = (type: "touchStart" | "touchMove" | "touchEnd", px = 0, py = 0) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: px, y: py }] });
    await send("touchStart", x, y);
    for (let i = 1; i <= 10; i++) { await send("touchMove", x - i * 20, y); await page.waitForTimeout(16); }
    await send("touchEnd");
    await expect(page.locator(".toast").first()).toContainText("Dilewati:");
  });

  // Contrast from rendered pixels: the text colour against every background pixel under the text box (text hidden for
  // the capture). The 5th percentile must reach 4.5:1; all of these are normal-size text.
  const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const measure = async (page: Page, selector: string) => {
    const el = page.locator(selector).first();
    await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(250);
    const info = await el.evaluate((n) => {
      const rg = document.createRange(); rg.selectNodeContents(n);
      return { color: getComputedStyle(n).color, boxes: [...rg.getClientRects()].filter((r) => r.width > 2 && r.height > 2).map((r) => [r.left, r.top, r.width, r.height]) };
    });
    const style = await page.addStyleTag({ content: "#screen * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }" });
    await page.waitForTimeout(120);
    const { data, info: img } = await sharp(await page.screenshot()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    await style.evaluate((n) => (n as HTMLElement).remove());
    const dpr = img.width / page.viewportSize()!.width;
    const c = info.color.match(/rgba?\(([^)]+)\)/)![1].split(/[\s,/]+/).map(Number);
    const fg = lum(c[0], c[1], c[2]);
    const ratios: number[] = [];
    for (const [x, y, w, h] of info.boxes) for (let py = Math.floor(y * dpr); py < (y + h) * dpr; py += 2) for (let px = Math.floor(x * dpr); px < (x + w) * dpr; px += 2) {
      const i = (py * img.width + px) * 4;
      if (i < 0 || i + 2 >= data.length) continue;
      const bg = lum(data[i], data[i + 1], data[i + 2]);
      ratios.push((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05));
    }
    ratios.sort((p, q) => p - q);
    return ratios[Math.floor(ratios.length * 0.05)] ?? 0;
  };
  const TARGETS: [hash: string, selector: string, desktopOnly?: boolean][] = [
    ["tersimpan", ".lb-daftar > section > p.small.muted"],
    ["peta", ".lb-peta__head .eyebrow"],
    ["peta", "#tambah"],
    ["lomba-detail", ".lb-detail__skor", true],
    ["lomba-detail", ".lb-detail__lembar > p.small.muted", true],
    ["lomba-detail", "#karuselHitung", true],
  ];
  for (const scheme of ["light", "dark"] as const) {
    test(`text over the photo reaches 4.5:1 (${scheme})`, async ({ page }, info) => {
      const desktop = info.project.name === "desktop";
      if (!desktop) await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      const low: string[] = [];
      let hash = "";
      for (const [h, selector, desktopOnly] of TARGETS) {
        if (desktopOnly && !desktop) continue;
        if (h !== hash) { hash = h; await open(page, h); await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" }); await page.waitForTimeout(600); }
        const ratio = await measure(page, selector);
        if (ratio < 4.5) low.push(`${h} ${selector}: ${ratio.toFixed(2)}`);
      }
      expect(low).toEqual([]);
      await noOverflow(page);
    });
  }
});
