// @vitest-environment node
// Dipindah dari prototipe tests/biaya.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { perkiraanSesi } from '@/lib/prototype/sidang/logic/biaya.js';
import { PENYEDIA } from '@/lib/prototype/sidang/data/penyedia.js';

test('token range follows 900 to 1400 per question plus 1500 per judge summary', () => {
  const r = perkiraanSesi({ jumlahJuri: 4, pertanyaanPerJuri: 2, penyedia: { hargaPer1kToken: 0.5 } });
  assert.equal(r.tokenMin, 4 * 2 * 900 + 4 * 1500);
  assert.equal(r.tokenMax, 4 * 2 * 1400 + 4 * 1500);
});

test('rupiah range is rounded up to the nearest 100 and labelled with thousand dots', () => {
  const r = perkiraanSesi({ jumlahJuri: 4, pertanyaanPerJuri: 2, penyedia: { hargaPer1kToken: 150 } });
  assert.equal(r.rupiahMin, 1980);
  assert.equal(r.rupiahMax, 2580);
  assert.equal(r.label, '≈ Rp2.000–Rp2.600');
  assert.match(r.label, /^≈ Rp[\d.]+–Rp[\d.]+$/);
});

test('large amounts get a thousand separator', () => {
  const r = perkiraanSesi({ jumlahJuri: 5, pertanyaanPerJuri: 3, penyedia: { hargaPer1kToken: 1200 } });
  assert.match(r.label, /^≈ Rp\d{1,3}(\.\d{3})+–Rp\d{1,3}(\.\d{3})+$/);
});

test('the first provider is the local partner and every id is unique', () => {
  assert.equal(PENYEDIA[0].mitra, true);
  assert.equal(new Set(PENYEDIA.map((p) => p.id)).size, PENYEDIA.length);
  for (const id of ['openai', 'anthropic', 'google', 'openrouter', 'custom']) assert.ok(PENYEDIA.some((p) => p.id === id), id);
});
