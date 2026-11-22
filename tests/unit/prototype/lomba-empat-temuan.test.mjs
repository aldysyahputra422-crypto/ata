// @vitest-environment node
// Dipindah dari prototipe tests/lomba-empat-temuan.test.mjs. Kasus uji sama; import dan path mengikuti Vitest.
/* Regression guards for the four Lomba browser findings (see docs/perbaikan-lomba-empat-temuan.md).
   Behaviour itself is exercised in the browser by the app's Playwright suite; these keep the source from drifting back. */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baca = (p) => readFileSync(p, 'utf8');
const slot = baca('src/lib/prototype/lomba/ui/slot.js'), radar = baca('src/lib/prototype/lomba/ui/radar.js'), poster = baca('src/lib/prototype/lomba/ui/poster.js'), css = baca('src/styles/prototype/shared/lingkungan.css');

test('folder Slot: panel, tutup and esc_ are declared before the transition callback can run', () => {
  const badan = slot.slice(slot.indexOf('function bukaFolder('));
  const iTransisi = badan.indexOf("}, 'folder');"); /* end of the opening transition */
  assert.ok(iTransisi > -1);
  for (const nama of ['const panel =', 'const tutup =', 'const esc_ =', "document.addEventListener('keydown', esc_)"]) {
    const i = badan.indexOf(nama);
    assert.ok(i > -1 && i < iTransisi, nama + ' must come before the opening transition');
  }
});

test('folder Slot: closing does not wait for the transition to finish', () => {
  const tutup = slot.slice(slot.indexOf('const tutup ='), slot.indexOf('const esc_ ='));
  assert.match(tutup, /transisiTampilan\(\(\) => \{\s*ov\.innerHTML = '';/);
  assert.match(tutup, /box\.focus\(/);
  assert.doesNotMatch(tutup, /finished\.then\(/);
});

test('Radar query: typed value is module state and every render reads it', () => {
  assert.match(radar, /let kueri = null/);
  assert.match(radar, /export const nilaiKueri = \(\) => kueri \?\? kueriAwal\(\)/);
  assert.match(radar, /value="\$\{esc\(nilaiKueri\(\)\)\}"/);
  assert.match(radar, /addEventListener\('input', \(\) => \{ kueri = elKueri\.value; \}\)/);
  assert.match(radar, /setSelectionRange\(\.\.\.fokusKueri\)/);
});

test('poster: images are not natively draggable and the card cancels dragstart', () => {
  const img = poster.match(/<img class="poster-art__[^>]*>/g) || [];
  assert.ok(img.length >= 2);
  for (const t of img) assert.match(t, /draggable="false"/);
  assert.match(radar, /addEventListener\('dragstart', \(e\) => e\.preventDefault\(\)\)/);
});

test('contrast: Lomba text that sits directly on the photo uses the on-photo tokens', () => {
  assert.match(css, /\.lb-daftar > section > p\.small\.muted, :root \.lb-peta__head \.eyebrow \{ color: var\(--teks-di-foto\); \}/);
  assert.match(css, /\.lb-detail__skor \{ color: var\(--aksen-teks\); \}/);
  assert.match(css, /\.lb-sub-row > \.btn--ghost \{ background: color-mix/);
});

test('contrast: the Detail meta row beside the score pill uses the on-photo token (desktop)', () => {
  assert.match(css, /:root \.lb-detail__lembar > p\.small\.muted, :root \.lb-detail__meta, :root #karuselHitung \{ color: var\(--teks-di-foto\); \}/);
});

test('embed: the frame corner is squared inside the shell despite the more specific ds.css device rule', () => {
  const embed = baca('src/styles/prototype/shared/embed.css'), ds = baca('src/styles/prototype/shared/ds.css');
  assert.match(ds, /\.device\[data-device="phone"\] \.app\s*\{[^}]*border-radius/);
  assert.match(embed, /html\[data-embed\] \.app,\s*html\[data-embed\] \.device\[data-device\] \.app \{[^}]*border-radius: 0;/);
});

test('shell: the two html[data-embed] rules of lomba.css are restated for the app shell', () => {
  const lomba = baca('src/styles/prototype/lomba/lomba.css'), apl = baca('src/app/(ata)/(apl)/lomba/lomba-apl.css');
  assert.match(lomba, /html\[data-embed\] \.lb-detail \{ --tepi:16px; \}/);
  assert.match(lomba, /html\[data-embed\] \.lb-aksi-bawah \{ --aksi-bawah:12px; \}/);
  assert.match(apl, /\.lb-detail \{\s*--tepi: 16px;/);
  assert.match(apl, /\.lb-aksi-bawah \{\s*--aksi-bawah: 12px;/);
});
