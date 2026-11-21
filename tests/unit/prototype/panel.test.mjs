// @vitest-environment node
// Dipindah dari prototipe tests/panel.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { JURI } from '@/lib/prototype/sidang/data/juri.js';
import { bacaJuknis, pilihPanel } from '@/lib/prototype/sidang/logic/panel.js';

const KTI = 'Lomba Karya Tulis Ilmiah Garuda Muda 2026\nKriteria penilaian:\nOrisinalitas (30%)\nMetodologi (40%)\nPresentasi (30%)\nKarya dinilai oleh 4 juri.';

test('there are exactly 20 judges with unique ids', () => {
  assert.equal(JURI.length, 20);
  assert.equal(new Set(JURI.map((j) => j.id)).size, 20);
});

test('reads category, weighted criteria and judge count from a KTI guide', () => {
  const j = bacaJuknis(KTI);
  assert.equal(j.kategori, 'karya-tulis');
  assert.deepEqual(j.kriteria.map((k) => [k.nama, k.bobot]), [['Orisinalitas', 30], ['Metodologi', 40], ['Presentasi', 30]]);
  assert.equal(j.jumlahJuri, 4);
});

test('reads "Nama: NN%" criteria too', () => {
  const j = bacaJuknis('Lomba poster lingkungan. Kreativitas: 50% Pesan: 50%');
  assert.equal(j.kategori, 'poster');
  assert.deepEqual(j.kriteria.map((k) => k.bobot), [50, 50]);
});

test('an unrecognised guide falls back to general, default criteria and 3 judges', () => {
  const j = bacaJuknis('Cerdas Cermat Budaya tingkat kota');
  assert.equal(j.kategori, 'umum');
  assert.deepEqual(j.kriteria.map((k) => k.bobot), [40, 40, 20]);
  assert.equal(j.jumlahJuri, 3);
});

test('judge count outside 3 to 5 is clamped', () => {
  assert.equal(bacaJuknis('Lomba esai, dinilai oleh 9 juri').jumlahJuri, 5);
  assert.equal(bacaJuknis('Lomba esai, dinilai oleh 2 juri').jumlahJuri, 3);
});

test('a panel has the requested size, unique judges, a category specialist, a general judge and a reason for each', () => {
  const j = bacaJuknis(KTI), p = pilihPanel(j, 7);
  assert.equal(p.juri.length, 4);
  assert.equal(new Set(p.juri.map((x) => x.id)).size, 4);
  assert.ok(p.juri.some((x) => x.fokus.includes('karya-tulis')));
  assert.ok(p.juri.some((x) => x.fokus.includes('umum')));
  for (const x of p.juri) assert.ok(p.alasan[x.id] && p.alasan[x.id].length > 10);
});

test('an unrecognised guide still yields a full panel', () => {
  const p = pilihPanel(bacaJuknis('Cerdas Cermat Budaya tingkat kota'), 3);
  assert.equal(p.juri.length, 3);
  for (const x of p.juri) assert.ok(p.alasan[x.id]);
});

test('the same seed gives the same panel and other seeds can differ', () => {
  const j = bacaJuknis(KTI);
  const ids = (s) => pilihPanel(j, s).juri.map((x) => x.id).join();
  assert.equal(ids(7), ids(7));
  assert.ok([8, 9, 10, 11, 12].some((s) => ids(s) !== ids(7)));
});

test('category keywords only match whole words (aktif, bukti, kolaborasi are not KTI or speech)', () => {
  assert.equal(bacaJuknis('Cerdas Cermat Budaya tingkat kota. Peserta aktif menjawab, tunjukkan bukti praktik.').kategori, 'umum');
  assert.equal(bacaJuknis('Lomba tari kolaborasi dan dekorasi panggung').kategori, 'umum');
  assert.equal(bacaJuknis('Lomba KTI nasional').kategori, 'karya-tulis');
  assert.equal(bacaJuknis('Lomba orasi ilmiah').kategori, 'karya-tulis');
  assert.equal(bacaJuknis('Lomba orasi kebangsaan').kategori, 'pidato');
});
