// Pixel parity between the prototype reference page and the migrated /styleguide (docs/DESIGN-SYSTEM.md).
// Local development only: the prototype repo is not available in CI.
// Usage (see docs/DESIGN-SYSTEM.md): serve the prototype on :4321, run the app with DEMO_MODE=true, then `pnpm visual:parity`.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const PROTO = process.env.PROTO_ORIGIN ?? "http://localhost:4321";
const APP = process.env.APP_ORIGIN ?? "http://localhost:3000";
// Screens scroll inside .views (embed mode), so they are captured at viewport size; the reference page is captured in full.
// Each target pairs a prototype page with its migrated route. `tema` maps light/dark to the page's own ?tema= values,
// `siap` is the selector that marks the screen as rendered. Screens need the prototype's serve.py (account API).
const TEMA_LAYAR = { light: "terang", dark: "gelap" };
const TARGETS = [
  { nama: "", proto: (t) => `/_r005-referensi.html?tema=${t}`, app: (t) => `/styleguide?tema=${t}`, siap: 'body[data-siap="1"]', fullPage: true },
  { nama: "masuk-", proto: (t) => `/masuk.html?embed=1&tema=${TEMA_LAYAR[t]}#masuk`, app: (t) => `/?tema=${TEMA_LAYAR[t]}`, siap: ".masuk h1" },
  { nama: "paket-", proto: (t) => `/masuk.html?embed=1&tema=${TEMA_LAYAR[t]}#paket`, app: (t) => `/paket?tema=${TEMA_LAYAR[t]}`, siap: ".paket h1",
    // Data, not design: the prototype shows its demo Slots and its own Slot limit, the app shows the account's (K-23).
    tutupi: [".paket .lede", ".paket__kartu:first-child .paket__fitur li:nth-child(2)"] },
].filter((t) => !process.env.TARGET || t.nama === `${process.env.TARGET}-` || (process.env.TARGET === "styleguide" && !t.nama));
const OUT = process.env.OUT_DIR ?? "docs/screenshots/parity";
const PROTO_DIR = resolve(process.env.PROTO_DIR ?? "../ata-prototype");
const TOLERANCE = 8; // max per-channel delta (of 255) that still counts as a match (anti-aliasing noise)

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];
const THEMES = ["light", "dark"];

// The prototype's own contrast audit, evaluated as a plain script inside each page.
const auditSource = (await readFile(join(PROTO_DIR, "shared/audit-kontras.js"), "utf8")).replace(/^export /gm, "");
const auditScript = `(async () => {
${auditSource}
const h = await auditKontras(document, { label: "uji" });
return h.filter((x) => x.lulus === false).map((x) => x.rasio + "/" + x.butuh + " " + JSON.stringify(x.teks));
})()`;

async function capture(browser, url, viewport, { siap, fullPage = false, tutupi = [] }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(siap, { state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }" });
  await page.waitForTimeout(300);
  const png = await page.screenshot({ fullPage, mask: tutupi.map((sel) => page.locator(sel)), maskColor: "#808080" });
  const contrastFailures = await page.evaluate(auditScript);
  await context.close();
  return { png, contrastFailures };
}

async function compare(a, b) {
  const [x, y] = await Promise.all([a, b].map((p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return { sizeMismatch: `${x.info.width}x${x.info.height} vs ${y.info.width}x${y.info.height}` };
  }
  const { width, height } = x.info;
  const diff = Buffer.alloc(width * height * 4);
  let differing = 0, overTolerance = 0, maxDelta = 0;
  for (let i = 0; i < width * height * 4; i += 4) {
    const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
    if (d > 0) differing++;
    if (d > TOLERANCE) overTolerance++;
    if (d > maxDelta) maxDelta = d;
    const grey = Math.round((x.data[i] + x.data[i + 1] + x.data[i + 2]) / 3 / 4 + 190);
    if (d > TOLERANCE) diff.set([255, 0, 0, 255], i);
    else if (d > 0) diff.set([255, 200, 0, 255], i);
    else diff.set([grey, grey, grey, 255], i);
  }
  const image = await sharp(diff, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { differing, overTolerance, maxDelta, image, size: `${width}x${height}` };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let failed = false;
for (const target of TARGETS) for (const viewport of VIEWPORTS) {
  for (const tema of THEMES) {
    const name = `${target.nama}${viewport.width}-${tema}`;
    // Glass (backdrop-filter) edges on sub-pixel boxes render with a few noisy pixels on some runs; one retry settles it.
    let proto, app;
    for (let attempt = 0; attempt < 2; attempt++) {
      proto = await capture(browser, PROTO + target.proto(tema), viewport, target);
      app = await capture(browser, APP + target.app(tema), viewport, target);
      const r = await compare(proto.png, app.png);
      if (!r.sizeMismatch && r.overTolerance === 0) break;
    }
    await sharp(proto.png).toFile(join(OUT, `${name}-prototipe.png`));
    await sharp(app.png).toFile(join(OUT, `${name}-app.png`));
    const r = await compare(proto.png, app.png);
    const contrast = `kontras gagal: prototipe ${proto.contrastFailures.length}, app ${app.contrastFailures.length}`;
    if (r.sizeMismatch) {
      failed = true;
      console.log(`${name}: UKURAN BERBEDA ${r.sizeMismatch} · ${contrast}`);
    } else {
      await sharp(r.image).toFile(join(OUT, `${name}-diff.png`));
      if (r.overTolerance > 0) failed = true;
      console.log(`${name}: ${r.size} · piksel beda ${r.differing} (> ${TOLERANCE}/255: ${r.overTolerance}) · delta maks ${r.maxDelta}/255 · ${contrast}`);
    }
    for (const f of app.contrastFailures) console.log(`  app kontras: ${f}`);
    for (const f of proto.contrastFailures) console.log(`  prototipe kontras: ${f}`);
    if (app.contrastFailures.length || proto.contrastFailures.length) failed = true;
  }
}
await browser.close();
console.log(failed ? "PARITAS GAGAL" : "PARITAS LULUS");
process.exit(failed ? 1 : 0);
