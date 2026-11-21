// @vitest-environment node
// Dipindah dari prototipe tests/radar.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PROFIL } from '@/lib/prototype/lomba/data/lomba.js';
import { LOMBA_UJI as LOMBA } from './fixtures/lomba-uji.mjs';
import { buatDeck, putuskan, urungkan, lepasSlot, BATAS_SLOT } from '@/lib/prototype/lomba/logic/radar.js';

const awal = () => buatDeck(LOMBA, PROFIL, { slot: ['lkti-garuda', 'poster-hijau'] });

test('the deck excludes competitions already in a slot and is sorted by match', () => {
  const s = awal();
  assert.equal(BATAS_SLOT, 3);
  assert.ok(!s.antrean.includes('lkti-garuda'));
  assert.equal(s.antrean.length, 6);
  assert.equal(s.antrean[0], 'esai-lentera');
});

test('save and skip move the card out of the queue and into the right list', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'simpan');
  ({ state } = putuskan(state, state.antrean[0], 'lewati'));
  assert.deepEqual(state.tersimpan, ['esai-lentera']);
  assert.equal(state.dilewati.length, 1);
  assert.equal(state.antrean.length, 4);
});

test('a third slot is allowed, a fourth is refused without changing anything', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'slot');
  assert.equal(state.slot.length, 3);
  const next = state.antrean[0], r = putuskan(state, next, 'slot');
  assert.equal(r.ditolak, 'slot-penuh');
  assert.equal(r.state, state);
});

test('undo after making a slot releases the slot and puts the card back on top', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'slot');
  state = urungkan(state);
  assert.deepEqual(state.slot, ['lkti-garuda', 'poster-hijau']);
  assert.equal(state.antrean[0], 'esai-lentera');
  assert.equal(urungkan(urungkan(awal())).antrean.length, 6);
});

test('releasing a slot frees room for a new one', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'slot');
  state = lepasSlot(state, 'poster-hijau');
  assert.equal(putuskan(state, state.antrean[0], 'slot').ditolak, undefined);
});

test('a decision removes the card from every other list, and undo puts it back where it came from', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'lewati');
  ({ state } = putuskan(state, 'esai-lentera', 'simpan'));
  assert.deepEqual(state.dilewati, []);
  assert.deepEqual(state.tersimpan, ['esai-lentera']);
  state = urungkan(state);
  assert.deepEqual(state.tersimpan, []);
  assert.deepEqual(state.dilewati, ['esai-lentera']);
  assert.ok(!state.antrean.includes('esai-lentera'));
});

test('making a card that is already a Slot a Slot again is not refused as full', () => {
  let { state } = putuskan(awal(), 'esai-lentera', 'slot');
  const r = putuskan(state, 'esai-lentera', 'slot');
  assert.equal(r.ditolak, undefined);
  assert.equal(r.state.slot.length, 3);
});
