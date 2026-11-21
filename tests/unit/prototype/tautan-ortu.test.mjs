// @vitest-environment node
// Dipindah dari prototipe tests/tautan-ortu.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  buatTautan,
  periksaTautan,
  cabut,
  bolehLihat,
  teksBagikan,
  BAGIAN,
  MASA_BERLAKU_HARI,
} from '@/lib/prototype/portofolio/logic/tautan.js';

const HARI = 24 * 60 * 60 * 1000;
const SEKARANG = Date.parse('2026-11-17T08:00:00.000Z');

test('tautan baru berlaku dan punya masa 30 hari', () => {
  const t = buatTautan({ nama: 'Raka', bagian: ['lomba', 'laporan'], sekarang: SEKARANG });
  assert.equal(periksaTautan(t, SEKARANG).valid, true);
  assert.equal(t.bagian.length, 2);
  const selisih = (Date.parse(t.kedaluwarsa) - SEKARANG) / HARI;
  assert.equal(selisih, MASA_BERLAKU_HARI);
  assert.ok(t.url.includes(t.token));
});

test('tautan kedaluwarsa ditolak dengan kalimat jelas', () => {
  const t = buatTautan({ sekarang: SEKARANG, hari: 1 });
  const hasil = periksaTautan(t, SEKARANG + 2 * HARI);
  assert.equal(hasil.valid, false);
  assert.match(hasil.alasan, /kedaluwarsa/i);
});

test('tautan yang dicabut langsung mati', () => {
  const t = buatTautan({ sekarang: SEKARANG });
  const mati = cabut(t, SEKARANG + HARI);
  assert.equal(periksaTautan(mati, SEKARANG + HARI).valid, false);
  assert.match(periksaTautan(mati, SEKARANG + HARI).alasan, /dicabut/i);
});

test('bagian terlarang tidak pernah bisa dibuat', () => {
  const t = buatTautan({ bagian: ['chat', 'ingatan', 'apiKey', 'profil', 'lomba'], sekarang: SEKARANG });
  assert.deepEqual(t.bagian, ['lomba']);
  assert.equal(bolehLihat(t, 'chat'), false);
  assert.equal(bolehLihat(t, 'ingatan'), false);
  assert.equal(bolehLihat(t, 'lomba'), true);
});

test('bagian di luar pilihan tidak boleh dilihat', () => {
  const t = buatTautan({ bagian: ['lomba'], sekarang: SEKARANG });
  assert.equal(bolehLihat(t, 'laporan'), false);
  assert.equal(bolehLihat(t, 'sertifikat'), false);
});

test('tanpa bagian yang valid, tautan tetap punya satu bagian aman', () => {
  const t = buatTautan({ bagian: [], sekarang: SEKARANG });
  assert.deepEqual(t.bagian, ['lomba']);
});

test('token deterministik untuk nama + waktu yang sama', () => {
  const a = buatTautan({ nama: 'Raka', sekarang: SEKARANG });
  const b = buatTautan({ nama: 'Raka', sekarang: SEKARANG });
  assert.equal(a.token, b.token);
  const c = buatTautan({ nama: 'Nadia', sekarang: SEKARANG });
  assert.notEqual(a.token, c.token);
});

test('teks bagikan menyebut bagian, masa berlaku, dan batas privasi', () => {
  const t = buatTautan({ bagian: ['lomba', 'laporan'], sekarang: SEKARANG });
  const teks = teksBagikan(t, 'Raka');
  assert.match(teks, /baca saja/);
  assert.match(teks, /Lomba dan kemajuan/);
  assert.match(teks, /Laporan bulanan/);
  assert.match(teks, /Chat dan Ingatan Ata tidak pernah ikut/);
  assert.ok(teks.includes(t.url));
  assert.equal(BAGIAN.length, 3);
});
