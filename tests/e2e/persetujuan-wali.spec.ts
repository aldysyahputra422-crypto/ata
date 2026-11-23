import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// FR-AUTH-07: guardian consent for accounts under 18. The account API is stubbed and, like the server, owns the
// decision: onboarding and AI permissions answer 403 until the guardian has confirmed from their own link.
const features = { activeSlots: { status: "final", limit: 1 } };
const base = { slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false }, ai: { mode: "B", connections: 0, search_connections: 0 } };
const plan = { plan: "free", status: "free", sources: [], features };
const signedIn = { ...base, signed_in: true, plan, user: { id: "u1", email: "raka@example.com", display_name: "Raka Pratama", role: "user" } };
const KATEGORI = ["profil", "akademik", "lomba", "tugas", "progres", "evaluasi", "ingatan", "dokumen"];
const TAHUN_ANAK = new Date().getFullYear() - 16;
const TOKEN = "t".repeat(43);
const TOKEN_CABUT = "c".repeat(43);
type Status = "none" | "pending" | "verified" | "declined" | "revoked" | "expired";
const butuhWali = { status: 403, json: { error: { code: "guardian_consent_required", message: "Perlu persetujuan orang tua/wali dulu." } } };

async function akun(page: Page, opts: { status?: Status; kirimEmail?: boolean; selesai?: boolean; hampir?: boolean; masuk?: boolean } = {}) {
  const s = { status: opts.status ?? "none" as Status, kirim: [] as { url: string; body: unknown }[], revokedBy: null as string | null };
  const profil: Record<string, unknown> = {
    display_name: "Raka", jenjang: "SMA/SMK", birth_year: TAHUN_ANAK, institution: "SMAN 1", major: null, timezone: null, interests: ["KTI"], targets: ["Beasiswa"],
    skills: [], goals_text: null, weekly_hours: opts.hampir ? null : 6, onboarding_done: opts.selesai ?? false, updated_at: "2026-11-23T00:00:00Z",
  };
  const izin = Object.fromEntries(KATEGORI.map((k) => [k, false]));
  const adaWali = () => s.status !== "none";
  const consent = () => ({
    status: s.status, required: true, delivery_available: opts.kirimEmail ?? true,
    guardian_name: adaWali() ? "Bu Sari" : null, contact_masked: adaWali() ? "s***@contoh.id" : null,
    version: adaWali() ? "2026-11-wali-1" : null, scope: adaWali() ? KATEGORI : [],
    expires_at: s.status === "pending" ? "2026-11-26T03:00:00Z" : null, verified_at: s.status === "verified" ? "2026-11-23T03:00:00Z" : null, revoked_by: s.revokedBy,
  });
  const keluar = { status: 401, json: { error: { code: "unauthenticated", message: "Masuk dulu untuk melanjutkan." } } };
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: signedIn }));
  await page.route("**/api/v1/profile", (route) => {
    if (route.request().method() !== "GET") Object.assign(profil, route.request().postDataJSON());
    return route.fulfill({ json: { profile: profil } });
  });
  await page.route("**/api/v1/profile/onboarding/complete", (route) => {
    s.kirim.push({ url: "complete", body: null });
    if (s.status !== "verified") return route.fulfill(butuhWali);
    profil.onboarding_done = true;
    return route.fulfill({ json: { done: true } });
  });
  await page.route("**/api/v1/permissions", (route) => {
    if (route.request().method() === "PATCH") {
      const b = route.request().postDataJSON() as { category: string; allowed: boolean };
      s.kirim.push({ url: "permissions", body: b });
      if (b.allowed && s.status !== "verified") return route.fulfill(butuhWali);
      izin[b.category] = b.allowed;
    }
    return route.fulfill({ json: { categories: izin, updated_at: null } });
  });
  await page.route("**/api/v1/consent", (route) => (opts.masuk === false ? route.fulfill(keluar) : route.fulfill({ json: { consent: consent() } })));
  await page.route("**/api/v1/consent/request", (route) => {
    s.kirim.push({ url: "request", body: route.request().postDataJSON() });
    if (!(opts.kirimEmail ?? true)) return route.fulfill({ status: 503, json: { error: { code: "delivery_unavailable", message: "Email ke wali belum tersambung." } } });
    s.status = "pending";
    return route.fulfill({ status: 202, json: { status: "pending" } });
  });
  await page.route("**/api/v1/consent/revoke", (route) => {
    s.kirim.push({ url: "revoke", body: null });
    const lama = s.status;
    s.status = lama === "verified" ? "revoked" : "none";
    s.revokedBy = lama === "verified" ? "user" : null;
    for (const k of KATEGORI) izin[k] = false;
    profil.onboarding_done = false;
    return route.fulfill({ json: { status: "revoked" } });
  });
  return s;
}

const tanpaGalat = (page: Page) => {
  const galat: string[] = [];
  page.on("pageerror", (e) => galat.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) galat.push(m.text()); });
  return galat;
};
const axe = async (page: Page) => expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
const muat = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

test.describe("kenalan: an account under 18 needs its guardian", () => {
  test("cannot finish until the guardian has confirmed; asking sends one request and waits", async ({ page }) => {
    const galat = tanpaGalat(page);
    const s = await akun(page, { hampir: true });
    await page.goto("/kenalan");
    await page.getByRole("radio", { name: "5–7 jam" }).click();
    await page.getByRole("button", { name: "Selesai" }).click();

    await expect(page.getByRole("heading", { name: "Persetujuan orang tua/wali" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Selesai, Raka/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Mulai pakai Ata" })).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await axe(page);
    await muat(page);

    await page.locator("#kirimWali").click();
    await expect(page.locator("#galatWali")).toContainText("Isi nama");
    await page.getByLabel("Nama orang tua/wali").fill("Bu Sari");
    await page.getByLabel("Email orang tua/wali").fill("bukan email");
    await page.locator("#kirimWali").click();
    await expect(page.locator("#galatWali")).toContainText("alamat email");
    expect(s.kirim.filter((k) => k.url === "request")).toHaveLength(0);

    await page.getByLabel("Email orang tua/wali").fill("sari@contoh.id");
    await page.locator("#kirimWali").dblclick();
    await expect(page.locator('.wali[data-status="pending"]')).toContainText("Menunggu jawaban Bu Sari di s***@contoh.id");
    expect(s.kirim.filter((k) => k.url === "request")).toEqual([{ url: "request", body: { guardian_name: "Bu Sari", guardian_email: "sari@contoh.id" } }]);
    await expect(page.getByRole("button", { name: "Selesai" })).toHaveCount(0);
    await axe(page);

    // checking again changes nothing while the guardian has not answered
    await page.locator("#periksaWali").click();
    await expect(page.locator('.wali[data-status="pending"]')).toBeVisible();

    // a reload comes back to the waiting step, not to a finished onboarding
    await page.reload();
    await expect(page.locator('.wali[data-status="pending"]')).toBeVisible();

    // the guardian confirms elsewhere; only then does the server let onboarding finish
    s.status = "verified";
    await page.locator("#periksaWali").click();
    await expect(page.locator('.wali[data-status="verified"]')).toContainText("Disetujui wali");
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByRole("heading", { name: /Selesai, Raka/ })).toBeVisible();
    expect(s.kirim.filter((k) => k.url === "complete")).toHaveLength(2);
    expect(galat).toEqual([]);
  });

  test("says so when no email channel is wired, and offers no way around it", async ({ page }) => {
    const s = await akun(page, { hampir: true, kirimEmail: false });
    await page.goto("/kenalan");
    await page.getByRole("radio", { name: "5–7 jam" }).click();
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.locator("#waliBelumTersambung")).toContainText("Email ke wali belum tersambung");
    await expect(page.locator("#waliBelumTersambung")).toContainText("tidak dianggap persetujuan");
    await expect(page.locator("#kirimWali")).toBeDisabled();
    await expect(page.getByLabel("Nama orang tua/wali")).toBeDisabled();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Selesai" })).toHaveCount(0);
    expect(s.kirim.filter((k) => k.url === "request")).toHaveLength(0);
    await axe(page);
    await muat(page);
  });

  test("a declined request is shown and can be asked again; dark theme passes axe", async ({ page }) => {
    await akun(page, { status: "declined" });
    await page.goto("/kenalan?tema=gelap");
    await expect(page.getByRole("heading", { name: "Persetujuan orang tua/wali" })).toBeVisible();
    await expect(page.locator(".wali")).toContainText("Wali menolak permintaan sebelumnya.");
    await expect(page.locator("#kirimWali")).toBeEnabled();
    await axe(page);
  });
});

test.describe("profil: AI permissions of an account under 18", () => {
  test("are locked without consent, and a forced request is refused by the server", async ({ page }) => {
    const galat = tanpaGalat(page);
    const s = await akun(page, { selesai: true });
    await page.goto("/profil");
    await expect(page.locator("#kartuWali")).toBeVisible();
    await expect(page.locator("#izinTerkunci")).toContainText("Izin terkunci sampai orang tua/walimu menyetujui");
    const saklar = page.getByRole("switch");
    await expect(saklar).toHaveCount(8);
    for (const el of await saklar.all()) { await expect(el).toBeDisabled(); await expect(el).not.toBeChecked(); }
    await axe(page);
    await muat(page);

    // a request forged past the disabled switch gets the server's 403
    const status = await page.evaluate(async () => (await fetch("/api/v1/permissions", {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: "dokumen", allowed: true }),
    })).status);
    expect(status).toBe(403);
    await page.reload();
    await expect(page.getByRole("switch", { name: "Dokumen" })).not.toBeChecked();
    expect(s.kirim.filter((k) => k.url === "permissions")).toHaveLength(1);
    expect(galat).toEqual([]);
  });

  test("open after the guardian confirms; withdrawing turns every category off again", async ({ page }) => {
    const s = await akun(page, { selesai: true, status: "verified" });
    await page.goto("/profil");
    await expect(page.locator('#kartuWali .wali[data-status="verified"]')).toContainText("Bu Sari (s***@contoh.id)");
    await expect(page.locator("#izinTerkunci")).toHaveCount(0);
    await page.getByRole("switch", { name: "Tugas" }).click();
    await expect(page.getByRole("switch", { name: "Tugas" })).toBeChecked();
    await axe(page);

    await page.locator("#cabutWali").click();
    expect(s.kirim.filter((k) => k.url === "revoke")).toHaveLength(0);
    await page.locator("#yaCabutWali").click();
    await expect(page.locator('#kartuWali .wali[data-status="revoked"]')).toContainText("Persetujuan dicabut. Semua izin AI mati.");
    await expect(page.getByRole("switch", { name: "Tugas" })).not.toBeChecked();
    await expect(page.getByRole("switch", { name: "Tugas" })).toBeDisabled();
    await expect(page.locator("#izinTerkunci")).toBeVisible();
    expect(s.kirim.filter((k) => k.url === "revoke")).toHaveLength(1);
  });

  test("stay locked when the consent status cannot be read; no email channel is said plainly; dark theme passes axe", async ({ page }) => {
    await akun(page, { selesai: true, kirimEmail: false });
    await page.route("**/api/v1/consent", (route) => route.fulfill({ status: 503, json: { error: { code: "unavailable", message: "Layanan akun belum tersedia." } } }));
    await page.goto("/profil");
    await expect(page.locator("#izinTerkunci")).toContainText("Status persetujuan wali belum bisa dimuat");
    for (const el of await page.getByRole("switch").all()) await expect(el).toBeDisabled();

    await page.unrouteAll();
    await akun(page, { selesai: true, kirimEmail: false });
    await page.goto("/profil?tema=gelap");
    await expect(page.locator("#waliBelumTersambung")).toBeVisible();
    await expect(page.locator("#kirimWali")).toBeDisabled();
    await axe(page);
  });
});

test.describe("guardian page", () => {
  const tautan = { kind: "confirm", student_name: "Raka", guardian_name: "Bu Sari", version: "2026-11-wali-1", scope: KATEGORI, expires_at: "2026-11-26T03:00:00Z", verified_at: null };
  async function wali(page: Page, opts: { lookup?: () => { status: number; json: unknown } } = {}) {
    const kirim: { url: string; body: unknown }[] = [];
    let terpakai = false;
    const tidakBerlaku = { status: 404, json: { error: { code: "invalid_token", message: "Tautan ini tidak berlaku." } } };
    await page.route("**/api/v1/consent/guardian/lookup", (route) => {
      const b = route.request().postDataJSON() as { token: string };
      kirim.push({ url: "lookup", body: b });
      if (opts.lookup) return route.fulfill(opts.lookup());
      if (b.token === TOKEN_CABUT) return route.fulfill({ json: { ...tautan, kind: "withdraw", expires_at: null, verified_at: "2026-11-23T03:00:00Z" } });
      return b.token === TOKEN && !terpakai ? route.fulfill({ json: tautan }) : route.fulfill(tidakBerlaku);
    });
    await page.route("**/api/v1/consent/guardian/confirm", (route) => {
      const b = route.request().postDataJSON() as { approve: boolean };
      kirim.push({ url: "confirm", body: b });
      if (terpakai) return route.fulfill(tidakBerlaku);
      terpakai = true;
      return route.fulfill({ json: b.approve ? { status: "verified", withdraw_token: TOKEN_CABUT } : { status: "declined" } });
    });
    await page.route("**/api/v1/consent/guardian/withdraw", (route) => {
      kirim.push({ url: "withdraw", body: route.request().postDataJSON() });
      return route.fulfill({ json: { status: "revoked" } });
    });
    return kirim;
  }

  test("approval needs the guardian's name and statement, uses the link once, and hands over a withdrawal link", async ({ page }) => {
    const galat = tanpaGalat(page);
    const kirim = await wali(page);
    await page.goto("/wali/persetujuan#t=" + TOKEN);
    await expect(page.getByRole("heading", { name: "Persetujuan untuk Raka" })).toBeVisible();
    await expect(page.locator(".card li")).toHaveCount(8);
    await axe(page);
    await muat(page);

    await page.locator("#setuju").click();
    await expect(page.locator("#galatWali")).toContainText("Ketik nama lengkap");
    await page.getByLabel("Nama lengkap Anda").fill("Sari Wulandari");
    await page.locator("#setuju").click();
    await expect(page.locator("#galatWali")).toContainText("Centang pernyataan");
    expect(kirim.filter((k) => k.url === "confirm")).toHaveLength(0);

    await page.getByRole("checkbox").check();
    await page.locator("#setuju").dblclick();
    await expect(page.getByRole("heading", { name: "Persetujuan tercatat" })).toBeVisible();
    expect(kirim.filter((k) => k.url === "confirm")).toEqual([{ url: "confirm", body: { token: TOKEN, approve: true, verifier_name: "Sari Wulandari", is_guardian: true } }]);
    await expect(page.locator("#tautanCabut")).toHaveValue(new RegExp(`/wali/persetujuan#c=${TOKEN_CABUT}$`));
    // the used token is gone from the address bar
    expect(new URL(page.url()).hash).toBe("");
    await axe(page);

    // the same link no longer works
    await page.goto("/wali/persetujuan#t=" + TOKEN);
    await expect(page.getByRole("heading", { name: "Tautan tidak berlaku" })).toBeVisible();
    expect(galat).toEqual([]);
  });

  test("declining, withdrawing, and links that are missing, malformed or broken", async ({ page }) => {
    const kirim = await wali(page);
    await page.goto("/wali/persetujuan");
    await expect(page.getByRole("heading", { name: "Buka tautan dari email" })).toBeVisible();
    await page.goto("/wali/persetujuan#t=pendek");
    await expect(page.getByRole("heading", { name: "Buka tautan dari email" })).toBeVisible();
    expect(kirim).toHaveLength(0);

    await page.goto("/wali/persetujuan#t=" + TOKEN);
    await page.locator("#tolak").click();
    await expect(page.getByRole("heading", { name: "Permintaan ditolak" })).toBeVisible();
    expect(kirim.at(-1)).toEqual({ url: "confirm", body: { token: TOKEN, approve: false } });

    await page.goto("/wali/persetujuan#c=" + TOKEN_CABUT);
    await expect(page.getByRole("heading", { name: "Cabut persetujuan untuk Raka?" })).toBeVisible();
    await axe(page);
    await page.locator("#cabut").click();
    await expect(page.getByRole("heading", { name: "Persetujuan dicabut" })).toBeVisible();
    expect(kirim.at(-1)).toEqual({ url: "withdraw", body: { token: TOKEN_CABUT } });

    await page.unrouteAll();
    let gagal = true;
    await wali(page, { lookup: () => (gagal ? { status: 503, json: { error: { code: "unavailable", message: "Layanan akun belum tersedia. Coba lagi nanti." } } } : { status: 200, json: tautan }) });
    await page.goto("/wali/persetujuan?tema=gelap#t=" + TOKEN);
    await expect(page.locator(".error")).toContainText("Tautan belum bisa diperiksa");
    gagal = false;
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("heading", { name: "Persetujuan untuk Raka" })).toBeVisible();
    await axe(page);
  });
});
