// @vitest-environment node
// Dipindah dari prototipe tests/foto.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { potongKotak, fotoSah } from '@/lib/prototype/app/logic/foto.js';

test('a landscape photo is cropped to a centred square by default', () => {
  assert.deepEqual(potongKotak(400, 200), { sx: 100, sy: 0, sisi: 200 });
});

test('zoom shrinks the source square; pan moves it but never outside the image', () => {
  assert.deepEqual(potongKotak(400, 400, { zoom: 2 }), { sx: 100, sy: 100, sisi: 200 });
  assert.deepEqual(potongKotak(400, 400, { zoom: 2, gx: 1, gy: -1 }), { sx: 200, sy: 0, sisi: 200 });
  const ekstrem = potongKotak(300, 600, { zoom: 9, gx: 5, gy: -5 });
  assert.ok(ekstrem.sx >= 0 && ekstrem.sy >= 0 && ekstrem.sx + ekstrem.sisi <= 300 && ekstrem.sy + ekstrem.sisi <= 600);
  assert.deepEqual(potongKotak(0, 10), { sx: 0, sy: 0, sisi: 0 });
});

test('only small raster data URLs from our canvas are accepted for storage', () => {
  assert.ok(fotoSah('data:image/jpeg;base64,/9j/4AAQ'));
  assert.ok(!fotoSah('data:image/svg+xml;base64,PHN2Zz4='), 'no SVG (could carry script)');
  assert.ok(!fotoSah('javascript:alert(1)'));
  assert.ok(!fotoSah('data:image/png;base64,' + 'A'.repeat(500_000)));
});
