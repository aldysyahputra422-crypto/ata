// @vitest-environment node
// Dipindah dari prototipe tests/lingkungan.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { geserParallax, skalaDok } from '@/lib/prototype/shared/logic/lingkungan.js';

test('the background drifts gently against the pointer and rests in the middle', () => {
  assert.deepEqual(geserParallax(500, 300, 1000, 600, 10), { gx: 0, gy: 0 });
  assert.deepEqual(geserParallax(1000, 600, 1000, 600, 10), { gx: -10, gy: -6 });
  assert.deepEqual(geserParallax(0, 0, 1000, 600, 10), { gx: 10, gy: 6 });
  const luar = geserParallax(-5000, 9000, 1000, 600, 10);
  assert.ok(Math.abs(luar.gx) <= 10 && Math.abs(luar.gy) <= 6, 'never more than the amplitude');
  assert.deepEqual(geserParallax(1, 1, 0, 0), { gx: 0, gy: 0 });
});

test('dock magnification peaks under the pointer, eases to neighbours, and stops at the reach', () => {
  assert.equal(skalaDok(0), 1.55);
  const dekat = skalaDok(40), jauh = skalaDok(110);
  assert.ok(dekat < 1.55 && dekat > jauh && jauh > 1, `${dekat} > ${jauh}`);
  assert.equal(skalaDok(150), 1);
  assert.equal(skalaDok(-40), dekat, 'symmetric above and below');
  assert.equal(skalaDok(NaN), 1);
});

test('the dusk environment ships in sizes fit for phone and desktop, all light', () => {
  for (const n of ['senja-2000', 'senja-1280', 'senja-potret']) {
    const u = new URL(`../../../public/prototype/assets/lingkungan/${n}.webp`, import.meta.url);
    assert.ok(existsSync(u), n);
    assert.ok(statSync(u).size < 260_000, `${n} is ${statSync(u).size} bytes`);
  }
});
