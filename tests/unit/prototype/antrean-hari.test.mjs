/* The Radar queue follows "today": the account's day when signed in, the device's day otherwise (FR-SCN-07, FR-PRG-01). */
import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { segarkanAntrean, buatDeck, putuskan, lepasSlot } from '../../../src/lib/prototype/lomba/logic/radar.js';
import { denganSisaHari, tanggalDiZona } from '../../../src/lib/prototype/shared/logic/tenggat.js';
import { aturZonaHari, HARI_INI } from '../../../src/lib/prototype/shared/hari.js';
import { LOMBA, PROFIL } from '../../../src/lib/prototype/lomba/data/lomba.js';

const KATALOG = [
  { id: 'jauh', tenggatIso: '2026-12-20' },
  { id: 'tutup-24', tenggatIso: '2026-11-24' },
  { id: 'tutup-23', tenggatIso: '2026-11-23' },
  { id: 'tanpa-tanggal', tenggatIso: null },
];
const pada = (hari) => KATALOG.map((l) => denganSisaHari({ kategori: 'esai', tingkat: [], ...l }, hari));
const deck = (hari) => buatDeck(pada(hari), PROFIL, {});
const urut = (a) => [...a].sort();

test('a competition closing exactly today stays in the queue; one without a date too', () => {
  const d = deck('2026-11-24');
  assert.deepEqual(urut(d.antrean), ['jauh', 'tanpa-tanggal', 'tutup-24']);
  const r = segarkanAntrean(d, pada('2026-11-24'));
  assert.equal(r.berubah, false);
  assert.ok(r.state.antrean.includes('tutup-24'), 'hariLagi 0 is still open');
});

test('day change: a passed deadline leaves the queue, the rest keeps its order', () => {
  const d = deck('2026-11-23');
  assert.equal(d.antrean.length, 4);
  const r = segarkanAntrean(d, pada('2026-11-24'), d.antrean);
  assert.equal(r.berubah, true);
  assert.deepEqual(r.state.antrean, d.antrean.filter((id) => id !== 'tutup-23'));
  const r2 = segarkanAntrean(r.state, pada('2026-11-25'), r.dilihat);
  assert.deepEqual(urut(r2.state.antrean), ['jauh', 'tanpa-tanggal']);
  assert.equal(segarkanAntrean(r2.state, pada('2026-11-25'), r2.dilihat).berubah, false, 'idempotent on the same day');
});

test('device a day ahead of the account: what the device day hid is offered on the account day', () => {
  // device in Jayapura is already on the 24th; the account (Jakarta) is still on the 23rd
  const kini = new Date('2026-11-23T16:00:00Z');
  const perangkat = tanggalDiZona('Asia/Jayapura', kini), akun = tanggalDiZona('Asia/Jakarta', kini);
  assert.deepEqual([perangkat, akun], ['2026-11-24', '2026-11-23']);
  const awal = segarkanAntrean(deck(perangkat), pada(perangkat));
  assert.ok(!awal.state.antrean.includes('tutup-23'), 'closed on the device day');
  const r = segarkanAntrean(awal.state, pada(akun), awal.dilihat);
  assert.equal(r.berubah, true);
  assert.ok(r.state.antrean.includes('tutup-23'), 'closes today on the account day: must be offered');
  assert.equal(r.state.antrean.filter((id) => id === 'tutup-23').length, 1);
});

test('device a day behind the account: what is already closed on the account day is not offered', () => {
  const kini = new Date('2026-11-23T16:00:00Z');
  const perangkat = tanggalDiZona('America/Los_Angeles', kini), akun = tanggalDiZona('Asia/Jayapura', kini);
  assert.deepEqual([perangkat, akun], ['2026-11-23', '2026-11-24']);
  const awal = segarkanAntrean(deck(perangkat), pada(perangkat));
  assert.ok(awal.state.antrean.includes('tutup-23'));
  const r = segarkanAntrean(awal.state, pada(akun), awal.dilihat);
  assert.ok(!r.state.antrean.includes('tutup-23'));
  assert.ok(r.state.antrean.includes('tutup-24'), 'closing today on the account day stays');
});

test('saved, skipped and Slot lists are never touched, and are never queued again', () => {
  let d = deck('2026-11-23');
  d = putuskan(d, 'tutup-23', 'simpan').state;
  d = putuskan(d, 'tutup-24', 'lewati').state;
  d = putuskan(d, 'jauh', 'slot').state;
  const kenal = ['jauh', 'tutup-24', 'tutup-23', 'tanpa-tanggal'];
  const r = segarkanAntrean(d, pada('2026-11-30'), kenal);
  assert.deepEqual([r.state.tersimpan, r.state.dilewati, r.state.slot], [['tutup-23'], ['tutup-24'], ['jauh']]);
  assert.deepEqual(r.state.antrean, ['tanpa-tanggal']);
  // going back a day does not duplicate what the user already decided on
  const r2 = segarkanAntrean(r.state, pada('2026-11-23'), r.dilihat);
  assert.deepEqual(r2.state.antrean, ['tanpa-tanggal']);
  // a released Slot that is still open is not pushed back into the queue
  const lepas = lepasSlot(r2.state, 'jauh');
  assert.deepEqual(segarkanAntrean(lepas, pada('2026-11-23'), r2.dilihat).state.antrean, ['tanpa-tanggal']);
});

test('a competition new to the catalogue is still inserted once, at the front', () => {
  const d = deck('2026-11-23');
  const baru = [...pada('2026-11-23'), denganSisaHari({ id: 'baru', tenggatIso: '2026-12-01' }, '2026-11-23')];
  const r = segarkanAntrean(d, baru, d.antrean);
  assert.equal(r.state.antrean[0], 'baru');
  const dilewati = putuskan(r.state, 'baru', 'lewati').state;
  assert.ok(!segarkanAntrean(dilewati, baru, r.dilihat).state.antrean.includes('baru'));
});

test('the real catalogue read on the account day: the queue matches that day, not the device clock', () => {
  vi.useFakeTimers();
  try {
    const l = LOMBA.find((x) => x.tenggatIso);
    // the instant is the deadline day in Jakarta and the day after in Jayapura
    vi.setSystemTime(new Date(`${l.tenggatIso}T16:00:00Z`));
    aturZonaHari('Asia/Jayapura'); // stands for a device ahead of the account
    const perangkat = segarkanAntrean(buatDeck(LOMBA, PROFIL, {}), LOMBA);
    assert.ok(!perangkat.state.antrean.includes(l.id), 'passed on the later day');
    aturZonaHari('Asia/Jakarta');
    assert.equal(HARI_INI, l.tenggatIso);
    const akun = segarkanAntrean(perangkat.state, LOMBA, perangkat.dilihat);
    assert.ok(akun.state.antrean.includes(l.id), 'closes today on the account day');
    vi.setSystemTime(new Date(`${l.tenggatIso}T17:00:00Z`)); // midnight in Jakarta
    assert.ok(!segarkanAntrean(akun.state, LOMBA, akun.dilihat).state.antrean.includes(l.id), 'gone after the account midnight');
  } finally { aturZonaHari(null); vi.useRealTimers(); aturZonaHari(null); }
});
