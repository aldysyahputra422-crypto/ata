// @vitest-environment node
// Dipindah dari prototipe tests/tanya-ai.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { renderMarkdown } from '@/lib/prototype/tanya/logic/markdown.js';
import { riwayatUntukModel, promptSistem } from '@/lib/prototype/tanya/logic/percakapan.js';

test('markdown escapes model HTML before formatting it', () => {
  const h = renderMarkdown('<img src=x onerror=alert(1)> **tebal**');
  assert.ok(!h.includes('<img'), h);
  assert.match(h, /&lt;img/);
  assert.match(h, /<strong>tebal<\/strong>/);
});

test('markdown renders lists, code blocks, inline code, headings and https links only', () => {
  const h = renderMarkdown('## Rencana\n- satu\n- dua\n\n1. a\n2. b\n\n```js\nconst x = 1 < 2;\n```\nPakai `npm test` di [sini](https://contoh.id) bukan [ini](javascript:alert(1)).');
  assert.match(h, /md-judul--2/);
  assert.match(h, /<ul><li>satu<\/li><li>dua<\/li><\/ul>/);
  assert.match(h, /<ol><li>a<\/li><li>b<\/li><\/ol>/);
  assert.match(h, /<pre class="md-kode" data-bahasa="js"><code>const x = 1 &lt; 2;<\/code><\/pre>/);
  assert.match(h, /<code>npm test<\/code>/);
  assert.match(h, /href="https:\/\/contoh\.id"/);
  assert.ok(!h.includes('href="javascript'), 'non-https links stay text');
});

test('an unfinished code block while streaming still renders safely', () => {
  assert.match(renderMarkdown('```\nbaris satu'), /<pre class="md-kode"><code>baris satu<\/code><\/pre>/);
});

test('history sent to the model keeps only the user and real AI answers, starting from the user', () => {
  const r = riwayatUntukModel([
    { peran: 'ata', teks: 'jawaban contoh', ai: false },
    { peran: 'pengguna', teks: 'Halo' },
    { peran: 'ata', teks: 'Hai dari model', ai: true },
    { peran: 'galat', teks: 'x' },
    { peran: 'ata', teks: '', ai: true },
    { peran: 'pengguna', teks: 'Lanjut' },
  ]);
  assert.deepEqual(r, [{ peran: 'pengguna', teks: 'Halo' }, { peran: 'ata', teks: 'Hai dari model' }, { peran: 'pengguna', teks: 'Lanjut' }]);
  const panjang = Array.from({ length: 50 }, (_, i) => ({ peran: i % 2 ? 'ata' : 'pengguna', teks: `p${i}`, ai: true }));
  const pot = riwayatUntukModel(panjang, 5);
  assert.equal(pot[0].peran, 'pengguna');
  assert.ok(pot.length <= 5);
});

test('the system prompt forbids invented competition facts and carries only app context', () => {
  const s = promptSistem('Profil: Raka, SMA kelas 11');
  assert.match(s, /Jangan mengarang aturan, tanggal, biaya/);
  assert.match(s, /Profil: Raka/);
});
