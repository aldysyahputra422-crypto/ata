import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Tanya Ata (FR-CCH-01, FR-CCH-06, FR-CCH-07, FR-BYOK-01, FR-BYOK-03). The Tanya Ata API is stubbed: no AI provider is
// called. The stub mirrors the server's contract: status, a prompt for Mode Tanpa Key, and a server-sent event stream.
const KATEGORI = ["profil", "akademik", "lomba", "tugas", "progres", "evaluasi", "ingatan", "dokumen"];
const KEY = "sk-uji-RAHASIA-9876";
const providers = [
  { id: "openai", name: "OpenAI", notes: "", needs_base_url: false },
  { id: "anthropic", name: "Anthropic", notes: "", needs_base_url: false },
  { id: "google", name: "Google Gemini", notes: "", needs_base_url: false },
  { id: "openrouter", name: "OpenRouter", notes: "", needs_base_url: false },
  { id: "custom", name: "Kustom (OpenAI-compatible)", notes: "", needs_base_url: true },
];
const connection = { provider_id: "openai", provider_name: "OpenAI", model: "model-uji", last4: "9876", expires_at: "2026-11-23T12:00:00Z" };
const asal = {
  intent: "review_ide", intent_label: "Review ide",
  sources: [{ id: "S1", category: "lomba", label: "Slot: Lomba Esai Nasional", text: "Lomba: Lomba Esai Nasional\nTenggat: 2026-12-10" }],
  blocked: [{ category: "profil", reason: "permission_off" }], empty: [], trimmed: [],
};
const sse = (events: unknown[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
const jawaban = [
  { type: "meta", provider: "OpenAI", model: "model-uji", provenance: asal },
  { type: "delta", text: "Idemu **kuat** karena dekat dengan tema [S1].\n\n- Perjelas data\n- Tambah contoh" },
  { type: "done", warnings: [] },
];

type Opsi = { masuk?: boolean; tersambung?: boolean; izin?: string[]; alasan?: string; status?: () => number | undefined; chat?: () => { status?: number; body: unknown } };
async function tanya(page: Page, o: Opsi = {}) {
  const st = { tersambung: o.tersambung ?? false };
  const kirim: { url: string; body: Record<string, unknown> }[] = [];
  const masuk = o.masuk !== false;
  await page.route("**/api/v1/me", (route) => route.fulfill({ json: {
    signed_in: masuk, slot_limits: { free: 1, pro: 3 }, config: { google: true, payments: false },
    plan: { plan: "free", status: "free", sources: [], features: { activeSlots: { limit: 1 } } },
    ...(masuk ? { user: { id: "u1", email: "raka@example.com", display_name: "Raka", role: "user" } } : {}),
  } }));
  await page.route("**/api/v1/tanya/status", (route) => {
    const gagal = o.status?.();
    if (gagal) return route.fulfill({ status: gagal, json: { error: { code: "unavailable", message: "Layanan akun belum tersedia. Coba lagi nanti." } } });
    // As on the server: an account that needs guardian consent has no AI connection and cannot add one.
    const wali = o.alasan === "guardian_consent_required";
    return route.fulfill({ json: {
      signed_in: masuk, byok_available: masuk && !wali, connection: masuk && st.tersambung && !wali ? connection : null, providers,
      permissions: Object.fromEntries(KATEGORI.map((k) => [k, o.izin?.includes(k) ? { allowed: true } : { allowed: false, reason: masuk ? o.alasan ?? "permission_off" : "signed_out" }])),
    } });
  });
  await page.route("**/api/v1/tanya/prompt", (route) => {
    kirim.push({ url: "prompt", body: route.request().postDataJSON() });
    return route.fulfill({ json: { mode: "handoff", prompt: "Kamu adalah Ata.\n\nPertanyaanku:\n" + route.request().postDataJSON().question, provenance: { ...asal, sources: [], blocked: [{ category: "lomba", reason: masuk ? "permission_off" : "signed_out" }] } } });
  });
  await page.route("**/api/v1/tanya/chat", (route) => {
    kirim.push({ url: "chat", body: route.request().postDataJSON() });
    const balas = o.chat?.() ?? { body: jawaban };
    if (balas.status) return route.fulfill({ status: balas.status, json: balas.body });
    return route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(balas.body as unknown[]) });
  });
  await page.route("**/api/v1/connections/models", (route) => {
    const body = route.request().postDataJSON();
    kirim.push({ url: "models", body });
    if (body.api_key !== KEY) return route.fulfill({ status: 422, json: { error: { code: "key_rejected", message: "Key ditolak provider. Periksa atau ganti key-mu." } } });
    return route.fulfill({ json: { ok: true, models: ["model-uji", "model-lain"] } });
  });
  await page.route("**/api/v1/connections", (route) => {
    if (route.request().method() === "DELETE") {
      kirim.push({ url: "putus", body: {} });
      st.tersambung = false;
      return route.fulfill({ json: { connection: null } });
    }
    kirim.push({ url: "sambung", body: route.request().postDataJSON() });
    st.tersambung = true;
    return route.fulfill({ status: 201, json: { connection } });
  });
  return { kirim };
}
const axe = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" ")}`);

test.describe("Tanya Ata", () => {
  test("the Tanya tab opens the screen inside the app shell", async ({ page }) => {
    await tanya(page);
    await page.goto("/ata");
    await expect(page.getByRole("heading", { level: 1, name: "Tanya Ata" })).toBeVisible();
    await expect(page.locator('nav [aria-current="page"]').filter({ visible: true })).toContainText("Tanya");
  });

  test("loading, then an error with retry, then the empty state", async ({ page }) => {
    let n = 0;
    await tanya(page, { status: () => (n++ === 0 ? 503 : undefined) });
    await page.goto("/ata");
    await expect(page.locator(".tanya [role=alert]")).toContainText("Layanan akun belum tersedia");
    await page.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.getByRole("heading", { name: "Mau tanya apa?" })).toBeVisible();
    await expect(page.locator("#aiStatus")).toContainText("Mode Tanpa Key: Ata tidak menjalankan AI");
    await expect(page.locator(".ctxline")).toContainText("tidak memakai data akunmu");
    expect(await axe(page)).toEqual([]);
  });

  test("signed out: no account data, no connect button, prompt hand-off still works", async ({ page }) => {
    const { kirim } = await tanya(page, { masuk: false });
    await page.goto("/ata");
    await expect(page.getByText("Kamu belum masuk, jadi Ata")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sambungkan AI" })).toHaveCount(0);
    await page.getByRole("button", { name: "lihat" }).click();
    await expect(page.locator("#ctxDetail li")).toHaveCount(8);
    await expect(page.locator("#ctxDetail li").first()).toContainText("tidak dipakai, kamu belum masuk");
    await page.getByLabel("Tulis pesan untuk Ata").fill("Bagaimana cara mulai esai?");
    await page.getByRole("button", { name: "Siapkan prompt" }).click();
    const sheet = page.getByRole("dialog", { name: "Prompt siap disalin" });
    await expect(sheet).toContainText("Ini bukan jawaban AI");
    await expect(sheet.locator("#promptSalin")).toContainText("Pertanyaanku:\nBagaimana cara mulai esai?");
    expect(await axe(page)).toEqual([]);
    expect(kirim.map((k) => k.url)).toEqual(["prompt"]);
    await expect(page.locator(".msg")).toHaveCount(0);
  });

  test("guardian consent: the screen says why data is not used", async ({ page }) => {
    await tanya(page, { alasan: "guardian_consent_required" });
    await page.goto("/ata");
    await page.getByRole("button", { name: "lihat" }).click();
    await expect(page.locator("#ctxDetail li").nth(2)).toContainText("Lomba: tidak dipakai, butuh persetujuan orang tua atau wali");
  });

  test("the composer enforces 12.000 characters and quick actions fill it", async ({ page }) => {
    const { kirim } = await tanya(page, { tersambung: true });
    await page.goto("/ata");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator("#galatTempel")).toHaveText("Tulis pertanyaanmu dulu.");
    await page.getByLabel("Tulis pesan untuk Ata").fill("a".repeat(12001));
    await expect(page.locator("#hitung")).toHaveText("12.001/12.000");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator("#galatTempel")).toHaveText("Teksmu 12.001 karakter, batasnya 12.000. Potong 1 karakter dulu.");
    expect(kirim).toEqual([]);
    await page.getByRole("button", { name: "Pecah tugas" }).click();
    await expect(page.getByLabel("Tulis pesan untuk Ata")).toHaveValue("Pecah tugasku minggu ini jadi langkah kecil.");
  });

  test("connecting a key: rejected key, model list, save; the key is not shown again", async ({ page }) => {
    const { kirim } = await tanya(page);
    await page.goto("/ata");
    await page.getByRole("button", { name: "Sambungkan AI" }).click();
    const sheet = page.getByRole("dialog", { name: "Sambungkan AI-mu" });
    await expect(sheet.getByRole("radio")).toHaveCount(5);
    await expect(sheet.getByRole("button", { name: "Uji koneksi & simpan" })).toBeDisabled();
    // Uji Koneksi is explained before it can run, and opening the sheet or typing a key calls nothing.
    await expect(sheet.locator("#infoUji")).toContainText("hanya berjalan saat kamu menekan tombolnya");
    await expect(sheet.locator("#infoUji")).toContainText("bisa memakai sedikit kuotamu");
    await expect(sheet.locator("#infoUji")).toContainText("Maksimal 5 uji per 10 menit");
    expect(kirim.filter((k) => k.url === "models" || k.url === "sambung")).toEqual([]);
    await sheet.getByLabel("API key").fill("sk-salah-12345");
    await sheet.getByRole("button", { name: "Cek key" }).click();
    await expect(sheet.getByRole("alert")).toHaveText("Key ditolak provider. Periksa atau ganti key-mu.");
    await sheet.getByLabel("API key").fill(KEY);
    await sheet.getByRole("button", { name: "Cek key" }).click();
    await expect(sheet.getByLabel("Model")).toHaveValue("model-uji");
    await expect(sheet).toContainText("2 model chat tersedia");
    expect(await axe(page)).toEqual([]);
    await sheet.getByRole("button", { name: "Uji koneksi & simpan" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.locator("#aiStatus")).toContainText("Tersambung ke OpenAI · model-uji");
    expect(kirim.at(-1)).toEqual({ url: "sambung", body: { provider_id: "openai", api_key: KEY, model: "model-uji" } });
    await expect(page.locator("body")).not.toContainText("RAHASIA");
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toContain("RAHASIA");
    await page.getByRole("button", { name: "Atur", exact: true }).click();
    await expect(sheet).toContainText("key berakhiran 9876");
    await expect(sheet.getByLabel("API key")).toHaveValue("");
    await sheet.getByRole("button", { name: "Putuskan & hapus key" }).click();
    await expect(page.locator("#aiStatus")).toContainText("Mode Tanpa Key");
  });

  test("a custom provider asks for an https address", async ({ page }) => {
    const { kirim } = await tanya(page);
    await page.goto("/ata");
    await page.getByRole("button", { name: "Sambungkan AI" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("radio", { name: "Kustom" }).check();
    await sheet.getByLabel("Alamat API (https)").fill("https://ai.contoh.id/v1");
    await sheet.getByLabel("API key").fill(KEY);
    await sheet.getByRole("button", { name: "Cek key" }).click();
    await expect(sheet).toContainText("2 model chat tersedia");
    expect(kirim[0].body).toEqual({ provider_id: "custom", api_key: KEY, base_url: "https://ai.contoh.id/v1" });
  });

  test("connected: the answer streams in, is labelled as AI, and shows the data it used", async ({ page }) => {
    const { kirim } = await tanya(page, { tersambung: true, izin: ["lomba"] });
    await page.goto("/ata");
    await expect(page.locator(".ctxline")).toContainText("1 dari 8");
    await page.getByLabel("Tulis pesan untuk Ata").fill("Tolong review ideku soal sampah plastik");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator(".msg--me .msg__bubble")).toHaveText("Tolong review ideku soal sampah plastik");
    const ata = page.locator(".msg--ata");
    await expect(ata.locator(".msg__sumber--ai")).toHaveText("AI · model-uji");
    await expect(ata.locator(".msg__bubble strong")).toHaveText("kuat");
    await expect(ata.locator(".msg__bubble li")).toHaveCount(2);
    await ata.locator("summary").click();
    await expect(ata.locator(".tanya__sumber")).toContainText("[S1] Slot: Lomba Esai Nasional");
    await expect(ata.locator(".tanya__sumber")).toContainText("Tidak dipakai: Profil (izinnya mati).");
    await expect(page.getByLabel("Tulis pesan untuk Ata")).toHaveValue("");
    expect(await axe(page)).toEqual([]);
    await page.getByLabel("Tulis pesan untuk Ata").fill("Lanjut");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator(".msg--ata")).toHaveCount(2);
    await expect.poll(() => kirim.length).toBe(2);
    expect(kirim[1].body).toEqual({ question: "Lanjut", history: [
      { role: "user", content: "Tolong review ideku soal sampah plastik" },
      { role: "assistant", content: "Idemu **kuat** karena dekat dengan tema [S1].\n\n- Perjelas data\n- Tambah contoh" },
    ], context_categories: ["lomba"] });
  });

  test("the conversation is memory only: the screen says so, nothing is put in browser storage, and a reload empties it", async ({ page }) => {
    // Any request that carries the conversation, other than the chat call itself, would be a leak (analytics, logging).
    const beacons: string[] = [];
    page.on("request", (r) => {
      if (/PERTANYAAN-UNIK|Idemu/.test(r.url() + (r.postData() ?? "")) && !r.url().endsWith("/api/v1/tanya/chat")) beacons.push(r.url());
    });
    await tanya(page, { tersambung: true, izin: ["lomba"] });
    await page.goto("/ata");
    await expect(page.locator("#catatanMemori")).toContainText("hilang saat halaman dimuat ulang");
    await page.locator("#tulis").fill("Tolong review ideku PERTANYAAN-UNIK");
    await page.locator("#kirim").click();
    await expect(page.locator(".msg--ata .msg__bubble--md")).toContainText("Idemu kuat");
    const simpanan = await page.evaluate(async () => JSON.stringify({
      local: { ...localStorage }, session: { ...sessionStorage }, cookie: document.cookie,
      idb: "databases" in indexedDB ? (await indexedDB.databases()).map((d) => d.name) : [],
    }));
    expect(simpanan).not.toMatch(/PERTANYAAN-UNIK|Idemu|review ideku/);
    expect(beacons).toEqual([]);
    await page.reload();
    await expect(page.locator(".empty h2")).toHaveText("Mau tanya apa?");
    await expect(page.locator(".msg")).toHaveCount(0);
  });

  test("revoking a permission clears the conversation, and the next question is sent without the old turns", async ({ page }) => {
    const o: Parameters<typeof tanya>[1] = { tersambung: true, izin: ["lomba"] };
    const { kirim } = await tanya(page, o);
    await page.goto("/ata");
    await page.locator("#tulis").fill("Tolong review ideku");
    await page.locator("#kirim").click();
    await expect(page.locator(".msg--ata .msg__bubble--md")).toContainText("Idemu kuat");
    await expect(page.locator(".ctxline")).toContainText("1 dari 8");

    // The permission is switched off elsewhere (another tab, or /profil); the screen learns of it when it regains focus.
    o.izin = [];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator("#izinDicabut")).toContainText("Izin Lomba dicabut");
    await expect(page.locator(".msg")).toHaveCount(0);
    await expect(page.locator(".ctxline")).toContainText("tidak memakai data akunmu");

    o.chat = () => ({ body: [{ type: "meta", provider: "OpenAI", model: "model-uji", provenance: { ...asal, sources: [], blocked: [{ category: "lomba", reason: "permission_off" }] }, cleared: [] }, { type: "delta", text: "Jawaban tanpa data akun." }, { type: "done", warnings: [] }] });
    await page.locator("#tulis").fill("Pertanyaan berikutnya");
    await page.locator("#kirim").click();
    await expect(page.locator(".msg--ata .msg__bubble--md")).toContainText("Jawaban tanpa data akun.");
    expect(kirim.filter((k) => k.url === "chat").at(-1)?.body).toEqual({ question: "Pertanyaan berikutnya", history: [], context_categories: [] });
    await expect(page.locator(".tanya__sumber summary").last()).toContainText("Tanpa data akun");
  });

  test("revoking a permission also closes a prepared prompt that carries that data", async ({ page }) => {
    const o: Parameters<typeof tanya>[1] = { izin: ["lomba"] };
    await tanya(page, o);
    await page.route("**/api/v1/tanya/prompt", (route) => route.fulfill({ json: { mode: "handoff", prompt: "Kamu adalah Ata.\n[S1] Lomba Esai Nasional", provenance: asal } }));
    await page.goto("/ata");
    await page.locator("#tulis").fill("Tolong review ideku");
    await page.locator("#kirim").click();
    await expect(page.locator("#promptSalin")).toContainText("Lomba Esai Nasional");
    o.izin = [];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator("#izinDicabut")).toContainText("Izin Lomba dicabut");
    await expect(page.locator("#promptSalin")).toHaveCount(0);
  });

  test("a revocation the server reports: earlier turns are dropped, and a running answer is discarded", async ({ page }) => {
    let langkah = 0;
    const o: Parameters<typeof tanya>[1] = { tersambung: true, izin: ["lomba"] };
    o.chat = () => {
      langkah += 1;
      if (langkah === 1) return { body: jawaban };
      if (langkah === 2) {
        o.izin = [];
        return { body: [{ type: "meta", provider: "OpenAI", model: "model-uji", provenance: { ...asal, sources: [], blocked: [{ category: "lomba", reason: "permission_off" }] }, cleared: ["lomba"] }, { type: "delta", text: "Jawaban kedua." }, { type: "done", warnings: [] }] };
      }
      return { body: [jawaban[0], { type: "delta", text: "Setengah jawa" }, { type: "error", code: "permission_revoked", message: "Izin data dicabut.", action: "none", partial: false, categories: ["lomba"] }] };
    };
    const { kirim } = await tanya(page, o);
    await page.goto("/ata");
    await page.locator("#tulis").fill("Tolong review ideku");
    await page.locator("#kirim").click();
    await expect(page.locator(".msg--ata .msg__bubble--md")).toContainText("Idemu kuat");

    await page.locator("#tulis").fill("Lanjutkan");
    await page.locator("#kirim").click();
    await expect(page.locator(".msg--ata .msg__bubble--md")).toHaveText("Jawaban kedua.");
    expect(kirim.filter((k) => k.url === "chat").at(-1)?.body).toMatchObject({ context_categories: ["lomba"], history: [{ role: "user" }, { role: "assistant" }] });
    await expect(page.locator("#izinDicabut")).toContainText("percakapan sebelumnya dibersihkan");
    await expect(page.locator(".msg--me")).toHaveCount(1);
    await expect(page.locator("#pesanBox")).not.toContainText("Idemu kuat");

    o.izin = ["lomba"];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.locator("#tulis").fill("Sekali lagi");
    await page.locator("#kirim").click();
    await expect(page.locator("#izinDicabut")).toContainText("dicabut saat Ata menjawab");
    await expect(page.locator(".msg")).toHaveCount(0);
    await expect(page.locator("#pesanBox")).not.toContainText("Setengah jawa");
    await expect(page.locator("#kirim")).toBeEnabled();
  });

  test("provider output is shown as text, never run as markup", async ({ page }) => {
    await tanya(page, { tersambung: true, chat: () => ({ body: [jawaban[0], { type: "delta", text: '<img src=x onerror="window.__kena=1"><script>window.__kena=1</script> aman' }, { type: "done", warnings: ["Jawaban ini tidak merujuk data akunmu."] }] }) });
    await page.goto("/ata");
    await page.getByLabel("Tulis pesan untuk Ata").fill("hai");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator(".msg--ata .msg__bubble")).toContainText("<script>window.__kena=1</script> aman");
    await expect(page.locator(".msg--ata .banner--warn")).toHaveText("Jawaban ini tidak merujuk data akunmu.");
    expect(await page.evaluate(() => (window as unknown as { __kena?: number }).__kena)).toBeUndefined();
    await expect(page.locator(".msg--ata img:not(.msg__ava)")).toHaveCount(0);
  });

  test("errors are honest and offer a fix: rejected key, cut stream, retry", async ({ page }) => {
    let n = 0;
    const balasan = [
      { body: [jawaban[0], { type: "error", code: "key_rejected", message: "Key ditolak provider. Periksa atau ganti key-mu.", action: "reconnect", partial: false }] },
      { body: [jawaban[0], { type: "delta", text: "Setengah ja" }] },
      { body: jawaban },
    ];
    await tanya(page, { tersambung: true, chat: () => balasan[Math.min(n++, 2)] });
    await page.goto("/ata");
    await page.getByLabel("Tulis pesan untuk Ata").fill("hai");
    await page.getByRole("button", { name: "Kirim" }).click();
    const galat = page.locator(".msg--galat");
    await expect(galat).toContainText("Key ditolak provider. Periksa atau ganti key-mu.");
    await expect(page.locator(".msg--ata")).toHaveCount(0);
    expect(await axe(page)).toEqual([]);
    await galat.getByRole("button", { name: "Atur sambungan AI" }).click();
    await expect(page.getByRole("dialog", { name: "Sambungkan AI-mu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Sambungkan AI-mu" })).toBeHidden();

    await page.getByLabel("Tulis pesan untuk Ata").fill("hai");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator(".msg--ata")).toContainText("Setengah ja");
    await expect(page.locator(".msg--ata")).toContainText("Jawaban ini terpotong dan belum lengkap.");
    await expect(galat).toContainText("Koneksi putus sebelum jawaban selesai.");
    await galat.getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.locator(".msg--ata").last()).toContainText("Idemu kuat");
    await expect(galat).toHaveCount(0);
  });

  test("guardian consent: lost mid-answer clears the conversation; after that only a prompt to copy, and a refused question says why", async ({ page }) => {
    let langkah = 0;
    const o: Parameters<typeof tanya>[1] = { tersambung: true, izin: ["lomba"] };
    o.chat = () => (++langkah === 1
      ? { body: [jawaban[0], { type: "delta", text: "Setengah jawa" }, { type: "error", code: "permission_revoked", message: "x", action: "none", partial: false, categories: ["lomba"], guardian: true }] }
      : { status: 403, body: { error: { code: "guardian_consent_required", message: "Akunmu butuh persetujuan orang tua atau wali sebelum memakai AI. Selesaikan dulu di Profil." } } });
    await tanya(page, o);
    await page.goto("/ata");
    await page.locator("#tulis").fill("Tolong review ideku");
    o.izin = [];
    o.alasan = "guardian_consent_required";
    await page.locator("#kirim").click();
    await expect(page.locator("#izinDicabut")).toContainText("Persetujuan orang tua atau wali tidak lagi berlaku");
    await expect(page.locator(".msg")).toHaveCount(0);
    await expect(page.locator("#pesanBox")).not.toContainText("Setengah jawa");

    // The screen read the account again: no connection, no way to add one, and the composer prepares a prompt.
    await expect(page.locator(".tanya")).toContainText("Sambungan AI baru bisa dipakai setelah orang tua atau walimu menyetujui");
    await expect(page.getByRole("button", { name: "Sambungkan AI" })).toHaveCount(0);
    await expect(page.locator("#kirim")).toHaveText("Siapkan prompt");
    expect(await axe(page)).toEqual([]);
    await page.locator("#tulis").fill("Coba lagi");
    await page.locator("#kirim").click();
    await expect(page.locator("#promptSalin")).toContainText("Coba lagi");
    await expect(page.locator(".msg--ata")).toHaveCount(0);
  });

  test("guardian consent: a question the server refuses is reported, not answered", async ({ page }) => {
    await tanya(page, { tersambung: true, izin: ["lomba"], chat: () => ({ status: 403, body: { error: { code: "guardian_consent_required", message: "Akunmu butuh persetujuan orang tua atau wali sebelum memakai AI. Selesaikan dulu di Profil." } } }) });
    await page.goto("/ata");
    await page.locator("#tulis").fill("Tolong review ideku");
    await page.locator("#kirim").click();
    await expect(page.locator(".tanya [role=alert]")).toContainText("butuh persetujuan orang tua atau wali sebelum memakai AI");
    await expect(page.locator(".msg--ata")).toHaveCount(0);
  });

  test("a rate limit and a lost connection are reported before any answer", async ({ page }) => {
    let n = 0;
    const balasan = [
      { status: 429, body: { error: { code: "rate_limited", message: "Kamu sudah mengirim 30 permintaan dalam semenit. Coba lagi 17 detik lagi.", retry_after_s: 17 } } },
      { status: 409, body: { error: { code: "connection_expired", message: "Sambungan AI-mu sudah berakhir. Sambungkan lagi untuk lanjut." } } },
    ];
    await tanya(page, { tersambung: true, chat: () => balasan[Math.min(n++, 1)] });
    await page.goto("/ata");
    await page.getByLabel("Tulis pesan untuk Ata").fill("hai");
    await page.getByRole("button", { name: "Kirim" }).click();
    await expect(page.locator(".msg--galat")).toContainText("Coba lagi 17 detik lagi.");
    await page.locator(".msg--galat").getByRole("button", { name: "Coba lagi" }).click();
    await expect(page.locator(".msg--galat")).toContainText("Sambungan AI-mu sudah berakhir");
    await expect(page.locator(".msg--galat").getByRole("button", { name: "Atur sambungan AI" })).toBeVisible();
    await expect(page.locator(".msg--me")).toHaveCount(1);
  });

  test("reduced motion: the typing indicator does not animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await tanya(page, { tersambung: true, chat: () => ({ body: [jawaban[0]] }) });
    await page.route("**/api/v1/tanya/chat", () => {}); // never answers: the bubble stays in its waiting state
    await page.goto("/ata");
    await page.getByLabel("Tulis pesan untuk Ata").fill("hai");
    await page.getByRole("button", { name: "Kirim" }).click();
    const titik = page.locator(".typing i").first();
    await expect(titik).toBeVisible();
    const durasi = await titik.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(durasi).toBeLessThan(0.01);
    await expect(page.getByRole("button", { name: "Hentikan" })).toBeVisible();
  });

  for (const tema of ["terang", "gelap"] as const) {
    test(`no overflow, axe clean and screenshots, ${tema}`, async ({ page }, info) => {
      const lebar = info.project.name === "mobile" ? 390 : 1280;
      await page.setViewportSize({ width: lebar, height: info.project.name === "mobile" ? 844 : 900 });
      await tanya(page, { tersambung: true, izin: ["lomba", "tugas"] });
      await page.goto(`/ata?tema=${tema}`);
      await expect(page.getByRole("heading", { name: "Mau tanya apa?" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await axe(page)).toEqual([]);
      const dir = process.env.TANYA_SHOTS;
      if (dir) await page.screenshot({ path: `${dir}/tanya-${lebar}-${tema}-kosong.png` });
      await page.getByLabel("Tulis pesan untuk Ata").fill("Tolong review ideku soal sampah plastik");
      await page.getByRole("button", { name: "Kirim" }).click();
      await page.locator(".msg--ata summary").click();
      await expect(page.locator(".tanya__sumber")).toContainText("[S1]");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await axe(page)).toEqual([]);
      if (dir) await page.screenshot({ path: `${dir}/tanya-${lebar}-${tema}-jawaban.png` });
      await page.getByRole("button", { name: "Atur", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await axe(page)).toEqual([]);
      if (dir) await page.screenshot({ path: `${dir}/tanya-${lebar}-${tema}-sambung.png` });
    });
  }
});
