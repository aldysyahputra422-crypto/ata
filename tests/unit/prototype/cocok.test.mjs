// @vitest-environment node
// Dipindah dari prototipe tests/cocok.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PROFIL } from '@/lib/prototype/lomba/data/lomba.js';
import { LOMBA_UJI as LOMBA } from './fixtures/lomba-uji.mjs';
import { skorCocok } from '@/lib/prototype/lomba/logic/cocok.js';

const byId = (id) => LOMBA.find((l) => l.id === id);

test('the test fixture has eight fictional competitions, each marked FIXTURE', () => {
  assert.equal(LOMBA.length, 8);
  assert.equal(new Set(LOMBA.map((l) => l.id)).size, 8);
  for (const l of LOMBA) assert.match(l.penyelenggara, /FIXTURE/);
});

test('a free, open-to-SMA competition in a favourite category with plenty of time scores high with reasons', () => {
  const r = skorCocok(byId('esai-lentera'), PROFIL);
  assert.ok(r.skor >= 85, String(r.skor));
  assert.ok(r.alasan.some((a) => /minatmu/.test(a)));
  assert.ok(r.alasan.some((a) => /SMA/.test(a)));
});

test('a competition not open to the student scores low and says why', () => {
  const r = skorCocok(byId('pitching-kampus'), PROFIL);
  assert.ok(r.skor < 40, String(r.skor));
  assert.ok(r.alasan.some((a) => /mahasiswa/i.test(a)));
});

test('scores stay within 0 to 100', () => {
  for (const l of LOMBA) { const s = skorCocok(l, PROFIL).skor; assert.ok(s >= 0 && s <= 100); }
});
