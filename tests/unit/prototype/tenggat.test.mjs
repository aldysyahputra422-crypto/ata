/* Countdowns come from the stored deadline DATE, never from a saved days-left number (FR-PRG-01, FR-SLT-01). */
import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { tanggalSah, sisaHari, tanggalDiZona, denganSisaHari, tenggatLomba } from '../../../src/lib/prototype/shared/logic/tenggat.js';
import { HARI_INI, segarkanHari, aturZonaHari, hariIniKini } from '../../../src/lib/prototype/shared/hari.js';
import { rapikanBersama, ringkasSlot, VERSI_BERSAMA } from '../../../src/lib/prototype/shared/logic/bersama.js';
import { cincin } from '../../../src/lib/prototype/masuk/logic/progres.js';
import { prioritasTugas } from '../../../src/lib/prototype/shared/logic/xp.js';
import { saranBerikut } from '../../../src/lib/prototype/app/logic/saran.js';
import { LOMBA_NYATA } from '../../../src/lib/prototype/lomba/data/lomba.js';
import { buatLombaManual } from '../../../src/lib/prototype/lomba/logic/manual.js';

test('only real calendar days count as a date', () => {
  assert.equal(tanggalSah('2026-12-06'), '2026-12-06');
  for (const x of ['2026-02-30', '2026-13-01', '06-12-2026', '2026-12-06T10:00:00Z', '', null, undefined, 20261206]) assert.equal(tanggalSah(x), null, String(x));
});

test('days left: future, the deadline day itself, and a passed deadline', () => {
  assert.equal(sisaHari('2026-12-06', '2026-11-23'), 13);
  assert.equal(sisaHari('2026-11-23', '2026-11-23'), 0);
  assert.equal(sisaHari('2026-11-20', '2026-11-23'), -3);
  assert.equal(sisaHari('2027-01-01', '2026-12-31'), 1, 'across a year');
  assert.equal(sisaHari('2028-03-01', '2028-02-28'), 2, 'across a leap day');
  assert.equal(sisaHari(null, '2026-11-23'), null);
  assert.equal(sisaHari('2026-12-06', 'kapan-kapan'), null);
});

test('the ring labels follow the same rule', () => {
  const c = (tenggat, hariIni) => cincin({ wajib: 2, selesai: 1, tenggat, hariIni });
  assert.equal(c('2026-11-24', '2026-11-23').label, '1 hari lagi');
  assert.equal(c('2026-11-23', '2026-11-23').label, 'Tenggat hari ini');
  assert.deepEqual([c('2026-11-22', '2026-11-23').label, c('2026-11-22', '2026-11-23').lewat], ['Lewat tenggat 1 hari', true]);
  assert.equal(c(null, '2026-11-23').label, 'Tanpa tenggat');
});

test('one instant is a different calendar day in different time zones', () => {
  const kini = new Date('2026-11-23T16:30:00Z'); // 23:30 WIB, 00:30 WITA (next day), 01:30 WIT (next day)
  assert.equal(tanggalDiZona('Asia/Jakarta', kini), '2026-11-23');
  assert.equal(tanggalDiZona('Asia/Makassar', kini), '2026-11-24');
  assert.equal(tanggalDiZona('Asia/Jayapura', kini), '2026-11-24');
  assert.equal(tanggalDiZona('America/Los_Angeles', kini), '2026-11-23');
  // so the same stored deadline is "tomorrow" in Jakarta and "today" in Makassar
  assert.equal(sisaHari('2026-11-24', tanggalDiZona('Asia/Jakarta', kini)), 1);
  assert.equal(sisaHari('2026-11-24', tanggalDiZona('Asia/Makassar', kini)), 0);
});

test('the day changes exactly at midnight of the zone', () => {
  assert.equal(tanggalDiZona('Asia/Jakarta', new Date('2026-11-23T16:59:59Z')), '2026-11-23');
  assert.equal(tanggalDiZona('Asia/Jakarta', new Date('2026-11-23T17:00:00Z')), '2026-11-24');
  assert.equal(tanggalDiZona('Asia/Jayapura', new Date('2026-11-23T14:59:59Z')), '2026-11-23');
  assert.equal(tanggalDiZona('Asia/Jayapura', new Date('2026-11-23T15:00:00Z')), '2026-11-24');
});

test('an unknown zone falls back to the device day instead of throwing', () => {
  const kini = new Date(2026, 10, 23, 12);
  assert.equal(tanggalDiZona('Bukan/Zona', kini), '2026-11-23');
  assert.equal(tanggalDiZona(null, kini), '2026-11-23');
});

test('shared "today" follows the account zone once set, and a tab left open crosses midnight', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-11-23T16:59:00Z'));
    aturZonaHari('Asia/Jakarta');
    assert.equal(HARI_INI, '2026-11-23');
    const l = LOMBA_NYATA.find((x) => x.tenggatIso);
    assert.equal(l.hariLagi, sisaHari(l.tenggatIso, '2026-11-23'), 'catalogue countdowns are read against the shared day');
    vi.setSystemTime(new Date('2026-11-23T16:59:59Z'));
    assert.equal(segarkanHari(), false);
    vi.setSystemTime(new Date('2026-11-23T17:00:00Z'));
    assert.equal(l.hariLagi, sisaHari(l.tenggatIso, '2026-11-24'), 'midnight in Jakarta: one day less without any reload');
    assert.equal(HARI_INI, '2026-11-24');
    assert.equal(aturZonaHari('Asia/Jayapura'), false, '02:00 in Jayapura is the same day');
    vi.setSystemTime(new Date('2026-11-23T14:30:00Z'));
    assert.equal(aturZonaHari('Asia/Jakarta'), true);
    assert.equal(aturZonaHari('Asia/Jayapura'), false, '23:30 in Jayapura, 21:30 in Jakarta');
    vi.setSystemTime(new Date('2026-11-23T15:30:00Z'));
    assert.equal(hariIniKini(), '2026-11-24', 'Jayapura is already on the next day');
    assert.equal(aturZonaHari('Asia/Jakarta'), true, 'the Jakarta account is still on the 23rd');
    assert.equal(HARI_INI, '2026-11-23');
  } finally { aturZonaHari(null); vi.useRealTimers(); aturZonaHari(null); }
});

test('a persisted competition ignores its saved days-left number', () => {
  assert.deepEqual(denganSisaHari({ id: 'a', tenggatIso: '2026-12-06', hariLagi: 99 }, '2026-11-23'), { id: 'a', tenggatIso: '2026-12-06', hariLagi: 13 });
  assert.deepEqual(denganSisaHari({ id: 'a', hariLagi: 16 }, '2026-11-23'), { id: 'a', tenggatIso: null, hariLagi: null }, 'no stored date: no countdown, not a stale one');
  assert.equal(tenggatLomba({ tenggatIso: '2026-12-06', hariLagi: 99 }, '2026-11-23'), '2026-12-06');
});

test('a manual competition keeps the date the user typed; its days left move with the day', () => {
  const r = buatLombaManual({ nama: 'Lomba Esai Sekolah', penyelenggara: 'OSIS', kategori: 'karya-tulis', tenggatIso: '2026-12-06' }, { id: 'manual-1', hariIniIso: '2026-11-23' });
  const l = r.lomba;
  assert.equal(l.tenggatIso, '2026-12-06');
  assert.equal(l.hariLagi, 13);
  assert.equal(denganSisaHari(l, '2026-12-06').hariLagi, 0);
  assert.equal(denganSisaHari(l, '2026-12-08').hariLagi, -2);
});

test('the Slot card stores the date, and the Slot ring is counted from it on any later day', () => {
  const ada = () => false;
  const simpanan = { v: VERSI_BERSAMA, slot: ['manual-1'], kartu: { 'manual-1': { nama: 'Lomba Esai', kategori: 'karya-tulis', tenggatIso: '2026-12-06', hariLagi: 13 } } };
  const b = rapikanBersama(simpanan, ada);
  assert.equal(b.kartu['manual-1'].tenggatIso, '2026-12-06');
  assert.equal('hariLagi' in b.kartu['manual-1'], false, 'the days-left number is not persisted');
  const pada = (hariIni) => ringkasSlot(b, (id) => denganSisaHari({ id, ...b.kartu[id] }, hariIni), { hariIni })[0];
  assert.deepEqual([pada('2026-11-23').tenggat, pada('2026-11-23').hariLagi], ['2026-12-06', 13]);
  assert.deepEqual([pada('2026-11-30').tenggat, pada('2026-11-30').hariLagi], ['2026-12-06', 6], 'a week later the deadline has not moved');
  assert.deepEqual([pada('2026-12-06').tenggat, pada('2026-12-06').hariLagi], ['2026-12-06', 0]);
  assert.deepEqual([pada('2026-12-09').tenggat, pada('2026-12-09').hariLagi], ['2026-12-06', -3]);
  // even a caller that hands over a stale number gets the date's answer
  assert.equal(ringkasSlot(b, (id) => ({ id, ...b.kartu[id], hariLagi: 13 }), { hariIni: '2026-11-30' })[0].hariLagi, 6);
});

test('a card saved without a date has no deadline rather than a drifting one', () => {
  const b = rapikanBersama({ v: VERSI_BERSAMA, slot: ['lama'], kartu: { lama: { nama: 'Poster lama', hariLagi: 16 } } }, () => false);
  const s = ringkasSlot(b, (id) => denganSisaHari({ id, ...b.kartu[id] }, '2026-11-23'), { hariIni: '2026-11-23' })[0];
  assert.deepEqual([s.tenggat, s.hariLagi], [null, null]);
  assert.equal(cincin({ wajib: 0, selesai: 0, tenggat: s.tenggat, hariIni: '2026-11-23' }).label, 'Tanpa tenggat');
});

test('task priority and suggestions use the same day difference', () => {
  assert.equal(prioritasTugas({ tenggat: '2026-11-23' }, '2026-11-23').n, 0);
  assert.equal(prioritasTugas({ tenggat: '2026-11-20' }, '2026-11-23').n, -3);
  assert.equal(prioritasTugas({ tenggat: '2026-12-06' }, '2026-11-23').tingkat, 'rendah');
  const slot = [{ id: 'a', nama: 'Lomba A', disetujui: false, hariLagi: sisaHari('2026-11-23', '2026-11-23') }];
  const s = saranBerikut({ slot, tugas: [], lombaNyata: [], batas: 1, hariIni: '2026-11-23' });
  assert.match(s.find((x) => x.id === 'setujui:a').alasan, /Tenggat hari ini/);
});
