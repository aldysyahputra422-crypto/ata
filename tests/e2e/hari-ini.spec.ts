import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

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
    // the notice states the live count and the server's limit, and points to Lomba; nothing is removed
    const lebih = page.locator(".slot-lebih");
    await expect(lebih).toHaveText("2 Slot aktif. Paket Gratis mencakup 1 Slot aktif. Atur Slot aktif di Lomba.");
    await expect(lebih.getByRole("link", { name: "Atur Slot aktif di Lomba" })).toHaveAttribute("href", "/lomba#slot");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ata-bersama") ?? "{}").slot)).toEqual(["interval-2027", "cipta-karya-2026"]);
  });

  test("over-limit notice follows the server limit, not a fixed number", async ({ page }) => {
    await me(page, pro);
    await open(page);
    await expect(page.locator(".slot-lebih")).toHaveCount(0);
    await page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem("ata-bersama") ?? "{}");
      localStorage.setItem("ata-bersama", JSON.stringify({ ...b, slot: ["interval-2027", "cipta-karya-2026"] }));
    });
    await page.reload();
    await expect(page.locator(".slot-baris")).toHaveCount(2);
    await expect(page.locator(".folder-ata--kosong")).toHaveCount(1); // 2 of 3 on Pro: still room, no notice
    await expect(page.locator(".slot-lebih")).toHaveCount(0);
    await page.unroute("**/api/v1/me");
    await me(page, { ...pro, plan: { ...pro.plan, features: features(1) } });
    await page.reload();
    await expect(page.locator(".slot-lebih")).toHaveText("2 Slot aktif. Paket Pro mencakup 1 Slot aktif. Atur Slot aktif di Lomba.");
  });

  test("sample data carries a DATA DEMO label, also after reset; the user's own competition does not", async ({ page }) => {
    await me(page, free);
    await open(page);
    const label = page.locator(".judul-layar .label-demo");
    await expect(label).toHaveText("DATA DEMO");
    await page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem("ata-bersama") ?? "{}");
      localStorage.setItem("ata-bersama", JSON.stringify({ ...b, slot: ["manual-uji"], kartu: { "manual-uji": { nama: "Lomba sekolahku", hariLagi: 9 } } }));
    });
    await page.reload();
    await expect(page.locator(".slot-baris")).toContainText("Lomba sekolahku");
    await expect(label).toHaveCount(0);
    await page.getByRole("button", { name: "Pengaturan tampilan" }).click();
    await page.getByRole("button", { name: "Reset data demo" }).click();
    await expect(label).toHaveText("DATA DEMO");
  });

  test("page left open across midnight: completion date, XP and streak use the new day and survive a reload", async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 21, 23, 58) });
    await me(page, free);
    await open(page);
    const selesaiPada = () =>
      page.evaluate(() => {
        const peta = JSON.parse(localStorage.getItem("ata-bersama") ?? "{}").peta as Record<string, { langkah: { selesaiPada?: string }[] }>;
        return Object.values(peta).flatMap((p) => p.langkah.map((l) => l.selesaiPada).filter(Boolean)).sort();
      });
    const awal = await selesaiPada();
    await expect(page.locator(".judul-layar .hari")).toContainText("21 November 2026");
    await page.locator(".tugas-cek").first().click();
    await expect(page.locator(".toast")).toContainText(/Selesai\. \+\d+ XP/);
    expect((await selesaiPada()).filter((d) => d === "2026-11-21").length).toBe(awal.filter((d) => d === "2026-11-21").length + 1);

    await page.clock.fastForward("05:00"); // 00:03 on the 22nd, same page, no reload
    await expect(page.locator(".judul-layar .hari")).toContainText("22 November 2026");
    await expect(page.locator(".tugas-selesai-hari")).toHaveCount(0); // yesterday's completion is not "today"
    await page.locator(".tugas-cek").first().click();
    await expect(page.locator(".tugas-selesai-hari")).toHaveText("1 selesai hari ini");
    expect((await selesaiPada()).filter((d) => d === "2026-11-22")).toHaveLength(1);
    const ringkas = () => page.locator(".xp-baris").innerText();
    const sebelumMuat = await ringkas();
    expect(sebelumMuat).toMatch(/2\s*hari beruntun/);

    await page.reload();
    await expect(page.locator(".hari-grid")).toBeVisible();
    await expect(page.locator(".tugas-selesai-hari")).toHaveText("1 selesai hari ini");
    expect(await ringkas()).toBe(sebelumMuat);
    expect((await selesaiPada()).filter((d) => d === "2026-11-22")).toHaveLength(1);
  });

  // Glass sits over photos and posters, which axe cannot see: contrast is measured from rendered pixels.
  for (const tema of ["terang", "gelap"]) {
    test(`tab labels reach 4.5:1 against the pixels behind them (${tema})`, async ({ page }, info) => {
      await me(page, free);
      await open(page, `?tema=${tema}`);
      await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; }" });
      const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      const L = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const tabs = page.locator(`${info.project.name === "mobile" ? "#tabbar" : "#rail"} .tab`);
      for (const tab of [tabs.first(), tabs.nth(1)]) {
        const teks = await tab.evaluate((el) => {
          const s = [...el.querySelectorAll("span")].find((x) => x.textContent?.trim() && !x.children.length) ?? el;
          const r = s.getBoundingClientRect();
          return { warna: getComputedStyle(s).color, kotak: { x: r.x, y: r.y, width: r.width, height: r.height } };
        });
        await tab.evaluate((el) => (el as HTMLElement).style.setProperty("color", "transparent", "important"));
        const { data, info: im } = await sharp(await page.screenshot({ clip: teks.kotak })).raw().toBuffer({ resolveWithObject: true });
        await tab.evaluate((el) => (el as HTMLElement).style.removeProperty("color"));
        const [r, g, b] = (teks.warna.match(/[\d.]+/g) ?? []).map(Number);
        const lt = L(r, g, b);
        let terendah = Infinity;
        for (let i = 0; i < data.length; i += im.channels) {
          const lb = L(data[i], data[i + 1], data[i + 2]);
          terendah = Math.min(terendah, (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05));
        }
        expect(terendah, `${await tab.textContent()} ${teks.warna}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

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
