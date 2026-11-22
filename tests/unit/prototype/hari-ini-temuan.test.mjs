// @vitest-environment node
// Dipindah dari prototipe tests/hari-ini-temuan.test.mjs. Kasus uji sama; import, jam tiruan, dan path mengikuti Vitest.
/* Regression tests for the four findings from browser testing of Hari Ini:
   midnight rollover, over-limit Slot notice, DATA DEMO label, and dark-theme tab contrast. */
import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tanggalLokal, pesanSlotLebih, slotContoh, awalBersama, batasSlot, KUNCI_BERSAMA } from '@/lib/prototype/shared/logic/bersama.js';
import { hitungXP } from '@/lib/prototype/shared/logic/xp.js';
import { LOMBA } from '@/lib/prototype/lomba/data/lomba.js';
import { SLOT_LEBIH, bersamaLebih } from './fixtures/slot.mjs';

/* a fresh module instance, like a page load */
const segar = async () => { vi.resetModules(); return import('@/lib/prototype/shared/bersama.js'); };

/* ---------- midnight ---------- */
const gudang = new Map();
globalThis.localStorage = {
  getItem: (k) => (gudang.has(k) ? gudang.get(k) : null),
  setItem: (k, v) => gudang.set(k, String(v)),
  removeItem: (k) => gudang.delete(k),
};

test('local date uses the device calendar day, not UTC', () => {
  assert.equal(tanggalLokal(new Date(2026, 10, 22, 0, 5)), '2026-11-22');
  assert.equal(tanggalLokal(new Date(2026, 10, 22, 23, 59)), '2026-11-22');
  assert.equal(tanggalLokal(new Date(2027, 0, 1, 0, 0)), '2027-01-01');
});

test('a page left open across midnight records completion, XP and streak on the new day, and keeps them after reload', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 21, 23, 58) });
  try {
    gudang.clear();
    const store = await segar();
    assert.equal(store.HARI_INI, '2026-11-21');
    const [pertama, kedua] = store.tugasBersama().filter((t) => !t.selesai);
    assert.ok(pertama && kedua, 'seed has at least two open tasks');

    store.ubahStatusTugas(pertama.id, 'selesai');
    const cari = (id) => store.tugasBersama().find((t) => t.id === id);
    assert.equal(cari(pertama.id).selesaiPada, '2026-11-21');

    vi.setSystemTime(new Date(2026, 10, 22, 0, 3)); /* same page, no reload */
    store.ubahStatusTugas(kedua.id, 'selesai');
    assert.equal(store.HARI_INI, '2026-11-22', 'importers read the new day through the live binding');
    assert.equal(cari(kedua.id).selesaiPada, '2026-11-22', 'completion date is the moment of completion');
    assert.equal(cari(pertama.id).selesaiPada, '2026-11-21', 'earlier completion is untouched');

    const prog = hitungXP(store.bacaBersama().peta, store.HARI_INI);
    assert.ok(prog.streak >= 2, 'yesterday and today both count toward the streak');

    /* reload: a fresh module instance reads the same persisted data */
    const lagi = await segar();
    assert.equal(lagi.HARI_INI, '2026-11-22');
    assert.equal(lagi.tugasBersama().find((t) => t.id === kedua.id).selesaiPada, '2026-11-22');
    assert.deepEqual(hitungXP(lagi.bacaBersama().peta, lagi.HARI_INI), prog, 'XP and streak are identical after reload');
  } finally {
    vi.useRealTimers();
  }
});

test('segarkanHari reports a change only when the local day actually changes', async () => {
  const store = await segar();
  const kini = new Date();
  store.segarkanHari(kini);
  assert.equal(store.segarkanHari(kini), false);
  const besok = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() + 1, 0, 1);
  assert.equal(store.segarkanHari(besok), true);
  assert.equal(store.HARI_INI, tanggalLokal(besok));
  store.segarkanHari(kini);
});

test('midnight: a published deadline stays on its poster date while the page stays open', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 21, 23, 58) });
  try {
    vi.resetModules();
    const { LOMBA: L } = await import('@/lib/prototype/lomba/data/lomba.js');
    const { tambahHari } = await import('@/lib/prototype/lomba/logic/peta.js');
    const l = L.find((x) => x.tenggatIso === '2026-11-24');
    assert.equal(l.hariLagi, 3);
    vi.setSystemTime(new Date(2026, 10, 22, 0, 3));
    assert.equal(l.hariLagi, 2, 'countdown follows the new day without a reload');
    assert.equal(tambahHari(tanggalLokal(), l.hariLagi), '2026-11-24', 'deadline does not slide forward');
  } finally {
    vi.useRealTimers();
  }
});

/* ---------- Slot above the plan limit ---------- */
test('K-23: over-limit notice states the live count and the plan limit, and is absent at or under the limit', () => {
  const b = bersamaLebih();
  const p = pesanSlotLebih(b.slot.length, batasSlot('gratis'), 'Gratis');
  assert.equal(p.ringkas, '2 Slot aktif.');
  assert.equal(p.rinci, 'Paket Gratis mencakup 1 Slot aktif.');
  assert.match(p.arahan, /Lomba/);
  assert.equal(pesanSlotLebih(4, 3, 'Pro').rinci, 'Paket Pro mencakup 3 Slot aktif.', 'numbers come from the caller');
  assert.equal(pesanSlotLebih(1, 1, 'Gratis'), null);
  assert.equal(pesanSlotLebih(2, 3, 'Pro'), null);
  assert.equal(pesanSlotLebih(2, undefined, 'Gratis'), null, 'no notice while the limit is unknown');
});

test('K-23: reading an over-limit store shows the notice and never drops, archives or reorders a Slot', async () => {
  gudang.clear();
  gudang.set(KUNCI_BERSAMA, JSON.stringify(bersamaLebih()));
  const store = await segar();
  assert.deepEqual(store.slotLebih()?.jumlah, 2);
  assert.equal(store.slotLebih(3, 'pro'), null, 'a server limit of 3 clears the notice');
  store.slotRingkas(); store.tugasBersama();
  assert.deepEqual(store.bacaBersama().slot, SLOT_LEBIH);
  assert.deepEqual(JSON.parse(gudang.get(KUNCI_BERSAMA)).slot, SLOT_LEBIH);
});

/* ---------- DATA DEMO ---------- */
test('DATA DEMO applies to Slots from the bundled sample catalogue, not to competitions the user wrote', async () => {
  const dikenal = (id) => LOMBA.some((l) => l.id === id);
  assert.deepEqual(slotContoh(awalBersama(), dikenal), awalBersama().slot);
  const milikSendiri = { ...awalBersama(), slot: ['manual-abc'], kartu: { 'manual-abc': { nama: 'Lomba sekolahku' } } };
  assert.deepEqual(slotContoh(milikSendiri, dikenal), []);
  assert.deepEqual(slotContoh({ ...awalBersama(), slot: [] }, dikenal), []);

  gudang.clear();
  gudang.set(KUNCI_BERSAMA, JSON.stringify({ ...awalBersama(), slot: [] }));
  const store = await segar();
  assert.equal(store.adaDataContoh(), false);
  store.resetBersama();
  assert.equal(store.adaDataContoh(), true, 'label returns with the seed after Reset data demo');
});

test('Hari Ini renders the label and the notice from store data', () => {
  const ui = readFileSync('src/app/(ata)/(apl)/hari-ini/HariIni.tsx', 'utf8');
  assert.match(ui, /data\.contoh \? <> <span className="label-demo">DATA DEMO<\/span>/);
  assert.match(ui, /className="slot-lebih"/);
  assert.doesNotMatch(ui, /mencakup 1/, 'no hardcoded count or limit in the screen');
});

/* ---------- dark-theme dock contrast ---------- */
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const rasio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const timpa = ([r, g, b, a], bawah) => [r, g, b].map((v, i) => v * a + bawah[i] * (1 - a));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

test('dark theme: dock labels keep 4.5:1 even over a white poster behind the glass', () => {
  const css = readFileSync('src/styles/prototype/shared/lingkungan.css', 'utf8');
  const warna = (sel) => {
    const blok = css.match(new RegExp(':root\\[data-theme="dark"\\] ' + sel + ' \\{ background: linear-gradient\\(180deg, ([^;]+)\\);'))[1];
    return [...blok.matchAll(/rgba\(([^)]+)\)/g)].map((m) => m[1].split(',').map(Number));
  };
  const aktif = hex(css.match(/:root\[data-theme="dark"\] \{ --aksen-teks: (#[0-9A-F]{6})/i)[1]);
  const teks = hex('#FFF3EC'); /* --text, dark */
  const putih = [255, 255, 255];
  for (const dok of warna('\\.tabbar')) {
    const dasar = timpa(dok, putih);
    assert.ok(rasio(teks, dasar) >= 4.5, 'inactive label on dock ' + rasio(teks, dasar).toFixed(2));
    for (const pil of warna('\\.tab-penanda')) {
      const r = rasio(aktif, timpa(pil, dasar));
      assert.ok(r >= 4.5, 'active label on pill ' + r.toFixed(2));
    }
  }
  /* desktop rail has no dock tint: the pill sits directly on the dusk photo (brightest measured area ≈ #B4868C) */
  for (const pil of warna('\\.tab-penanda')) assert.ok(rasio(aktif, timpa(pil, [180, 134, 140])) >= 4.5);
  /* both dark triggers carry the same values */
  assert.equal(css.split('rgba(34,19,16,.76)').length - 1, 2);
  assert.equal(css.split('rgba(26,13,10,.74)').length - 1, 2);
});
