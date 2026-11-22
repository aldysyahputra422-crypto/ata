// @vitest-environment node
// Dipindah dari prototipe tests/bersama.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
// R0.2-0: kasus batas Slot mengikuti K-23 (Gratis 1, Pro 3) + kasus Slot di atas batas tetap disimpan.
// K-23 seed: default demo has 1 Slot; over-limit cases use fixtures/slot.mjs.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  awalBersama, rapikanBersama, lengkapiPeta, ringkasSlot, daftarTugas, centangTugas, aturSlot, aturPaket,
  lepasSlotBersama, batasSlot, SLOT_AWAL, VERSI_BERSAMA,
} from '@/lib/prototype/shared/logic/bersama.js';
import { LOMBA } from '@/lib/prototype/lomba/data/lomba.js';
import { usulkanLangkah, tambahHari } from '@/lib/prototype/lomba/logic/peta.js';
import { buatDeck, putuskan, samakanSlot, BATAS_SLOT } from '@/lib/prototype/lomba/logic/radar.js';
import { PROFIL } from '@/lib/prototype/lomba/data/lomba.js';
import { SLOT_LEBIH, bersamaLebih } from './fixtures/slot.mjs';

const HARI = '2026-11-20';
const waktu = { hariIni: HARI, tambahHari };
const cari = (b) => (id) => LOMBA.find((l) => l.id === id) || (b.kartu[id] ? { id, ...b.kartu[id] } : null);
const ada = (id) => LOMBA.some((l) => l.id === id);
const siap = (b) => lengkapiPeta(b, cari(b), usulkanLangkah, waktu);

test('K-23/K-03: Gratis holds 1 active Slot, Pro 3; unknown plans fall back to Gratis', () => {
  assert.equal(batasSlot('gratis'), 1);
  assert.equal(batasSlot('pro'), 3);
  assert.equal(batasSlot('aneh'), 1);
});

test('K-23: Slots above the Gratis limit are kept, never dropped, and the UI is told to ask which stay active', () => {
  const b = { ...bersamaLebih(), paket: 'pro' };
  assert.equal(b.slot.length, 2);
  const turun = aturPaket(b, 'gratis');
  assert.deepEqual(turun.b.slot, SLOT_LEBIH, 'downgrade keeps every Slot');
  assert.equal(turun.lebih, 1);
  assert.deepEqual(aturSlot(turun.b, [...SLOT_LEBIH, 'kspi-2026']).slot, SLOT_LEBIH, 'over the limit nothing new is added');
  assert.deepEqual(aturSlot(turun.b, SLOT_LEBIH).slot, SLOT_LEBIH, 'existing Slots survive re-saving');
  assert.deepEqual(rapikanBersama(turun.b, ada).slot, SLOT_LEBIH, 'tidying keeps them too');
});

test('K-23: the default demo seed fits the Gratis limit, so a new Gratis user is not blocked', () => {
  const b = awalBersama();
  assert.equal(b.paket, 'gratis');
  assert.equal(b.slot.length, batasSlot('gratis'));
  assert.equal(aturPaket(b, 'gratis').lebih, 0);
});

test('a missing, broken or old store starts from the demo default', () => {
  for (const s of [null, 'x', [], { v: VERSI_BERSAMA + 1, slot: ['kspi-2026'] }]) assert.deepEqual(rapikanBersama(s, ada), awalBersama());
  assert.deepEqual(awalBersama().slot, SLOT_AWAL);
});

test('tidying drops unknown ids, duplicates and bad steps, but never drops existing active Slots above the limit', () => {
  const b = rapikanBersama({ v: VERSI_BERSAMA, paket: 'gratis', slot: ['interval-2027', 'interval-2027', 'hilang', 'kspi-2026', 'essay-unesa-2026', 'area-creator-8'],
    peta: { 'interval-2027': { langkah: [{ id: 'l0', nama: 'A', tanggal: HARI, selesai: true }, { nama: 'tanpa id' }], disetujui: true }, hilang: { langkah: [] } } }, ada);
  assert.deepEqual(b.slot, ['interval-2027', 'kspi-2026', 'essay-unesa-2026', 'area-creator-8'], 'a legacy fourth Slot is kept, not silently removed');
  assert.deepEqual(Object.keys(b.peta), ['interval-2027']);
  assert.equal(b.peta['interval-2027'].langkah.length, 1);
});

test('an uploaded poster Slot is kept through its card even though the catalogue does not know it', () => {
  const b = rapikanBersama({ v: VERSI_BERSAMA, slot: ['unggah-x'], kartu: { 'unggah-x': { nama: 'Lomba Cipta Puisi', kategori: 'karya-tulis', hariLagi: 16 } } }, ada);
  assert.deepEqual(b.slot, ['unggah-x']);
  const s = ringkasSlot(siap(b), cari(b), waktu)[0];
  assert.equal(s.nama, 'Lomba Cipta Puisi');
  assert.equal(s.tenggat, tambahHari(HARI, 16));
});

test('every Slot gets a Peta Jalan; the demo Slot is approved, three steps done, one overdue', () => {
  const b = siap(bersamaLebih());
  assert.deepEqual(Object.keys(b.peta).sort(), [...SLOT_LEBIH].sort());
  const p = b.peta['interval-2027'];
  assert.equal(p.disetujui, true);
  assert.equal(p.langkah.filter((s) => s.selesai).length, 3);
  assert.ok(p.langkah[3].tanggal < HARI && !p.langkah[3].selesai, 'the fourth step is late');
  assert.ok(p.langkah.every((s, i, a) => i === 0 || s.tanggal >= a[i - 1].tanggal), 'dates stay in order');
  assert.equal(b.peta['cipta-karya-2026'].disetujui, false);
  assert.equal(siap(b), b, 'nothing to add returns the same object');
});

test('ring numbers and tasks come from the same Peta Jalan', () => {
  const b = siap(awalBersama());
  const ring = ringkasSlot(b, cari(b), waktu).find((s) => s.id === 'interval-2027');
  const tugas = daftarTugas(b, cari(b));
  assert.equal(ring.wajib, b.peta['interval-2027'].langkah.length);
  assert.equal(ring.selesai, 3);
  assert.equal(tugas.length, ring.wajib, 'only approved maps become tasks');
  assert.equal(tugas[0].selesai, false, 'open tasks come first');
  assert.ok(tugas[0].tenggat < HARI, 'the late one leads');
  assert.equal(tugas.at(-1).selesai, true);
});

test('ticking a task updates the ring everywhere; unapproved maps cannot be ticked', () => {
  const b = siap(bersamaLebih());
  const id = daftarTugas(b, cari(b))[0].id;
  const r = centangTugas(b, id);
  assert.equal(r.selesai, true);
  assert.equal(ringkasSlot(r.b, cari(r.b), waktu)[0].selesai, 4);
  assert.equal(centangTugas(r.b, id).selesai, false, 'ticking again undoes');
  assert.equal(centangTugas(b, 'cipta-karya-2026/l0').ditolak, 'belum-disetujui');
  assert.equal(centangTugas(b, 'nggak/ada').ditolak, 'tidak-ada');
  assert.equal(b.peta['interval-2027'].langkah[3].selesai, false, 'the original store is not mutated');
});

test('the Slot list respects the plan: one for Gratis, three for Pro; existing Slots above it are not dropped', () => {
  const ids = LOMBA.map((l) => l.id);
  assert.equal(aturSlot({ ...awalBersama(), slot: [] }, ids).slot.length, 1);
  assert.equal(aturSlot(awalBersama(), ids).slot.length, 1, 'the default demo seed already fills the Gratis limit');
  assert.equal(aturSlot(bersamaLebih(), ids).slot.length, SLOT_LEBIH.length, 'two existing Slots stay above the Gratis limit');
  const pro = aturPaket(awalBersama(), 'pro').b;
  assert.equal(aturSlot(pro, ids).slot.length, 3);
  const lama = { ...awalBersama(), slot: ids.slice(0, 5) };
  assert.equal(aturSlot(lama, ids).slot.length, 5, 'legacy Slots stay until the user releases them');
});

test('the plan always follows the server; extra legacy Slots are reported, never deleted', () => {
  const lama = { ...aturPaket(awalBersama(), 'pro').b, slot: LOMBA.slice(0, 4).map((l) => l.id) };
  const r = aturPaket(lama, 'gratis');
  assert.equal(r.ditolak, undefined);
  assert.equal(r.b.paket, 'gratis');
  assert.equal(r.b.slot.length, 4);
  assert.equal(r.lebih, 3);
  assert.equal(aturPaket(awalBersama(), 'emas').ditolak, 'paket-tidak-dikenal');
});

test('releasing a Slot keeps its Peta Jalan so taking it again resumes progress', () => {
  const b = siap(bersamaLebih());
  const lepas = lepasSlotBersama(b, 'interval-2027');
  assert.deepEqual(lepas.slot, ['cipta-karya-2026']);
  assert.ok(lepas.peta['interval-2027']);
  assert.equal(daftarTugas(lepas, cari(lepas)).length, 0, 'released Slots leave the task list');
  const lagi = siap(aturSlot(lepas, ['cipta-karya-2026', 'interval-2027']));
  assert.equal(lagi.peta['interval-2027'].langkah.filter((s) => s.selesai).length, 3);
});

test('the Radar uses the plan limit, and follows Slot changes made in other tabs', () => {
  const deck = buatDeck(LOMBA, PROFIL, { slot: ['interval-2027', 'cipta-karya-2026', 'essay-unesa-2026'] });
  assert.equal(putuskan(deck, deck.antrean[0], 'slot').ditolak, 'slot-penuh');
  assert.ok(!putuskan(deck, deck.antrean[0], 'slot', { batas: 6 }).ditolak);
  assert.equal(BATAS_SLOT, 3);
  const id = deck.antrean[0];
  const ikut = samakanSlot({ ...deck, tersimpan: [id] }, ['interval-2027', id]);
  assert.deepEqual(ikut.slot, ['interval-2027', id]);
  assert.ok(!ikut.tersimpan.includes(id) && !ikut.antrean.includes(id));
  assert.equal(samakanSlot(deck, deck.slot), deck);
});

test('the plan limits match the Paket screen data', async () => {
  const { PAKET } = await import('@/lib/prototype/masuk/data/paket.js');
  assert.equal(batasSlot('gratis'), PAKET.gratis.batasSlot);
  assert.equal(batasSlot('pro'), PAKET.pro.batasSlot);
});
