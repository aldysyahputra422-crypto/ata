// @vitest-environment node
// Dipindah dari prototipe tests/simpanan.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rapikan } from '@/lib/prototype/lomba/logic/simpanan.js';

const awal = () => ({ v: 2, deck: { antrean: ['a'], tersimpan: [], dilewati: [], slot: [], riwayat: [] }, peta: {}, unggahan: [], dipilih: 'a' });
const ada = (id) => ['a', 'b'].includes(id);

test('an older save missing fields is merged over the fresh state', () => {
  const r = rapikan({ v: 2, deck: { antrean: ['b'], tersimpan: [], dilewati: [], slot: [], riwayat: [] } }, awal(), ada);
  assert.deepEqual(r.unggahan, []);
  assert.deepEqual(r.deck.antrean, ['b']);
});

test('a save from another version is replaced by the fresh state', () => {
  assert.deepEqual(rapikan({ deck: 'rusak' }, awal(), ada), awal());
  assert.deepEqual(rapikan(null, awal(), ada), awal());
});

test('ids the demo no longer knows are dropped from every list', () => {
  const r = rapikan({ v: 2, deck: { antrean: ['a', 'x'], tersimpan: ['x'], dilewati: ['b'], slot: ['x', 'a'], riwayat: [{ id: 'x', aksi: 'slot' }] }, dipilih: 'x' }, awal(), ada);
  assert.deepEqual(r.deck.antrean, ['a']);
  assert.deepEqual(r.deck.tersimpan, []);
  assert.deepEqual(r.deck.slot, ['a']);
  assert.deepEqual(r.deck.riwayat, []);
  assert.equal(r.dipilih, 'a');
});
