import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { progresAkun } from "./akun";

// M1 Progres (FR-PRG-01, FR-PRG-03). Signed in, every number is the account's (stubbed in ./akun); signed out, the
// device's demo data, labelled.
const features = (limit: number) => ({ activeSlots: { status: "final", limit } });
const base = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const user = { id: "u1", email: "raka@example.com", display_name: "Raka", role: "user" };
const out = { ...base, signed_in: false, user: null, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const free = { ...base, signed_in: true, user, plan: { plan: "free", status: "free", sources: [], features: features(1) } };

const me = (page: Page, body: unknown, status = 200) => page.route("**/api/v1/me", (route) => route.fulfill({ status, json: body }));
const open = async (page: Page, query = "") => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/progres" + query);
  await expect(page.locator(".progres .cincin-baris")).toBeVisible();
};
const xp = (page: Page) => page.locator(".xp-baris__level");
const tugas = (page: Page) => page.locator(".tugas__butir");

test.describe("progres", () => {
  test("the Progres tab is current in the app shell", async ({ page }, info) => {
    await me(page, free);
    await progresAkun(page);
    await open(page);
    const nav = page.locator(info.project.name === "mobile" ? "#tabbar" : "#rail");
    await expect(nav.getByRole("link", { name: "Progres" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Halo Raka", level: 1 })).toBeVisible();
  });

  test("signed in: Slots, tasks, XP, level and streak are the account's, without a demo label", async ({ page }) => {
    await me(page, free);
    await progresAkun(page);
    await open(page);
    await expect(page.locator(".cincin")).toHaveCount(1);
    await expect(page.locator(".cincin")).toContainText("0 dari 3 langkah Peta Jalan");
    await expect(tugas(page)).toHaveCount(3);
    await expect(tugas(page).first()).toContainText("Langkah akun 1");
    await expect(xp(page)).toHaveText("Level 10 XP");
    await expect(page.locator(".lede")).toHaveText("0 dari 3 tugas selesai · 0 hari berturut-turut.");
    await expect(page.locator(".label-demo")).toHaveCount(0);
    await expect(page.getByText("Belum masuk")).toHaveCount(0);
  });

  test("sections without server storage show no numbers", async ({ page }) => {
    await me(page, free);
    await progresAkun(page);
    await open(page);
    for (const judul of ["Timer fokus", "Kesiapan submit", "Check-in mingguan"]) {
      const kartu = page.locator("section.card", { has: page.getByRole("heading", { name: judul }) });
      await expect(kartu.locator(".pill")).toHaveText("Belum tersedia");
      await expect(kartu).not.toContainText(/\d/);
    }
    await expect(page.locator(".lede")).not.toContainText("menit fokus");
  });

  test("finishing a task sends only the status; ring, XP, streak and heatmap are the server's and survive a reload", async ({ page }) => {
    await me(page, free);
    const { sent } = await progresAkun(page);
    await open(page);
    const s1 = page.locator('input[data-tugas="interval-2027/s1"]');
    await s1.click();
    await expect(page.locator(".toast")).toContainText("Selesai. +10 XP");
    expect(sent).toEqual([{ key: "interval-2027", step: "s1", body: { status: "done" } }]);
    const cek = async () => {
      await expect(xp(page)).toHaveText("Level 110 XP");
      await expect(page.locator(".xp-baris__streak")).toContainText("1 hari beruntun");
      await expect(page.locator(".cincin")).toContainText("1 dari 3 langkah Peta Jalan");
      await expect(page.locator(".ring b")).toHaveText("33%");
      await expect(page.locator('.heatmap__sel[data-n="1"]')).toHaveCount(1);
      await expect(page.getByText("1 aktivitas", { exact: true })).toBeVisible();
      await expect(s1).toBeChecked();
    };
    await cek();
    await page.reload();
    await cek();
    // undoing it is saved too
    await s1.click();
    await expect(xp(page)).toHaveText("Level 10 XP");
    expect(sent[1]).toEqual({ key: "interval-2027", step: "s1", body: { status: "todo" } });
  });

  test("two quick clicks on one task send one request", async ({ page }) => {
    await me(page, free);
    const { sent } = await progresAkun(page);
    await open(page);
    await page.evaluate(() => {
      const kotak = document.querySelector<HTMLInputElement>(".tugas__butir input")!;
      kotak.click();
      kotak.click();
    });
    await expect(xp(page)).toHaveText("Level 110 XP");
    expect(sent).toHaveLength(1);
  });

  test("a save the account refused is not shown as done", async ({ page }) => {
    const server = { gagal: undefined as number | undefined };
    await me(page, free);
    const { sent } = await progresAkun(page, { fail: () => server.gagal });
    await open(page);
    server.gagal = 503;
    await tugas(page).first().locator("input").click();
    await expect(page.locator(".toast")).toContainText("Belum tersimpan ke akun. Coba lagi.");
    await expect(tugas(page).first().locator("input")).not.toBeChecked();
    await expect(xp(page)).toHaveText("Level 10 XP");
    expect(sent).toHaveLength(1);
  });

  test("empty: an account without a Slot shows none, whatever the device holds", async ({ page }) => {
    await me(page, free);
    await progresAkun(page, { slot: [] });
    await open(page);
    await expect(page.locator(".cincin")).toHaveCount(0);
    await expect(page.getByText("Belum ada Slot aktif.")).toBeVisible();
    await expect(page.getByText("Belum ada tugas.")).toBeVisible();
    await expect(page.getByText("Belum ada tugas yang selesai dalam dua belas minggu terakhir.")).toBeVisible();
    await expect(xp(page)).toHaveText("Level 10 XP");
  });

  test("loading, then an error with retry; device data is never shown in its place", async ({ page }) => {
    let gagal: number | undefined = 503;
    let lepas = () => {};
    // held until the loading state has been seen; the page reloads once when it switches to the account's scope
    const tahan = new Promise<void>((r) => { lepas = r; });
    await page.route("**/api/v1/me", async (route) => {
      await tahan;
      await route.fulfill({ json: free });
    });
    await progresAkun(page, { fail: () => gagal });
    await page.goto("/progres");
    await expect(page.getByRole("status")).toHaveText("Memuat progresmu…");
    lepas();
    await expect(page.locator(".progres [role=alert]")).toContainText("Progres akunmu belum bisa dimuat.");
    await expect(page.locator(".cincin")).toHaveCount(0);
    gagal = undefined;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(tugas(page)).toHaveCount(3);
  });

  test("signed out: the device's demo data, labelled, and no request to the account API", async ({ page }) => {
    let diminta = 0;
    await me(page, out);
    await page.route("**/api/v1/progress", (route) => { diminta += 1; return route.fulfill({ status: 401, json: {} }); });
    await open(page);
    await expect(page.locator(".kepala .label-demo")).toHaveText("DATA DEMO");
    await expect(page.getByText("Belum masuk: ini data di perangkat ini, bukan data akun.")).toBeVisible();
    await expect(page.locator(".cincin")).toHaveCount(1);
    expect(diminta).toBe(0);
  });

  test("signing in sets the device's progress aside; the account's numbers do not come from it", async ({ page }) => {
    await me(page, out);
    await open(page);
    const lokal = await tugas(page).count();
    const kotak = page.locator(".tugas__butir input:not(:checked)").first();
    await kotak.click();
    await expect(page.locator(".toast")).toContainText("Selesai.");
    await page.unroute("**/api/v1/me");
    await me(page, free);
    await progresAkun(page);
    await page.goto("/progres");
    await expect(tugas(page).first()).toContainText("Langkah akun 1");
    await expect(xp(page)).toHaveText("Level 10 XP");
    await expect(page.locator(".tugas__butir input:checked")).toHaveCount(0);
    expect(lokal).toBeGreaterThan(0);
  });

  for (const tema of ["terang", "gelap"] as const) {
    for (const [siapa, akun] of [["device", out], ["account", free]] as const) {
      test(`no axe violations and no horizontal overflow (${tema}, ${siapa})`, async ({ page }, info) => {
        if (info.project.name === "mobile") await page.setViewportSize({ width: 390, height: 844 });
        await me(page, akun);
        const { status } = await progresAkun(page);
        status.set("interval-2027/s1", { status: "done", pada: new Date().toLocaleDateString("sv") });
        await open(page, `?tema=${tema}`);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/progres-${info.project.name === "mobile" ? 390 : 1280}-${tema}-${siapa}.png`, fullPage: true });
      });
    }
  }
});
