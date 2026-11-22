import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// M1 Hari Ini (FR-SLT-01, K-23). Slot and task data live on the device (demo seed: one Slot); the account API is stubbed.
const features = (limit: number) => ({ activeSlots: { status: "final", limit } });
const base = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const user = { id: "u1", email: "raka@example.com", display_name: "Raka", role: "user" };
const free = { ...base, signed_in: true, user, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const pro = { ...base, signed_in: true, user, plan: { plan: "pro", status: "active", sources: ["redeem"], features: features(3) } };

const me = (page: Page, body: unknown, status = 200) => page.route("**/api/v1/me", (route) => route.fulfill({ status, json: body }));
const open = async (page: Page, query = "") => {
  // entrance animations fade text in; contrast is checked on the settled screen
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/hari-ini" + query);
  await expect(page.locator(".hari-grid")).toBeVisible();
};

test.describe("hari ini", () => {
  test("shell: five tabs, tab bar on phones and rail on desktop", async ({ page }, info) => {
    await me(page, free);
    await open(page);
    const nav = page.locator(info.project.name === "mobile" ? "#tabbar" : "#rail");
    await expect(nav).toBeVisible();
    await expect(page.locator(info.project.name === "mobile" ? "#rail" : "#tabbar")).toBeHidden();
    await expect(nav.getByRole("link")).toHaveText(["Hari Ini", "Lomba", "Tanya Ata", "Progres", "Profil"]);
    await expect(nav.getByRole("link", { name: "Hari Ini" })).toHaveAttribute("aria-current", "page");
  });

  test("Gratis: one demo Slot fills the limit, no empty Slot card", async ({ page }) => {
    await me(page, free);
    await open(page);
    await expect(page.getByRole("heading", { name: "Hari Ini", level: 1 })).toBeVisible();
    await expect(page.locator(".slot-baris")).toHaveCount(1);
    await expect(page.locator(".folder-ata--kosong")).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Ringkasan hari ini" })).toContainText("1Slot aktif");
  });

  test("Pro: the server limit of 3 leaves two Slots free", async ({ page }) => {
    await me(page, pro);
    await open(page);
    await expect(page.locator(".folder-ata--kosong")).toContainText("2 tersisa");
  });

  test("account API down: the screen still works from device data", async ({ page }) => {
    await me(page, { error: { code: "unavailable", message: "x" } }, 503);
    await open(page);
    await expect(page.locator(".slot-baris")).toHaveCount(1);
  });

  test("more Slots than the limit are kept and shown (K-23)", async ({ page }) => {
    await me(page, free);
    await open(page);
    // an account that already held two Slots before the Gratis limit became 1
    await page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem("ata-bersama") ?? "{}");
      localStorage.setItem("ata-bersama", JSON.stringify({ ...b, slot: ["interval-2027", "cipta-karya-2026"] }));
    });
    await page.reload();
    await expect(page.locator(".slot-baris")).toHaveCount(2);
    await expect(page.locator(".folder-ata--kosong")).toHaveCount(0);
  });

  test("finishing a task updates the count and confirms the XP", async ({ page }) => {
    await me(page, free);
    await open(page);
    const tersisa = page.locator(".tugas-kartu .pill");
    const sebelum = Number.parseInt((await tersisa.textContent()) ?? "", 10);
    await page.locator(".tugas-cek").first().click();
    await expect(page.locator(".toast")).toContainText(/Selesai\. \+\d+ XP/);
    await expect(tersisa).toHaveText(`${sebelum - 1} tersisa`);
  });

  test("display settings: theme switch, demo reset restores the seed", async ({ page }) => {
    await me(page, free);
    await open(page);
    await page.locator(".tugas-cek").first().click();
    const tersisa = page.locator(".tugas-kartu .pill");
    const setelah = await tersisa.textContent();
    await page.getByRole("button", { name: "Pengaturan tampilan" }).click();
    await page.getByRole("radio", { name: "Gelap" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Reset data demo" }).click();
    await expect(tersisa).not.toHaveText(setelah ?? "");
  });

  test("has no horizontal overflow", async ({ page }) => {
    await me(page, free);
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  for (const tema of ["terang", "gelap"] as const) {
    test(`no axe violations (${tema})`, async ({ page }) => {
      await me(page, free);
      await open(page, `?tema=${tema}`);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
});
