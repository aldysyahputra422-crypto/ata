// @vitest-environment node
// Dipindah dari prototipe tests/cari-lomba.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { normal, cocokKueri, saringLomba, kategoriDi } from '@/lib/prototype/lomba/logic/cari.js';
import { NAMA_KATEGORI } from '@/lib/prototype/lomba/data/lomba.js';
import { LOMBA_UJI as LOMBA } from './fixtures/lomba-uji.mjs';

const cari = (id) => LOMBA.find((l) => l.id === id);
const semua = LOMBA.map((l) => l.id);

test('normalising ignores case, accents and extra spaces', () => {
  assert.equal(normal('  Ésai   LENTERA '), 'esai lentera');
});

test('an empty query matches everything', () => {
  assert.deepEqual(saringLomba(semua, cari, {}), semua);
  assert.ok(cocokKueri(cari('esai-lentera'), '   '));
});

test('every word must match, across name, organiser, scope and category', () => {
  assert.deepEqual(saringLomba(semua, cari, { kueri: 'esai' }), ['esai-lentera']);
  assert.deepEqual(saringLomba(semua, cari, { kueri: 'lentera nasional' }), ['esai-lentera']);
  assert.deepEqual(saringLomba(semua, cari, { kueri: 'lentera kota' }), []);
  assert.deepEqual(saringLomba(semua, cari, { kueri: 'olimpiade', namaKategori: NAMA_KATEGORI }), ['osn-cakrawala']);
  assert.ok(saringLomba(semua, cari, { kueri: 'garuda' }).includes('lkti-garuda'));
});

test('category and query combine', () => {
  assert.deepEqual(saringLomba(semua, cari, { kategori: 'bisnis', kueri: 'kampus' }), ['pitching-kampus']);
  assert.deepEqual(saringLomba(semua, cari, { kategori: 'poster', kueri: 'kampus' }), []);
});

test('unknown ids are dropped instead of crashing', () => {
  assert.deepEqual(saringLomba(['tidak-ada', 'esai-lentera'], cari, {}), ['esai-lentera']);
});

test('only categories present in the list are offered, in a fixed order', () => {
  assert.deepEqual(kategoriDi(['osn-cakrawala', 'esai-lentera', 'lkti-garuda'], cari, NAMA_KATEGORI), ['karya-tulis', 'olimpiade']);
  assert.deepEqual(kategoriDi([], cari, NAMA_KATEGORI), []);
});
