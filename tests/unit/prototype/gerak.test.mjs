// @vitest-environment node
// Dipindah dari prototipe tests/gerak.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sudutCondong, parallaxHero } from '@/lib/prototype/shared/logic/gerak.js';

test('a folder leans towards the pointer and stays flat in the middle', () => {
  assert.deepEqual(sudutCondong(100, 50, 200, 100), { rx: 0, ry: 0 });
  const kananBawah = sudutCondong(200, 100, 200, 100, 6);
  assert.deepEqual(kananBawah, { rx: -6, ry: 6 });
  const kiriAtas = sudutCondong(0, 0, 200, 100, 6);
  assert.deepEqual(kiriAtas, { rx: 6, ry: -6 });
});

test('the lean never passes its limit, even outside the box', () => {
  const s = sudutCondong(-500, 900, 200, 100, 4);
  assert.ok(Math.abs(s.rx) <= 4 && Math.abs(s.ry) <= 4);
  assert.deepEqual(sudutCondong(10, 10, 0, 0), { rx: 0, ry: 0 });
});

test('the hero photo scrolls slower than the page and darkens as it is covered', () => {
  assert.deepEqual(parallaxHero(0, 300), { geser: 0, skala: 1, redup: 0 });
  const tengah = parallaxHero(150, 300);
  assert.equal(tengah.geser, 60);
  assert.ok(tengah.redup > 0 && tengah.redup < 0.35);
  assert.deepEqual(parallaxHero(9999, 300), parallaxHero(300, 300), 'stops once the hero is gone');
});

test('pulling past the top stretches the hero instead of moving it', () => {
  const tarik = parallaxHero(-60, 300);
  assert.equal(tarik.geser, 0);
  assert.equal(tarik.skala, 1.2);
  assert.equal(parallaxHero(-9999, 300).skala, 2);
  assert.deepEqual(parallaxHero(NaN, 300), { geser: 0, skala: 1, redup: 0 });
});
