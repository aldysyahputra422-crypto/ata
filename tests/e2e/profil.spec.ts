import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Phase A (FR-AUTH-04, FR-AUTH-09): onboarding, Profil and AI data permissions. The account API is stubbed and, like
// the server, owns the profile: the page only sends patches.
const features = { activeSlots: { status: "final", limit: 1 } };
const base = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const plan = { plan: "free", status: "free", sources: [], features };
const signedOut = { ...base, signed_in: false, plan };
const signedIn = { ...base, signed_in: true, plan, user: { id: "u1", email: "raka@example.com", display_name: "Raka Pratama", role: "user" } };
type P = Record<string, string | number | boolean | string[] | null>;
const kosong: P = {
  display_name: null, jenjang: null, birth_year: null, institution: null, major: null, timezone: null, interests: [], targets: [], skills: [],
  goals_text: null, weekly_hours: null, onboarding_done: false, updated_at: "2026-11-23T00:00:00Z",
};
// an adult account: guardian consent (FR-AUTH-07) has its own spec, tests/e2e/persetujuan-wali.spec.ts
const lengkap: P = { ...kosong, display_name: "Raka", jenjang: "SMA/SMK", birth_year: 2000, interests: ["KTI"], onboarding_done: true };
const KATEGORI = ["profil", "akademik", "lomba", "tugas", "progres", "evaluasi", "ingatan", "dokumen"];

async function akun(page: Page, opts: { masuk?: boolean; profil?: P; gagal?: () => number | undefined; jeda?: number } = {}) {
  const profil = { ...(opts.profil ?? kosong) };
  const izin = Object.fromEntries(KATEGORI.map((k) => [k, false]));
  const kirim: { url: string; method: string; body: unknown }[] = [];
  const galat = (status: number) => ({ status, json: { error: { code: "unavailable", message: "Layanan akun belum tersedia. Coba lagi nanti." } } });
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: opts.masuk === false ? signedOut : signedIn }));
  await page.route("**/api/v1/profile", async (route) => {
    const req = route.request();
    if (opts.masuk === false) return route.fulfill({ status: 401, json: { error: { code: "unauthenticated", message: "Masuk dulu untuk melanjutkan." } } });
    if (req.method() === "GET") {
      const g = opts.gagal?.();
      return g ? route.fulfill(galat(g)) : route.fulfill({ json: { profile: profil } });
    }
    kirim.push({ url: "profile", method: req.method(), body: req.postDataJSON() });
    if (opts.jeda) await new Promise((r) => setTimeout(r, opts.jeda));
    const g = opts.gagal?.();
    if (g) return route.fulfill(galat(g));
    Object.assign(profil, req.postDataJSON());
    return route.fulfill({ json: { profile: profil } });
  });
  await page.route("**/api/v1/profile/onboarding/complete", (route) => {
    kirim.push({ url: "complete", method: route.request().method(), body: null });
    profil.onboarding_done = true;
    return route.fulfill({ json: { done: true } });
  });
  await page.route("**/api/v1/consent", (route) => route.fulfill({ json: { consent: {
    status: profil.birth_year === null ? "age_unknown" : "not_required", required: false, delivery_available: false, guardian_name: null,
    contact_masked: null, version: null, scope: [], expires_at: null, verified_at: null, revoked_by: null,
  } } }));
  await page.route("**/api/v1/permissions", async (route) => {
    const req = route.request();
    if (req.method() === "PATCH") {
      const b = req.postDataJSON() as { category: string; allowed: boolean };
      kirim.push({ url: "permissions", method: "PATCH", body: b });
      const g = opts.gagal?.();
      if (g) return route.fulfill(galat(g));
      izin[b.category] = b.allowed;
    }
    return route.fulfill({ json: { categories: izin, updated_at: null } });
  });
  return { kirim, profil, izin };
}

const tanpaGalat = (page: Page) => {
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) galat.push(m.text()); });
  return galat;
};

test.describe("kenalan (onboarding)", () => {
  test("saves each answer to the account and completes once", async ({ page }) => {
    const galat = tanpaGalat(page);
    const s = await akun(page);
    await page.goto("/kenalan");
    await expect(page.getByRole("heading", { name: "Siapa nama panggilanmu?" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.locator("#galatLangkah")).toContainText("minimal dua huruf");
    expect(s.kirim).toHaveLength(0);

    await page.locator("#jawab").fill("Raka");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("radio", { name: "SMA/SMK" }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.getByRole("heading", { name: "Tahun lahirmu?" })).toBeVisible();
    await page.locator("#jawab").fill("1900");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.locator("#galatLangkah")).toContainText("Tahun lahir harus");
    await page.locator("#jawab").fill("2000");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("button", { name: "Lewati" }).click(); // sekolah
    await page.getByRole("button", { name: "KTI" }).click();
    await page.getByRole("button", { name: "Esai", exact: true }).click();
    await expect(page.locator("#hitungMinat")).toHaveText("2 dari 5 dipilih.");
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("button", { name: "Beasiswa" }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await page.getByRole("radio", { name: "5–7 jam" }).click();
    await page.getByRole("button", { name: "Selesai" }).click();

    await expect(page.getByRole("heading", { name: "Selesai, Raka" })).toBeVisible();
    expect(s.kirim.map((k) => k.body ?? k.url)).toEqual([
      { display_name: "Raka" }, { jenjang: "SMA/SMK" }, { birth_year: 2000 }, { interests: ["KTI", "Esai"] }, { targets: ["Beasiswa"] },
      { weekly_hours: 6 }, "complete",
    ]);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /onboard|profil/i.test(k)))).toEqual([]);
    await expect(page.getByRole("link", { name: "Mulai pakai Ata" })).toHaveAttribute("href", "/hari-ini");
    expect(galat).toEqual([]);
  });

  test("resumes at the first missing required answer; a finished account sees the summary", async ({ page }) => {
    await akun(page, { profil: { ...kosong, display_name: "Raka" } });
    await page.goto("/kenalan");
    await expect(page.getByRole("heading", { name: "Sekarang di jenjang apa?" })).toBeVisible();
    await page.unrouteAll();
    await akun(page, { profil: lengkap });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Selesai, Raka" })).toBeVisible();
  });

  test("a double tap sends one request; a failed save keeps the step and says so", async ({ page }) => {
    let gagal: number | undefined = undefined;
    const s = await akun(page, { jeda: 300, gagal: () => gagal });
    await page.goto("/kenalan");
    await page.locator("#jawab").fill("Raka");
    await page.getByRole("button", { name: "Lanjut" }).dblclick();
    await expect(page.getByRole("heading", { name: "Sekarang di jenjang apa?" })).toBeVisible();
    expect(s.kirim).toHaveLength(1);
    gagal = 503;
    await page.getByRole("radio", { name: "SMP" }).click();
    await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.locator("#galatLangkah")).toContainText("Layanan akun belum tersedia");
    await expect(page.getByRole("heading", { name: "Sekarang di jenjang apa?" })).toBeVisible();
  });

  test("signed out: asks to sign in; load failure: retry", async ({ page }) => {
    await akun(page, { masuk: false });
    await page.goto("/kenalan");
    await expect(page.getByRole("heading", { name: "Masuk dulu untuk kenalan" })).toBeVisible();
    await page.unrouteAll();
    let gagal: number | undefined = 503;
    await akun(page, { gagal: () => gagal });
    await page.reload();
    await expect(page.locator(".error")).toContainText("Profil belum bisa dimuat");
    gagal = undefined;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("heading", { name: "Siapa nama panggilanmu?" })).toBeVisible();
  });
});

test.describe("profil", () => {
  test("reads the account profile, saves only changed fields, and survives a reload", async ({ page }) => {
    const galat = tanpaGalat(page);
    const s = await akun(page, { profil: lengkap });
    await page.goto("/profil");
    await expect(page.getByRole("heading", { name: "Profil", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Nama panggilan")).toHaveValue("Raka");
    await expect(page.getByRole("radio", { name: "SMA/SMK" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#ajakKenalan")).toHaveCount(0);
    await expect(page.locator("#simpanProfil")).toBeDisabled();
    await expect(page.locator('.rail [aria-current="page"], .tabbar [aria-current="page"]').filter({ visible: true })).toHaveText("Profil");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.getByLabel("Jurusan atau peminatan").fill("Statistika");
    await page.getByLabel("Kemampuan").fill("Menulis, Riset");
    await page.getByRole("button", { name: "Beasiswa" }).click();
    await page.locator("#simpanProfil").click();
    await expect(page.locator(".toast")).toContainText("Profil tersimpan di akunmu.");
    expect(s.kirim).toEqual([{ url: "profile", method: "PATCH", body: { major: "Statistika", skills: ["Menulis", "Riset"], targets: ["Beasiswa"] } }]);
    await expect(page.locator("#simpanProfil")).toBeDisabled();

    await page.reload();
    await expect(page.getByLabel("Jurusan atau peminatan")).toHaveValue("Statistika");
    await expect(page.getByRole("button", { name: "Beasiswa" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => /profil|izin/i.test(k)))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(galat).toEqual([]);
  });

  test("rejects invalid input before sending; a server failure keeps the edits", async ({ page }) => {
    let gagal: number | undefined = undefined;
    const s = await akun(page, { profil: lengkap, gagal: () => gagal });
    await page.goto("/profil");
    await page.getByLabel("Nama panggilan").fill("R");
    await page.locator("#simpanProfil").click();
    await expect(page.locator("#galatProfil")).toContainText("dua sampai tiga puluh");
    expect(s.kirim).toHaveLength(0);
    await page.getByLabel("Nama panggilan").fill("Raka B");
    gagal = 503;
    await page.locator("#simpanProfil").click();
    await expect(page.locator("#galatProfil")).toContainText("Layanan akun belum tersedia");
    await expect(page.getByLabel("Nama panggilan")).toHaveValue("Raka B");
    await expect(page.locator("#simpanProfil")).toBeEnabled();
  });

  test("AI permissions start off, change one category at a time, and a failed change is not shown as saved", async ({ page }) => {
    let gagal: number | undefined = undefined;
    const s = await akun(page, { profil: lengkap, gagal: () => gagal });
    await page.goto("/profil");
    const saklar = page.getByRole("switch");
    await expect(saklar).toHaveCount(8);
    for (const el of await saklar.all()) await expect(el).not.toBeChecked();
    await page.getByRole("switch", { name: "Tugas" }).click();
    await expect(page.getByRole("switch", { name: "Tugas" })).toBeChecked();
    expect(s.kirim).toEqual([{ url: "permissions", method: "PATCH", body: { category: "tugas", allowed: true } }]);
    await page.reload();
    await expect(page.getByRole("switch", { name: "Tugas" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Dokumen" })).not.toBeChecked();
    gagal = 503;
    await page.getByRole("switch", { name: "Dokumen" }).click();
    await expect(page.locator(".toast")).toContainText("Layanan akun belum tersedia");
    await expect(page.getByRole("switch", { name: "Dokumen" })).not.toBeChecked();
  });

  test("unfinished onboarding is offered; signed out shows no account data; load failure offers retry", async ({ page }) => {
    await akun(page);
    await page.goto("/profil");
    await expect(page.locator("#ajakKenalan").getByRole("link", { name: "Mulai kenalan" })).toHaveAttribute("href", "/kenalan");
    await page.unrouteAll();
    await akun(page, { masuk: false });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Kamu belum masuk" })).toBeVisible();
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(page.locator("form")).toHaveCount(0);
    await page.unrouteAll();
    let gagal: number | undefined = 503;
    await akun(page, { profil: lengkap, gagal: () => gagal });
    await page.reload();
    await expect(page.locator(".error")).toContainText("Profil belum bisa dimuat");
    gagal = undefined;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByLabel("Nama panggilan")).toHaveValue("Raka");
  });

  test("deleting the account needs HAPUS typed", async ({ page }) => {
    await akun(page, { profil: lengkap });
    const hapus: unknown[] = [];
    await page.route("**/api/v1/account", (route) => { hapus.push(route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
    await page.goto("/profil");
    await page.locator("#hapusAkun").click();
    await expect(page.locator("#yaHapus")).toBeDisabled();
    await page.locator("#konfirmasi").fill("hapus");
    await expect(page.locator("#yaHapus")).toBeDisabled();
    await page.locator("#konfirmasi").fill("HAPUS");
    await page.locator("#yaHapus").click();
    await page.waitForURL("**/");
    expect(hapus).toEqual([{ confirm: "HAPUS" }]);
  });

  test("dark theme passes axe", async ({ page }) => {
    await akun(page, { profil: lengkap });
    await page.goto("/profil?tema=gelap");
    await expect(page.getByLabel("Nama panggilan")).toHaveValue("Raka");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.goto("/kenalan?tema=gelap");
    await page.unrouteAll();
    await akun(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Siapa nama panggilanmu?" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
});
