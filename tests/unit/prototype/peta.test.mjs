// @vitest-environment node
// Dipindah dari prototipe tests/peta.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LOMBA } from '@/lib/prototype/lomba/data/lomba.js';
import { usulkanLangkah, progres, validasiTanggal, posisiLangkah, tambahHari } from '@/lib/prototype/lomba/logic/peta.js';

const HARI_INI = '2026-11-13';
const kti = { ...LOMBA.find((l) => l.kategori === 'karya-tulis'), hariLagi: 21 };

test('a plan has 5 to 8 steps, in date order, from tomorrow up to two days before the deadline', () => {
  const { langkah, peringatan } = usulkanLangkah(kti, HARI_INI);
  assert.ok(langkah.length >= 5 && langkah.length <= 8);
  assert.equal(peringatan, null);
  assert.equal(langkah[0].tanggal, tambahHari(HARI_INI, 1));
  assert.ok(langkah.at(-1).tanggal <= tambahHari(HARI_INI, 19));
  for (let i = 1; i < langkah.length; i++) assert.ok(langkah[i].tanggal >= langkah[i - 1].tanggal);
});

test('a deadline under three days still gives a plan, compressed, with a warning', () => {
  const { langkah, peringatan } = usulkanLangkah({ ...kti, hariLagi: 2 }, HARI_INI);
  assert.ok(langkah.length >= 3);
  assert.match(peringatan, /mepet/);
  for (const l of langkah) assert.ok(l.tanggal <= tambahHari(HARI_INI, 2));
});

test('progress counts finished steps', () => {
  const { langkah } = usulkanLangkah(kti, HARI_INI);
  langkah[0].selesai = true; langkah[1].selesai = true;
  assert.deepEqual(progres(langkah), { selesai: 2, total: langkah.length, persen: Math.round((2 / langkah.length) * 100) });
});

test('dates in the past or after the deadline are refused with a clear message', () => {
  const tenggat = tambahHari(HARI_INI, 21);
  assert.equal(validasiTanggal(tambahHari(HARI_INI, 3), tenggat, HARI_INI), null);
  assert.match(validasiTanggal('2026-11-01', tenggat, HARI_INI), /sudah lewat/);
  assert.match(validasiTanggal(tambahHari(HARI_INI, 25), tenggat, HARI_INI), /tenggat/);
  assert.match(validasiTanggal('', tenggat, HARI_INI), /tanggal/i);
});

test('step markers sit along the maze path between start and finish', () => {
  assert.equal(posisiLangkah(0, 5), 0.12);
  assert.equal(posisiLangkah(4, 5), 0.92);
  assert.ok(posisiLangkah(2, 5) > posisiLangkah(1, 5));
});
