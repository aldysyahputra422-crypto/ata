import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { progresAkun } from "./akun";

// M1 Lomba (K-03, K-23, FR-RDM-03): the prototype's five screens inside the app shell. Signed out, data lives on the
// device. Signed in, the device data is set aside and the screens show the account's rows from
// /api/v1/user-competitions (stubbed here); device and sample data are never sent to an account (FR-PRG-03).
const features = (limit: number) => ({ activeSlots: { status: "final", limit } });
const base = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const user = { id: "u1", email: "raka@example.com", display_name: "Raka", role: "user" };
const out = { ...base, signed_in: false, user: null, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const free = { ...base, signed_in: true, user, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const pro = { ...base, signed_in: true, user, plan: { plan: "pro", status: "active", sources: ["redeem"], features: features(3) } };
const SEED = "interval-2027";

type Sent = { method: string; key: string; body: { state?: string } | null };
const stub = async (page: Page, me: unknown, opts: { items?: unknown[]; list?: number; put?: (s: Sent) => number } = {}) => {
  const sent: Sent[] = [];
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: me }));
  await page.route("**/api/v1/user-competitions", (route) =>
    route.fulfill({ status: opts.list ?? 200, json: opts.list && opts.list >= 400 ? { error: { code: "unavailable" } } : { items: opts.items ?? [], plan: "free", slot_limit: 1 } }));
  await page.route("**/api/v1/user-competitions/*", (route) => {
    const req = route.request();
    const s: Sent = { method: req.method(), key: decodeURIComponent(req.url().split("/").pop() ?? ""), body: req.postDataJSON() as Sent["body"] };
    sent.push(s);
    const status = opts.put?.(s) ?? 200;
    return route.fulfill({ status, json: status === 409 ? { error: { code: "limit_reached" } } : { ok: true } });
  });
  return sent;
};
const open = async (page: Page, hash = "radar") => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/lomba#" + hash);
  await expect(page.locator(`#screen[data-layar="${hash}"]`)).toBeVisible();
};

test.describe("lomba", () => {
  test("five screens open by hash inside the shell, without horizontal overflow or errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await stub(page, out);
    for (const [hash, judul] of [["radar", /Ata nemu|lomba/], ["tersimpan", "Tersimpan"], ["slot", "Slot kamu"], ["peta", /INTERVAL/], ["lomba-detail", /.+/]] as const) {
      await open(page, hash);
      await expect(page.locator("#screen h1").first()).toHaveText(judul);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
    await expect(page.locator("#tabbar a[aria-current=page], #rail a[aria-current=page]").first()).toContainText("Lomba");
    expect(errors).toEqual([]);
  });

  test("signed out: demo banner, nothing is sent to the account", async ({ page }) => {
    const sent = await stub(page, out);
    await open(page, "slot");
    await expect(page.locator(".demo-banner")).toHaveText("Versi Demo, data contoh");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "lokal");
    expect(sent).toEqual([]);
  });

  test("Slot copy follows the server plan: Gratis 1, Pro 3", async ({ page }) => {
    await stub(page, free, { items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap: null }] });
    await open(page, "slot");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lede")).toHaveText("1 dari 1 Slot terpakai. Paket Gratis mencakup 1 Slot aktif.");
    await expect(page.locator(".demo-banner")).toHaveCount(0);
    await stub(page, pro);
    await page.reload();
    await expect(page.locator(".lede")).toHaveText("1 dari 3 Slot terpakai. Paket Pro mencakup 3 Slot aktif.");
  });

  test("first sign-in: the device's sample data is not sent to the account and comes back after signing out", async ({ page }) => {
    await stub(page, out);
    await open(page, "slot");
    await expect(page.locator(".lede")).toContainText("1 dari 1 Slot terpakai");
    const ringkas = () => page.evaluate(() => {
      const b = JSON.parse(localStorage.getItem("ata-bersama") ?? "{}") as { slot: string[]; peta: Record<string, { langkah: { id: string; selesai?: boolean }[] }> };
      return JSON.stringify([b.slot, Object.entries(b.peta).map(([k, p]) => [k, p.langkah.map((l) => [l.id, !!l.selesai])])]);
    });
    const lokal = await ringkas();
    await page.unrouteAll();
    const sent = await stub(page, free);
    await page.reload();
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lede")).toContainText("0 dari 1 Slot terpakai");
    await page.waitForTimeout(800);
    expect(sent).toEqual([]);
    await page.unrouteAll();
    await stub(page, out);
    await page.reload();
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "lokal");
    await expect(page.locator(".lede")).toContainText("1 dari 1 Slot terpakai");
    expect(await ringkas()).toBe(lokal);
  });

  test("a Slot the plan rejects stays on the device and the user is told", async ({ page }) => {
    const sent = await stub(page, { ...free, plan: { ...free.plan, features: features(2) } }, {
      items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap: null }],
      put: (s) => (s.body?.state === "slot" && s.key !== SEED ? 409 : 200),
    });
    await open(page, "radar");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await page.locator('[data-aksi="slot"]').click();
    await expect(page.locator(".toast")).toContainText("melebihi batas paketmu");
    expect(sent.filter((s) => s.method === "DELETE")).toEqual([]);
  });

  test("account Slots above the limit are all shown (downgrade keeps rows)", async ({ page }) => {
    const items = [SEED, "essay-unesa-2026", "esdm-jurnalistik-2026"].map((k) => ({ competition_key: k, source: "catalog", state: "slot", card: null, roadmap: null }));
    const sent = await stub(page, free, { items });
    await open(page, "slot");
    await expect(page.locator(".lede")).toContainText("3 dari 1 Slot terpakai");
    expect(sent.filter((s) => s.method === "DELETE" || s.body?.state === "released")).toEqual([]);
  });

  test("the Slot limit is the server's, also when it differs from the built-in table", async ({ page }) => {
    await stub(page, { ...free, plan: { ...free.plan, features: features(2) } }, { items: [SEED].map((k: string) => ({ competition_key: k, source: "catalog", state: "slot", card: null, roadmap: null })) });
    await open(page, "slot");
    await expect(page.locator(".lede")).toHaveText("1 dari 2 Slot terpakai. Paket Gratis mencakup 2 Slot aktif.");
  });

  test("a Slot allowed by a server limit above the built-in one is kept in the shared store", async ({ page }) => {
    await stub(page, { ...free, plan: { ...free.plan, features: features(2) } }, { items: [SEED].map((k: string) => ({ competition_key: k, source: "catalog", state: "slot", card: null, roadmap: null })) });
    await open(page, "radar");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await page.locator('[data-aksi="slot"]').click();
    await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem("ata-bersama") ?? "{}").slot ?? []).length)).toBe(2);
    await page.goto("/lomba#slot");
    await expect(page.locator(".lede")).toContainText("2 dari 2 Slot terpakai");
  });

  test("a newer account roadmap replaces the device copy when the device has no edits of its own", async ({ page }) => {
    const awal = [{ id: "s1", nama: "Baca panduan", tanggal: "2027-01-10" }, { id: "s2", nama: "Kerangka", tanggal: "2027-01-20" }];
    await stub(page, free, { items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap: { disetujui: true, langkah: awal } }] });
    await open(page, "peta");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lb-steps")).toContainText("Kerangka");
    await page.waitForTimeout(800);
    // what another device stored: jsonb key order and one more step
    const roadmap = { langkah: [...awal.map((l) => ({ tanggal: l.tanggal, nama: l.nama, id: l.id })), { tanggal: "2027-01-25", id: "s3", nama: "Draf dari perangkat lain" }], disetujui: true };
    await page.unrouteAll();
    const sent2 = await stub(page, free, { items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap }] });
    await page.reload();
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lb-steps")).toContainText("dari perangkat lain");
    await page.waitForTimeout(800);
    expect(sent2.filter((s) => s.key === SEED && !JSON.stringify(s.body).includes("dari perangkat lain"))).toEqual([]);
  });

  test("another account on the same device does not see or receive the previous account's Lomba data", async ({ page }) => {
    await stub(page, { ...free, user: { ...user, id: "u0" } }, { items: [SEED, "essay-unesa-2026"].map((k: string) => ({ competition_key: k, source: "catalog", state: "slot", card: null, roadmap: null })) });
    await open(page, "slot");
    await expect(page.locator(".lede")).toContainText("2 dari 1 Slot terpakai");
    const sent = await stub(page, free); // account u1, nothing stored yet
    await page.reload();
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lede")).toContainText("0 dari 1 Slot terpakai");
    await page.waitForTimeout(800);
    expect(sent).toEqual([]);
  });

  test("a roadmap edit that failed to reach the account is kept over the older account row and sent again", async ({ page }) => {
    const items = [SEED].map((k: string) => ({ competition_key: k, source: "catalog", state: "slot", card: null, roadmap: null }));
    let gagal = true;
    const sent = await stub(page, free, { items, put: () => (gagal ? 500 : 200) });
    await open(page, "peta");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await page.locator("#tambah").click();
    await page.locator("#nmL").fill("Langkah belum terkirim");
    await page.locator("#fLangkah button[type=submit]").click();
    await expect(page.locator(".lb-steps")).toContainText("Langkah belum terkirim");
    await expect.poll(() => sent.length).toBeGreaterThan(0);
    gagal = false;
    sent.length = 0;
    await page.reload(); // the account still answers with the row that has no such step
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await expect(page.locator(".lb-steps")).toContainText("Langkah belum terkirim");
    await expect.poll(() => JSON.stringify(sent.find((x) => x.key === SEED)?.body ?? "")).toContain("Langkah belum terkirim");
  });

  test("undo after deleting a roadmap step brings the step back", async ({ page }) => {
    await stub(page, out);
    await open(page, "peta");
    const langkah = page.locator(".lb-step");
    const jumlah = await langkah.count();
    const nama = await langkah.first().locator("strong").innerText();
    await langkah.first().locator("[data-edit]").click();
    await page.locator("#hapus").click();
    await expect(langkah).toHaveCount(jumlah - 1);
    await page.locator(".toast button", { hasText: "Urungkan" }).click();
    await expect(langkah).toHaveCount(jumlah);
    await expect(langkah.first().locator("strong")).toHaveText(nama);
    await page.reload();
    await expect(page.locator(".lb-step")).toHaveCount(jumlah);
  });

  test("leaving and reopening Lomba keeps a single pull-to-refresh indicator", async ({ page }) => {
    await stub(page, out);
    await open(page, "peta");
    const tab = (nama: string) => page.locator("#tabbar a, #rail a").filter({ hasText: nama }).locator("visible=true").first();
    for (let i = 0; i < 2; i++) {
      await tab("Hari Ini").click();
      await expect(page).toHaveURL(/hari-ini/);
      await tab("Lomba").click();
      await expect(page.locator("#screen")).toBeVisible();
    }
    await expect(page.locator("body > .tarik")).toHaveCount(1);
    await page.waitForTimeout(300);
    await expect(page.locator("body > .tarik")).toHaveCount(1);
  });

  test("account unreachable: device data stays, banner explains, nothing is sent", async ({ page }) => {
    await stub(page, free, { items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap: null }] });
    await open(page, "slot");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    await page.unrouteAll();
    const sent = await stub(page, free, { list: 503 });
    await page.reload();
    await expect(page.locator(".demo-banner")).toContainText("Akun tidak bisa dihubungi");
    await expect(page.locator(".lede")).toContainText("1 dari 1 Slot terpakai");
    expect(sent).toEqual([]);
  });

  test("saving from the detail screen is mirrored to the account", async ({ page }) => {
    const sent = await stub(page, free, { items: [{ competition_key: SEED, source: "catalog", state: "slot", card: null, roadmap: null }] });
    await open(page, "lomba-detail");
    await expect(page.locator("#views")).toHaveAttribute("data-akun", "akun");
    const before = sent.length;
    await page.locator("#simpanBtn").click();
    await expect.poll(() => sent.length).toBeGreaterThan(before);
    expect(sent.at(-1)?.method).toBe("PUT");
  });

  test("search without a connected key gives ready-made queries, never results", async ({ page }) => {
    await stub(page, out);
    await open(page, "radar");
    await page.locator("#qTemukan").fill("lomba esai SMA");
    await page.locator("#tombolTemukan").click();
    const hasil = page.locator("#hasilTemukan");
    await expect(hasil.locator('a[href^="https://www.google.com/search?"]').first()).toBeVisible();
  });

  test("Hari Ini links open the Slot screen", async ({ page }) => {
    await stub(page, free);
    await progresAkun(page);
    await page.goto("/hari-ini");
    await expect(page.locator(".slot-baris").first()).toHaveAttribute("href", "/lomba#slot");
  });

  for (const tema of ["terang", "gelap"] as const) {
    test(`axe: Radar and Slot, ${tema}`, async ({ page }) => {
      await stub(page, out);
      for (const hash of ["radar", "slot"]) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(`/lomba?tema=${tema}#${hash}`);
        await expect(page.locator(`#screen[data-layar="${hash}"]`)).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      }
    });
  }
});
