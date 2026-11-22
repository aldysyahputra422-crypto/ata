import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// M1 Masuk/Paket (FR-AUTH-01, FR-PLAN-01). The account API is stubbed so every state is deterministic.
const features = (limit: number) => ({ activeSlots: { status: "final", limit } });
const base = { config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const signedOut = { ...base, signed_in: false, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const user = { id: "u1", email: "raka@example.com", display_name: "Raka", role: "user" };
const free = { ...base, signed_in: true, user, plan: { plan: "free", status: "free", sources: [], features: features(1) } };
const pro = {
  ...base,
  signed_in: true,
  user,
  plan: { plan: "pro", status: "active", sources: ["redeem"], ends_at: "2027-01-31T00:00:00Z", features: features(3) },
};
const unavailable = { error: { code: "unavailable", message: "Layanan akun belum tersedia. Coba lagi nanti." } };

const me = (page: Page, body: unknown, status = 200) =>
  page.route("**/api/v1/me", (route) => route.fulfill({ status, json: body }));

test.describe("masuk", () => {
  test("signed out: Google link, use-without-account, no error", async ({ page }) => {
    await me(page, signedOut);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Masuk ke Ata" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Lanjutkan dengan Google" })).toHaveAttribute("href", "/api/v1/auth/google/start");
    await expect(page.getByRole("button", { name: "Pakai tanpa akun dulu" })).toBeVisible();
    await expect(page.locator(".error")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze()).violations).toEqual([]);
  });

  test("shows the OAuth failure message", async ({ page }) => {
    await me(page, signedOut);
    await page.goto("/?error=bad_oauth_state");
    await expect(page.locator(".error")).toContainText("Gagal masuk dengan Google. Coba lagi.");
  });

  test("loading, then error with retry", async ({ page }) => {
    let fail = true;
    await page.route("**/api/v1/me", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill(fail ? { status: 503, json: unavailable } : { json: signedOut });
    });
    await page.goto("/");
    await expect(page.getByRole("status")).toContainText("Memeriksa akun di server");
    await expect(page.getByText(unavailable.error.message)).toBeVisible();
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
    fail = false;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("link", { name: "Lanjutkan dengan Google" })).toBeVisible();
  });

  test("Google not configured: button disabled with the reason", async ({ page }) => {
    await me(page, { ...signedOut, config: { google: false, payments: false } });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
    await expect(page.getByText("Masuk dengan Google belum dikonfigurasi di server ini.")).toBeVisible();
  });

  test("use without an account is remembered on this device", async ({ page }) => {
    await me(page, signedOut);
    await page.goto("/");
    await page.getByRole("button", { name: "Pakai tanpa akun dulu" }).click();
    await expect(page).toHaveURL(/\/hari-ini$/);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Lanjutkan tanpa akun" })).toBeVisible();
  });

  test("signed in: account details, sign out", async ({ page }) => {
    let body: unknown = pro;
    await page.route("**/api/v1/me", (route) => route.fulfill({ json: body }));
    await page.route("**/api/v1/auth/logout", (route) => {
      body = signedOut;
      return route.fulfill({ status: 204 });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Halo, Raka" })).toBeVisible();
    await expect(page.locator(".rincian")).toContainText("raka@example.com");
    await expect(page.locator(".rincian")).toContainText("Pro sampai 31 Januari 2027");
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByText("Kamu sudah keluar.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Masuk ke Ata" })).toBeVisible();
  });

  test("delete account asks first, and cancel keeps the account", async ({ page }) => {
    let deleted = 0;
    let body: unknown = free;
    await page.route("**/api/v1/me", (route) => route.fulfill({ json: body }));
    await page.route("**/api/v1/account", (route) => {
      deleted++;
      body = signedOut;
      return route.fulfill({ status: 204 });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Hapus akun" }).click();
    const dialog = page.getByRole("dialog", { name: "Hapus akun?" });
    await dialog.getByRole("button", { name: "Batal" }).click();
    await expect(dialog).toHaveCount(0);
    expect(deleted).toBe(0);
    await page.getByRole("button", { name: "Hapus akun" }).click();
    await dialog.getByRole("button", { name: "Hapus akun" }).click();
    await expect(page.getByText("Akun dihapus.")).toBeVisible();
    expect(deleted).toBe(1);
  });

  test("has no horizontal overflow at 390 px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/", "/paket"]) {
      await me(page, signedOut);
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("paket", () => {
  test("signed out: Free active with 1 Slot (K-23), redeem needs sign-in, payments off", async ({ page }) => {
    await me(page, signedOut);
    await page.goto("/paket");
    await expect(page.locator(".lede")).toContainText("Belum masuk: kamu memakai paket Gratis di perangkat ini. Slot terpakai 0 dari 1.");
    await expect(page.locator(".paket__kartu--aktif h2")).toHaveText("Gratis");
    await expect(page.locator(".paket__kartu--aktif")).toContainText("1 Slot lomba aktif");
    await expect(page.locator("#infoBayar")).toHaveText("Pembayaran belum diaktifkan di server ini.");
    await expect(page.locator("#kodeRedeem")).toHaveCount(0);
    await page.getByRole("button", { name: /^Bulanan/ }).click();
    await expect(page.getByText("Masuk dengan Google dulu untuk berlangganan.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Ke halaman Masuk" })).toHaveAttribute("href", "/");
    expect((await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze()).violations).toEqual([]);
  });

  test("error state with retry", async ({ page }) => {
    let fail = true;
    await page.route("**/api/v1/me", (route) => route.fulfill(fail ? { status: 503, json: unavailable } : { json: signedOut }));
    await page.goto("/paket");
    await expect(page.locator(".error")).toContainText("Status paket tidak bisa dimuat.");
    fail = false;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("heading", { name: "Paket", level: 1 })).toBeVisible();
  });

  test("redeem: empty, rejected, then Pro with 3 Slots", async ({ page }) => {
    let body: unknown = free;
    await page.route("**/api/v1/me", (route) => route.fulfill({ json: body }));
    await page.route("**/api/v1/redeem", (route) => {
      const { code } = route.request().postDataJSON() as { code: string };
      expect(route.request().headers()["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
      if (code !== "SA-OKE") {
        return route.fulfill({ status: 422, json: { error: { code: "invalid_code", message: "Kode tidak dapat digunakan. Periksa kode dan coba lagi." } } });
      }
      body = pro;
      return route.fulfill({ json: { entitlement: { plan: "pro", ends_at: "2027-01-31T00:00:00Z" }, days: 30 } });
    });
    await page.goto("/paket");
    const tukar = page.getByRole("button", { name: "Tukarkan kode" });
    await tukar.click();
    await expect(page.locator("#galatRedeem")).toHaveText("Masukkan kode dulu.");
    await page.locator("#kodeRedeem").fill("SA-SALAH");
    await tukar.click();
    await expect(page.locator("#galatRedeem")).toHaveText("Kode tidak dapat digunakan. Periksa kode dan coba lagi.");
    await expect(page.locator("#kodeRedeem")).toHaveAttribute("aria-invalid", "true");
    await page.locator("#kodeRedeem").fill(" SA-OKE ");
    await tukar.click();
    await expect(page.getByText("Pro aktif selama 30 hari.")).toBeVisible();
    await expect(page.locator(".paket__kartu--aktif h2")).toHaveText("Pro");
    await expect(page.locator(".banner--ok")).toContainText("Pro aktif dari kode Sobat Ambis sampai 31 Januari 2027.");
    await expect(page.locator(".lede")).toContainText("Slot terpakai 0 dari 3.");
    await expect(page.locator("[data-bayar]")).toHaveCount(0);
  });

  test("expired Pro keeps data and says so", async ({ page }) => {
    await me(page, { ...free, plan: { ...free.plan, status: "expired" } });
    await page.goto("/paket");
    await expect(page.locator(".banner")).toContainText("Akses Pro-mu sudah berakhir. Data dan Slot-mu tetap tersimpan.");
  });
});
