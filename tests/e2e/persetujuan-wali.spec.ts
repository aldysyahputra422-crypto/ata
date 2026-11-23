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
const LAHIR_ANAK = `${TAHUN_ANAK}-05-01`;
const LAHIR_DEWASA = `${TAHUN_ANAK - 10}-05-01`;
const TOKEN = "t".repeat(43);
const TOKEN_CABUT = "c".repeat(43);
type Status = "none" | "pending" | "verified" | "declined" | "revoked" | "expired";
const butuhWali = { status: 403, json: { error: { code: "guardian_consent_required", message: "Perlu persetujuan orang tua/wali dulu." } } };

async function akun(page: Page, opts: { status?: Status; kirimEmail?: boolean; selesai?: boolean; hampir?: boolean; masuk?: boolean; hapus?: string; sisaKoreksi?: number } = {}) {
  const s = { status: opts.status ?? "none" as Status, kirim: [] as { url: string; body: unknown }[], revokedBy: null as string | null, koreksi: null as string | null, dewasa: false };
  const profil: Record<string, unknown> = {
    display_name: "Raka", jenjang: "SMA/SMK", birth_date: LAHIR_ANAK, birth_year: TAHUN_ANAK, institution: "SMAN 1", major: null, timezone: null, interests: ["KTI"], targets: ["Beasiswa"],
    skills: [], goals_text: null, weekly_hours: opts.hampir ? null : 6, onboarding_done: opts.selesai ?? false, updated_at: "2026-11-23T00:00:00Z",
  };
  const izin = Object.fromEntries(KATEGORI.map((k) => [k, false]));
  const adaWali = () => s.status !== "none";
  const consent = () => s.dewasa ? {
    status: "not_required", account_state: "not_required", required: false, delivery: "configured", birth_date: LAHIR_DEWASA,
    birth_date_known: true, corrections_left: 1, deletion_due_at: null, correction: null,
  } : ({
    status: s.status, account_state: s.status === "verified" ? "granted" : "pending", required: true,
    delivery: (opts.kirimEmail ?? true) ? "configured" : "not_configured", birth_date: LAHIR_ANAK, birth_date_known: true,
    corrections_left: opts.sisaKoreksi ?? 2, deletion_due_at: s.status === "declined" ? opts.hapus ?? null : null,
    correction: s.koreksi ? { birth_date: s.koreksi, guardian_name: "Bu Sari", contact_masked: "s***@contoh.id", expires_at: "2026-11-26T03:00:00Z" } : null,
    guardian_name: adaWali() ? "Bu Sari" : null, contact_masked: adaWali() ? "s***@contoh.id" : null,
    version: adaWali() ? "2026-11-wali-1" : null, scope: adaWali() ? KATEGORI : [],
    expires_at: s.status === "pending" ? "2026-11-26T03:00:00Z" : null, verified_at: s.status === "verified" ? "2026-11-23T03:00:00Z" : null, revoked_by: s.revokedBy,
  });
  const keluar = { status: 401, json: { error: { code: "unauthenticated", message: "Masuk dulu untuk melanjutkan." } } };
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: signedIn }));
  await page.route("**/api/v1/profile", (route) => {
    if (route.request().method() !== "GET") {
      const ubah = route.request().postDataJSON() as Record<string, unknown>;
      s.kirim.push({ url: "profile", body: ubah });
      // like the server: under 18 to adult is not the account's own change
      if (typeof ubah.birth_date === "string" && ubah.birth_date <= LAHIR_DEWASA) {
        return route.fulfill({ status: 409, json: { error: { code: "guardian_verification_required", field: "birth_date", message: "Koreksi ini mengubah statusmu menjadi dewasa, jadi perlu dikonfirmasi orang tua/wali lewat email." } } });
      }
      Object.assign(profil, ubah);
    }
    if (s.dewasa) profil.birth_date = LAHIR_DEWASA;
    return route.fulfill({ json: { profile: profil } });
  });
  await page.route("**/api/v1/consent/birth-date", (route) => {
    const hapus = route.request().method() === "DELETE";
    s.kirim.push({ url: hapus ? "koreksi-batal" : "koreksi", body: hapus ? null : route.request().postDataJSON() });
    if (hapus) { s.koreksi = null; return route.fulfill({ json: { status: "cancelled" } }); }
    if (!(opts.kirimEmail ?? true)) return route.fulfill({ status: 503, json: { error: { code: "delivery_not_configured", message: "Pengiriman email ke orang tua/wali belum dikonfigurasi." } } });
    s.koreksi = (route.request().postDataJSON() as { birth_date: string }).birth_date;
    return route.fulfill({ status: 202, json: { status: "pending" } });
  });
  await page.route("**/api/v1/profile/onboarding/complete", (route) => {
    s.kirim.push({ url: "complete", body: null });
    if (s.status !== "verified" && !s.dewasa) return route.fulfill(butuhWali);
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
    if (!(opts.kirimEmail ?? true)) return route.fulfill({ status: 503, json: { error: { code: "delivery_not_configured", message: "Pengiriman email ke orang tua/wali belum dikonfigurasi." } } });
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

  test("once the guardian confirms an adult birth date, the consent step ends and the old date is not saved back", async ({ page }) => {
    const s = await akun(page, { status: "pending" });
    await page.goto("/kenalan");
    await expect(page.locator('.wali[data-status="pending"]')).toBeVisible();
    s.dewasa = true; // the guardian confirmed the correction elsewhere
    await page.locator("#periksaWali").click();
    await expect(page.getByRole("heading", { name: /Selesai, Raka/ })).toBeVisible();
    await expect(page.locator("#langkahWali")).toHaveCount(0);
    expect(s.kirim.filter((k) => k.url === "profile")).toEqual([]);
    // going back through the answers shows the confirmed date, not the one typed before
    await page.locator("#ulangOnboard").click();
    for (let n = 0; n < 2; n++) await page.getByRole("button", { name: "Lanjut" }).click();
    await expect(page.locator("#jawab")).toHaveValue(LAHIR_DEWASA);
  });

  test("a correction confirmed while the questions are still open goes back to them instead of finishing", async ({ page }) => {
    const s = await akun(page, { hampir: true });
    await page.goto("/kenalan");
    await expect(page.getByRole("radio", { name: "5–7 jam" })).toBeVisible();
    for (let n = 0; n < 4; n++) await page.locator("#kembali").click();
    await expect(page.locator("#jawab")).toHaveValue(LAHIR_ANAK);
    await page.locator("#jawab").fill(LAHIR_DEWASA);
    await page.getByRole("button", { name: "Lanjut" }).click();
    // the server refuses the date; the guardian step opens from the middle of the questions
    await expect(page.getByRole("heading", { name: "Persetujuan orang tua/wali" })).toBeVisible();
    s.dewasa = true; // the guardian confirmed the corrected date elsewhere
    await page.getByLabel("Nama orang tua/wali").fill("Bu Sari");
    await page.getByLabel("Email orang tua/wali").fill("sari@contoh.id");
    await page.locator("#kirimWali").click();
    // the open question comes back; nothing was finished on the student's behalf
    await expect(page.getByRole("radio", { name: "5–7 jam" })).toBeVisible();
    await expect(page.locator("#langkahWali")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Selesai, Raka/ })).toHaveCount(0);
    expect(s.kirim.filter((k) => k.url === "complete")).toEqual([]);
    await page.getByRole("radio", { name: "5–7 jam" }).click();
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.getByRole("heading", { name: /Selesai, Raka/ })).toBeVisible();
    expect(s.kirim.filter((k) => k.url === "complete")).toHaveLength(1);
    expect(s.kirim.filter((k) => k.url === "profile" && (k.body as { birth_date?: string }).birth_date === LAHIR_ANAK)).toEqual([]);
  });

  test("says so when no email channel is wired, and offers no way around it", async ({ page }) => {
    const s = await akun(page, { hampir: true, kirimEmail: false });
    await page.goto("/kenalan");
    await page.getByRole("radio", { name: "5–7 jam" }).click();
    await page.getByRole("button", { name: "Selesai" }).click();
    await expect(page.locator("#waliBelumTersambung")).toContainText("Email ke wali belum dikonfigurasi");
    await expect(page.locator("#waliBelumTersambung")).toContainText("tidak ada email yang dianggap terkirim");
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
    await expect(page.locator(".wali[data-status]")).toContainText("Walimu menolak permintaan sebelumnya.");
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
    // the correction form is honest about it too
    await page.locator("#bukaKoreksi").click();
    await expect(page.locator("#kirimKoreksi")).toBeDisabled();
    await axe(page);
  });

  test("birth date: a correction towards adult is not saved by the form; the guardian is asked by email instead", async ({ page }) => {
    const galat = tanpaGalat(page);
    const s = await akun(page, { selesai: false, status: "pending" });
    await page.goto("/profil");
    await expect(page.locator("#p-birth_date")).toHaveValue(LAHIR_ANAK);
    await page.locator("#p-birth_date").fill(LAHIR_DEWASA);
    await page.locator("#simpanProfil").click();
    await expect(page.locator("#galatProfil")).toContainText("perlu dikonfirmasi orang tua/wali");
    for (const el of await page.getByRole("switch").all()) await expect(el).toBeDisabled();

    await page.locator("#bukaKoreksi").click();
    await expect(page.locator("#koreksiLahir")).toContainText("Sisa koreksi: 2");
    await expect(page.locator("#koreksiLahir")).toContainText("Ata tidak memeriksa identitas");
    await page.locator("#kirimKoreksi").click();
    await expect(page.locator("#galatKoreksi")).toContainText("Isi tanggal lahir lengkap");
    await page.locator("#k-birth_date").fill(LAHIR_DEWASA);
    await page.locator("#k-guardian_name").fill("Bu Sari");
    await page.locator("#k-guardian_email").fill("sari@contoh.id");
    await axe(page);
    await muat(page);
    await page.locator("#kirimKoreksi").dblclick();
    await expect(page.locator("#koreksiLahir")).toContainText("menunggu konfirmasi Bu Sari");
    await expect(page.locator("#koreksiLahir")).toContainText("Tanggal lahirmu belum berubah");
    expect(s.kirim.filter((k) => k.url === "koreksi")).toEqual([{ url: "koreksi", body: { birth_date: LAHIR_DEWASA, guardian_name: "Bu Sari", guardian_email: "sari@contoh.id" } }]);
    // still pending: nothing unlocked by asking
    for (const el of await page.getByRole("switch").all()) await expect(el).toBeDisabled();
    await page.locator("#batalKoreksi").click();
    await expect(page.locator("#kirimKoreksi")).toBeVisible();
    await expect(page.locator("#batalKoreksi")).toHaveCount(0);
    expect(s.kirim.at(-1)?.url).toBe("koreksi-batal");
    expect(galat).toEqual([]);
  });

  test("a guardian's refusal is shown with what happens to the data, and the correction limit is said", async ({ page }) => {
    await akun(page, { selesai: false, status: "declined", hapus: "2026-11-30T03:00:00Z", sisaKoreksi: 0 });
    await page.goto("/profil?tema=gelap");
    await expect(page.locator("#kartuWali")).toContainText("Walimu menolak permintaan sebelumnya");
    await expect(page.locator("#hapusDiminta")).toContainText("Walimu meminta akun ini dihapus");
    await expect(page.locator("#hapusDiminta")).toContainText("30 November 2026");
    for (const el of await page.getByRole("switch").all()) await expect(el).toBeDisabled();
    await page.locator("#bukaKoreksi").click();
    await expect(page.locator("#koreksiLahir")).toContainText("Batas koreksi sudah habis");
    await expect(page.locator("#kirimKoreksi")).toBeDisabled();
    await axe(page);
    await muat(page);
  });
});

test.describe("guardian page", () => {
  const tautan = { kind: "confirm", student_name: "Raka", guardian_name: "Bu Sari", version: "2026-11-wali-1", scope: KATEGORI, expires_at: "2026-11-26T03:00:00Z", verified_at: null, birth_date: null };
  const TOKEN_KOREKSI = "k".repeat(43);
  async function wali(page: Page, opts: { lookup?: () => { status: number; json: unknown } } = {}) {
    const kirim: { url: string; body: unknown }[] = [];
    let terpakai = false;
    const tidakBerlaku = { status: 404, json: { error: { code: "invalid_token", message: "Tautan ini tidak berlaku." } } };
    await page.route("**/api/v1/consent/guardian/lookup", (route) => {
      const b = route.request().postDataJSON() as { token: string };
      kirim.push({ url: "lookup", body: b });
      if (opts.lookup) return route.fulfill(opts.lookup());
      if (b.token === TOKEN_CABUT) return route.fulfill({ json: { ...tautan, kind: "withdraw", expires_at: null, verified_at: "2026-11-23T03:00:00Z" } });
      if (b.token === TOKEN_KOREKSI && !terpakai) return route.fulfill({ json: { ...tautan, kind: "correction", scope: [], version: null, birth_date: "2000-05-01" } });
      return b.token === TOKEN && !terpakai ? route.fulfill({ json: tautan }) : route.fulfill(tidakBerlaku);
    });
    await page.route("**/api/v1/consent/guardian/confirm", (route) => {
      const b = route.request().postDataJSON() as { token: string; approve: boolean; request_deletion?: boolean };
      kirim.push({ url: "confirm", body: b });
      if (terpakai) return route.fulfill(tidakBerlaku);
      terpakai = true;
      if (b.token === TOKEN_KOREKSI) return route.fulfill({ json: { status: b.approve ? "corrected" : "declined" } });
      return route.fulfill({ json: b.approve ? { status: "verified", withdraw_token: TOKEN_CABUT } : { status: "declined", deletion_requested: b.request_deletion === true } });
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
    // no claim that the link proves who the guardian is
    await expect(page.locator("#batasVerifikasi")).toContainText("Ata tidak memeriksa identitas Anda atau hubungan hukum Anda dengan Raka");
    await expect(page.getByRole("checkbox")).toHaveAccessibleName(/Saya menyatakan bahwa saya orang tua\/wali dari Raka/);
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
    // refusing asks once more and offers, unticked, to have the child's account deleted
    await expect(page.getByRole("heading", { name: "Tolak permintaan Raka?" })).toBeVisible();
    await expect(page.locator("#hapusData")).not.toBeChecked();
    expect(kirim.filter((k) => k.url === "confirm")).toHaveLength(0);
    await axe(page);
    await page.locator("#yaTolak").click();
    await expect(page.getByRole("heading", { name: "Permintaan ditolak" })).toBeVisible();
    await expect(page.locator("#infoHapus")).toContainText("tidak dihapus otomatis");
    expect(kirim.at(-1)).toEqual({ url: "confirm", body: { token: TOKEN, approve: false, request_deletion: false } });

    await page.goto("/wali/persetujuan#c=" + TOKEN_CABUT);
    await expect(page.getByRole("heading", { name: "Cabut persetujuan untuk Raka?" })).toBeVisible();
    await axe(page);
    await page.locator("#cabut").click();
    await expect(page.getByRole("heading", { name: "Persetujuan dicabut" })).toBeVisible();
    expect(kirim.at(-1)).toEqual({ url: "withdraw", body: { token: TOKEN_CABUT } });

    await page.unrouteAll();
    const lagi = await wali(page);
    await page.goto("/wali/persetujuan#t=" + TOKEN);
    await page.locator("#tolak").click();
    await page.locator("#hapusData").check();
    await page.locator("#yaTolak").click();
    await expect(page.locator("#infoHapus")).toContainText("dijadwalkan tujuh hari dari sekarang");
    expect(lagi.at(-1)).toEqual({ url: "confirm", body: { token: TOKEN, approve: false, request_deletion: true } });

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

  test("a birth date correction changes nothing until the guardian states the date is right", async ({ page }) => {
    const galat = tanpaGalat(page);
    const kirim = await wali(page);
    await page.goto("/wali/persetujuan#t=" + TOKEN_KOREKSI);
    await expect(page.getByRole("heading", { name: "Konfirmasi tanggal lahir Raka" })).toBeVisible();
    await expect(page.locator(".lede")).toContainText("1 Mei 2000");
    await expect(page.locator("#batasVerifikasi")).toContainText("Ata tidak memeriksa identitas");
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
    await expect(page.getByRole("heading", { name: "Tanggal lahir dikoreksi" })).toBeVisible();
    expect(kirim.filter((k) => k.url === "confirm")).toEqual([{ url: "confirm", body: { token: TOKEN_KOREKSI, approve: true, verifier_name: "Sari Wulandari", is_guardian: true } }]);
    expect(new URL(page.url()).hash).toBe("");

    await page.unrouteAll();
    const lagi = await wali(page);
    await page.goto("/wali/persetujuan?tema=gelap#t=" + TOKEN_KOREKSI);
    await axe(page);
    await page.locator("#tolak").click();
    await expect(page.getByRole("heading", { name: "Permintaan ditolak" })).toBeVisible();
    await expect(page.locator(".lede")).toContainText("tidak diubah");
    expect(lagi.at(-1)).toEqual({ url: "confirm", body: { token: TOKEN_KOREKSI, approve: false } });
    expect(galat).toEqual([]);
  });
});
