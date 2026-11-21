// @vitest-environment node
// Dipindah dari prototipe tests/karusel.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { posisiMelingkar, putar } from '@/lib/prototype/lomba/logic/karusel.js';

test('on the first card the last card waits on the left, so no side is empty', () => {
  const pos = [0, 1, 2, 3, 4, 5].map((i) => posisiMelingkar(i, 0, 6));
  assert.deepEqual(pos, [0, 1, 2, -3, -2, -1]);
});

test('positions follow the active card around the ring', () => {
  assert.equal(posisiMelingkar(0, 5, 6), 1);
  assert.equal(posisiMelingkar(4, 5, 6), -1);
  assert.equal(posisiMelingkar(2, 2, 5), 0);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => posisiMelingkar(i, 0, 5)), [0, 1, 2, -2, -1]);
});

test('a single card stays in the middle', () => {
  assert.equal(posisiMelingkar(0, 0, 1), 0);
});

test('moving past either end wraps around', () => {
  assert.equal(putar(5, 1, 6), 0);
  assert.equal(putar(0, -1, 6), 5);
  assert.equal(putar(2, 1, 6), 3);
  assert.equal(putar(0, 1, 0), 0);
});
