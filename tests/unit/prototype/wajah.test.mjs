// @vitest-environment node
// Dipindah dari prototipe tests/wajah.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { JURI } from '@/lib/prototype/sidang/data/juri.js';
import { wajahSvg, MOOD } from '@/lib/prototype/sidang/ui/wajah.js';

test('every judge has a distinct face (colour, eyes and accessory)', () => {
  const combos = JURI.map((j) => [j.warna, j.wajah.mata, j.wajah.aksesori].join('/'));
  assert.equal(new Set(combos).size, 20);
});

test('a face is a self-contained svg with a unique gradient id', () => {
  const a = wajahSvg(JURI[0], 'netral', 'a1'), b = wajahSvg(JURI[0], 'netral', 'b2');
  assert.match(a, /^<svg[^>]*viewBox="0 0 120 92"/);
  assert.doesNotMatch(a, /<script|<foreignObject|href=/);
  assert.match(a, /id="a1-rim"/);
  assert.notEqual(a, b);
});

test('only the angry mood has flames, only the happy mood smiles with arc eyes', () => {
  for (const m of MOOD) {
    const s = wajahSvg(JURI[3], m, 'x');
    assert.equal(/class="api"/.test(s), m === 'marah', m);
    assert.equal(/class="mata-senyum"/.test(s), m === 'senang', m);
  }
});

test('an unknown mood falls back to neutral', () => {
  assert.equal(wajahSvg(JURI[1], 'bingung', 'z'), wajahSvg(JURI[1], 'netral', 'z'));
});
