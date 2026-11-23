import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// /styleguide renders the prototype component reference (uji-visual/komponen.html) with the prototype CSS.
const SECTIONS = ["hTombol", "hLabel", "hBanner", "hIsian", "hFolder", "hMuat"];

async function openStyleguide(page: Page, tema?: "light" | "dark") {
  await page.goto(tema ? `/styleguide?tema=${tema}` : "/styleguide");
  await expect(page.locator('body[data-siap="1"]')).toBeAttached();
}

test.describe("styleguide", () => {
  test("renders every prototype reference section", async ({ page }) => {
    await openStyleguide(page);
    for (const id of SECTIONS) await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("applies the theme from ?tema=", async ({ page }) => {
    await openStyleguide(page, "dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await openStyleguide(page, "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(bg);
  });

  test("has no horizontal overflow at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStyleguide(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  for (const tema of ["light", "dark"] as const) {
    test(`text contrast is AA (${tema})`, async ({ page }) => {
      await openStyleguide(page, tema);
      const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      const failing = results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(" ")));
      expect(failing).toEqual([]);
    });
  }

  test("the development-only /uji-visual page is not found in production builds", async ({ page }) => {
    const res = await page.goto("/uji-visual");
    expect(res?.status()).toBe(404);
  });
});

// Old foundation shell, still used by the tabs that have not migrated yet (Hari Ini, Lomba and Progres have their own specs).
test.describe("app shell", () => {
  test("tab bar on small screens, rail from 1024 px", async ({ page }, info) => {
    await page.goto("/ata");
    const tabbar = page.locator(".tabbar");
    const rail = page.locator(".navrail");
    if (info.project.name === "mobile") {
      await expect(tabbar).toBeVisible();
      await expect(rail).toBeHidden();
      await expect(tabbar.getByRole("link", { name: "Tanya Ata" })).toHaveAttribute("aria-current", "page");
      await tabbar.getByRole("link", { name: "Profil" }).click();
      await expect(page).toHaveURL(/\/profil$/);
    } else {
      await expect(rail).toBeVisible();
      await expect(tabbar).toBeHidden();
      await expect(rail.getByRole("link", { name: "Tanya Ata", exact: true })).toHaveAttribute("aria-current", "page");
    }
  });
});
