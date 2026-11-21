// @vitest-environment node
// Dipindah dari prototipe tests/ds.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ICONS, icon } from '@/lib/prototype/shared/ds.js';

test('icon returns a 24x24 svg for a known name', () => {
  const s = icon('mic');
  assert.match(s, /<svg/);
  assert.match(s, /viewBox="0 0 24 24"/);
});

test('icon returns an empty string for an unknown name', () => {
  assert.equal(icon('tidak-ada'), '');
});

test('every icon is made only of path, circle and rect elements', () => {
  for (const [name, body] of Object.entries(ICONS)) {
    const tags = [...body.matchAll(/<([a-z]+)/g)].map((m) => m[1]);
    assert.ok(tags.length > 0, name + ' is empty');
    for (const t of tags) assert.ok(['path', 'circle', 'rect'].includes(t), name + ' uses <' + t + '>');
  }
});

test('the icons new screens need exist', () => {
  for (const n of ['mic', 'mic-off', 'key', 'gavel', 'upload', 'history', 'shield']) assert.ok(ICONS[n], n + ' missing');
});
