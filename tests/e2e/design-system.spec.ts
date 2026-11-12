import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const html = (page: import("@playwright/test").Page) => page.locator("html");

test.describe("styleguide", () => {
  test("renders every P0 section", async ({ page }) => {
    await page.goto("/styleguide");
    for (const id of ["palet", "tipografi", "material", "tombol", "input", "segmented", "gem", "poster", "folder", "ring", "hero", "overlay", "kosong"]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.getByRole("note")).toHaveText(/Versi Demo/);
  });

  test("effects tier: minimal on touch, rich on desktop", async ({ page }, info) => {
    await page.goto("/styleguide");
    await expect(html(page)).toHaveAttribute("data-fx", info.project.name === "mobile" ? "minimal" : "rich");
  });

  test("forcing Minim stops the desktop extras and Kaca Mati removes every blur", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("radiogroup", { name: "Efek gerak" }).getByRole("radio", { name: "Minim" }).click();
    await expect(html(page)).toHaveAttribute("data-fx", "minimal");
    await expect(page.locator(".mesh")).toBeHidden();

    await page.getByRole("radiogroup", { name: "Efek kaca" }).getByRole("radio", { name: "Mati" }).click();
    await expect(html(page)).toHaveAttribute("data-glass", "off");
    const blurred = await page.evaluate(
      () =>
        [...document.querySelectorAll(".glass-thin, .glass-frost")].filter((el) => {
          const s = getComputedStyle(el);
          return (s.backdropFilter && s.backdropFilter !== "none") || false;
        }).length,
    );
    expect(blurred).toBe(0);
  });

  test("theme choice persists across reloads without a flash of the wrong theme", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("radiogroup", { name: "Tema" }).getByRole("radio", { name: "Gelap" }).click();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    await page.reload({ waitUntil: "commit" });
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
  });

  test("segmented control works from the keyboard", async ({ page }) => {
    await page.goto("/styleguide");
    const group = page.getByRole("radiogroup", { name: "Tanya Ata" });
    await group.getByRole("radio", { name: "Chat" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(group.getByRole("radio", { name: "Resep" })).toHaveAttribute("aria-checked", "true");
    await expect(group.getByRole("radio", { name: "Resep" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(group.getByRole("radio", { name: "Ingatan" })).toHaveAttribute("aria-checked", "true");
  });

  test("sheet traps focus, closes with Escape and returns focus", async ({ page }) => {
    await page.goto("/styleguide");
    const trigger = page.getByRole("button", { name: "Buka sheet" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Lepas slot ini?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  for (const theme of ["light", "dark"] as const) {
    test(`text contrast is AA (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("ata.theme", t), theme);
      await page.goto("/styleguide");
      await page.evaluate(() => document.fonts.ready);
      const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      const summary = results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} :: ${n.failureSummary?.split("\n")[1]?.trim()}`));
      expect(summary).toEqual([]);
    });
  }
});

test.describe("app shell", () => {
  test("tab bar on small screens, rail from 1024 px", async ({ page }, info) => {
    await page.goto("/hari-ini");
    const tabbar = page.locator(".tabbar");
    const rail = page.locator(".navrail");
    if (info.project.name === "mobile") {
      await expect(tabbar).toBeVisible();
      await expect(rail).toBeHidden();
      await expect(tabbar.getByRole("link", { name: "Hari Ini" })).toHaveAttribute("aria-current", "page");
      await tabbar.getByRole("link", { name: "Lomba" }).click();
      await expect(page).toHaveURL(/\/lomba$/);
      await expect(tabbar.getByRole("link", { name: "Lomba" })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(rail).toBeVisible();
      await expect(tabbar).toBeHidden();
      await expect(rail.getByRole("link", { name: "Hari Ini", exact: true })).toHaveAttribute("aria-current", "page");
    }
  });
});
