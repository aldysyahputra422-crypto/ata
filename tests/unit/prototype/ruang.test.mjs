// @vitest-environment node
// Dipindah dari prototipe tests/ruang.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { posisiDiKotak, RUANG } from '@/lib/prototype/sidang/data/ruang.js';

test('with the same aspect ratio a seat keeps its position', () => {
  assert.deepEqual(posisiDiKotak({ u: 0.5, v: 0.4 }, { imgRatio: 16 / 9, boxRatio: 16 / 9, posY: 0.5 }), { left: 50, top: 40 });
});

test('a tall image cropped to a wider box maps the seat into the visible band', () => {
  const p = posisiDiKotak({ u: 0.4971, v: 0.4886 }, { imgRatio: 720 / 1280, boxRatio: 9 / 8, posY: 0.45 });
  assert.equal(p.left, 49.71);
  assert.ok(Math.abs(p.top - 52.7) < 0.2, String(p.top));
});

test('room data has five seats for each layout', () => {
  for (const k of ['desktop', 'phone']) assert.equal(RUANG[k].kursi.length, 5);
});
