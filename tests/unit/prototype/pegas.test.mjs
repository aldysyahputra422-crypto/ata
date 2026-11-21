// @vitest-environment node
// Dipindah dari prototipe tests/pegas.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { karetGelang, posisiSeret, simulasiPegas, kecepatanDari, putuskanLepas, langkahPegas, PEGAS } from '@/lib/prototype/shared/logic/pegas.js';
import { indeksKurung } from '@/lib/prototype/shared/logic/fokus.js';

test('rubber-band grows with the pull but never passes its limit', () => {
  assert.equal(karetGelang(0), 0);
  const a = karetGelang(-20, 48), b = karetGelang(-200, 48), c = karetGelang(-5000, 48);
  assert.ok(a < 0 && b < a && c < b, 'keeps the sign and keeps growing');
  assert.ok(Math.abs(c) < 48, 'stays under the limit');
  assert.ok(Math.abs(a) < 20, 'always lighter than the finger');
});

test('dragging a sheet down follows the finger, dragging it up is resisted', () => {
  assert.equal(posisiSeret(120), 120);
  assert.ok(posisiSeret(-120) > -48 && posisiSeret(-120) < 0);
  assert.equal(posisiSeret(NaN), 0);
});

test('the spring settles exactly on the target and overshoots a little when thrown', () => {
  const jejak = simulasiPegas(300, 0, 0);
  assert.equal(jejak.at(-1), 0);
  assert.ok(jejak.length > 5 && jejak.length < 60, `${jejak.length} frames`);
  const lempar = simulasiPegas(200, -2500, 0);
  assert.ok(Math.min(...lempar) < 0, 'a fast throw passes the rest point before coming back');
  assert.ok(Math.min(...lempar) > -80, 'but only a little');
});

test('one spring step pulls towards the target', () => {
  const s = langkahPegas({ x: 100, v: 0 }, 0, 1 / 60, PEGAS);
  assert.ok(s.x < 100 && s.v < 0);
});

test('velocity uses only the most recent samples', () => {
  assert.equal(kecepatanDari([]), 0);
  assert.equal(kecepatanDari([{ t: 0, y: 0 }]), 0);
  const v = kecepatanDari([{ t: 0, y: 0 }, { t: 500, y: 0 }, { t: 550, y: 50 }, { t: 600, y: 100 }]);
  assert.equal(v, 1000);
});

test('release: far or fast closes, short and slow springs back', () => {
  assert.equal(putuskanLepas({ geser: 200, kecepatan: 0, tinggi: 500 }), 'tutup');
  assert.equal(putuskanLepas({ geser: 60, kecepatan: 0, tinggi: 500 }), 'kembali');
  assert.equal(putuskanLepas({ geser: 40, kecepatan: 1400, tinggi: 500 }), 'tutup');
  assert.equal(putuskanLepas({ geser: 220, kecepatan: -900, tinggi: 500 }), 'kembali', 'flicking back up keeps it open');
});

test('focus trap wraps at both ends and pulls focus back in', () => {
  assert.equal(indeksKurung(4, 3, false), 0);
  assert.equal(indeksKurung(4, 0, true), 3);
  assert.equal(indeksKurung(4, 1, false), -1, 'middle: let the browser move');
  assert.equal(indeksKurung(4, -1, false), 0);
  assert.equal(indeksKurung(4, -1, true), 3);
  assert.equal(indeksKurung(0, 0, false), -1);
});
