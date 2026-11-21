// @vitest-environment node
// Dipindah dari prototipe tests/progres-ata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { cincin, heatmap, streak, kesiapanSubmit, tugasTelat, selisihHari } from '@/lib/prototype/masuk/logic/progres.js';
import { SLOT, TUGAS, AKTIVITAS, CHECKLIST_SUBMIT } from '@/lib/prototype/masuk/data/progres.js';

const HARI_INI = '2026-11-17';

test('cincin menghitung persen dan sisa hari', () => {
  const c = cincin({ wajib: 12, selesai: 5, tenggat: '2027-03-01', hariIni: HARI_INI });
  assert.equal(c.persen, 42);
  assert.equal(c.sisaHari, 104);
  assert.equal(c.label, '104 hari lagi');
  assert.equal(c.lewat, false);
});

test('cincin tanpa tugas tidak membagi nol', () => {
  const c = cincin({ wajib: 0, selesai: 0, tenggat: '2027-01-01', hariIni: HARI_INI });
  assert.equal(c.persen, 0);
  assert.equal(c.selesai, 0);
});

test('cincin lewat tenggat memakai kata, bukan angka negatif', () => {
  const c = cincin({ wajib: 5, selesai: 5, tenggat: '2026-11-01', hariIni: HARI_INI });
  assert.equal(c.lewat, true);
  assert.equal(c.label, 'Lewat tenggat 16 hari');
  assert.equal(c.persen, 100);
});

test('selisih hari memakai tanggal lokal tanpa jam', () => {
  assert.equal(selisihHari('2026-11-18', HARI_INI), 1);
  assert.equal(selisihHari('2026-11-17', HARI_INI), 0);
  assert.equal(selisihHari('bukan tanggal', HARI_INI), 0);
});

test('heatmap 12 minggu × 7 hari dan berakhir di minggu ini', () => {
  const h = heatmap(AKTIVITAS, { minggu: 12, hariIni: HARI_INI });
  assert.equal(h.kolom.length, 12);
  assert.ok(h.kolom.every((k) => k.length === 7));
  const semua = h.kolom.flat().map((s) => s.tanggal);
  assert.ok(semua.includes(HARI_INI));
  assert.ok(h.total > 0);
  assert.equal(h.max, 3);
});

test('heatmap minggu terakhir berisi hari ini dan hari esok ditandai masa depan', () => {
  const h = heatmap({}, { minggu: 2, hariIni: HARI_INI });
  const terakhir = h.kolom[h.kolom.length - 1];
  const selIni = terakhir.find((s) => s.tanggal === HARI_INI);
  assert.ok(selIni);
  assert.equal(selIni.masaDepan, false);
});

test('streak menghitung hari aktif berturut-turut', () => {
  const akt = { '2026-11-17': 1, '2026-11-16': 1, '2026-11-15': 1, '2026-11-14': 1 };
  assert.equal(streak(akt, { hariIni: HARI_INI }), 4);
});

test('satu hari libur per minggu tidak memutus streak', () => {
  const akt = { '2026-11-17': 1, '2026-11-16': 1, '2026-11-14': 1, '2026-11-13': 1 };
  const hasil = streak(akt, { hariIni: HARI_INI });
  assert.ok(hasil >= 3, `streak ${hasil}`);
});

test('dua hari kosong berturut-turut memutus streak', () => {
  const akt = { '2026-11-17': 1, '2026-11-13': 1 };
  assert.equal(streak(akt, { hariIni: HARI_INI }), 1);
});

test('kesiapan submit berbobot dan menyebut yang kurang', () => {
  const k = kesiapanSubmit(CHECKLIST_SUBMIT);
  assert.equal(k.total, 100);
  assert.equal(k.skor, 55);
  assert.equal(k.persen, 55);
  assert.equal(k.label, 'Masih ada yang kurang');
  assert.ok(k.kurang.some((x) => /rujukan|sitasi/i.test(x)));
});

test('kesiapan submit penuh dinilai siap', () => {
  const semua = CHECKLIST_SUBMIT.map((c) => ({ ...c, selesai: true }));
  assert.equal(kesiapanSubmit(semua).label, 'Siap submit');
  assert.deepEqual(kesiapanSubmit(semua).kurang, []);
});

test('tugas telat hanya yang belum selesai dan lewat tenggat', () => {
  const telat = tugasTelat(TUGAS, HARI_INI).map((t) => t.id);
  assert.deepEqual(telat, ['t3']);
});

test('data Slot demo punya tenggat dan tahap', () => {
  assert.equal(SLOT.length, 2);
  assert.ok(SLOT.every((s) => s.tahap.length >= 3));
});
