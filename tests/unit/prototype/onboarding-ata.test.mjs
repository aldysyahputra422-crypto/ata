// @vitest-environment node
// Dipindah dari prototipe tests/onboarding-ata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { LANGKAH } from '@/lib/prototype/masuk/data/onboarding.js';
import {
  validasiLangkah,
  kenalPersen,
  langkahBerikut,
  langkahSebelum,
  wajibBelum,
  MINAT_MAKS,
} from '@/lib/prototype/masuk/logic/onboarding.js';

const cari = (id) => LANGKAH.find((l) => l.id === id);

test('ada tujuh langkah, satu pertanyaan utama per layar', () => {
  assert.equal(LANGKAH.length, 7);
  assert.deepEqual(
    LANGKAH.map((l) => l.id),
    ['nama', 'jenjang', 'tahunLahir', 'sekolah', 'minat', 'target', 'jam']
  );
});

test('nama wajib dan dibatasi panjangnya', () => {
  assert.equal(validasiLangkah(cari('nama'), { nama: '' }).ok, false);
  assert.match(validasiLangkah(cari('nama'), { nama: 'R' }).galat.nama, /dua huruf/);
  assert.equal(validasiLangkah(cari('nama'), { nama: 'Raka' }).ok, true);
  assert.match(validasiLangkah(cari('nama'), { nama: 'a'.repeat(31) }).galat.nama, /tiga puluh/);
});

test('jenjang harus dari daftar', () => {
  assert.equal(validasiLangkah(cari('jenjang'), { jenjang: 'SD' }).ok, false);
  assert.equal(validasiLangkah(cari('jenjang'), { jenjang: 'SMA/SMK' }).ok, true);
});

test('tahun lahir masuk rentang usia', () => {
  assert.equal(validasiLangkah(cari('tahunLahir'), { tahunLahir: 2015 }).ok, false);
  assert.equal(validasiLangkah(cari('tahunLahir'), { tahunLahir: 2009 }).ok, true);
  assert.equal(validasiLangkah(cari('tahunLahir'), { tahunLahir: 'dua ribu' }).ok, false);
});

test('minat maksimal lima pilihan', () => {
  const enam = ['KTI', 'Esai', 'Olimpiade', 'Desain', 'Video', 'Debat'];
  assert.equal(validasiLangkah(cari('minat'), { minat: enam }).ok, false);
  assert.match(validasiLangkah(cari('minat'), { minat: enam }).galat.minat, new RegExp(String(MINAT_MAKS)));
  assert.equal(validasiLangkah(cari('minat'), { minat: enam.slice(0, 5) }).ok, true);
});

test('langkah opsional boleh kosong tanpa galat', () => {
  assert.equal(validasiLangkah(cari('sekolah'), {}).ok, true);
  assert.equal(validasiLangkah(cari('minat'), {}).ok, true);
});

test('meter kenal naik sesuai field yang terisi', () => {
  assert.equal(kenalPersen({}), 0);
  assert.ok(kenalPersen({ nama: 'Raka' }) > 0);
  const sebagian = kenalPersen({ nama: 'Raka', jenjang: 'SMA/SMK' });
  const penuh = kenalPersen({
    nama: 'Raka',
    jenjang: 'SMA/SMK',
    tahunLahir: 2009,
    sekolah: 'SMAN 3',
    minat: ['KTI'],
    target: ['Juara'],
    jam: '5–7 jam',
    pengalaman: 'Provinsi',
  });
  assert.ok(sebagian < penuh, `${sebagian} < ${penuh}`);
  assert.equal(penuh, 100);
});

test('navigasi langkah maju dan mundur', () => {
  assert.equal(langkahBerikut('nama').id, 'jenjang');
  assert.equal(langkahBerikut('jam'), null);
  assert.equal(langkahSebelum('nama'), null);
  assert.equal(langkahSebelum('jenjang').id, 'nama');
});

test('wajibBelum hanya mengembalikan langkah wajib yang kosong', () => {
  const kosong = wajibBelum({});
  assert.equal(kosong.length, 3);
  const setengah = wajibBelum({ nama: 'Raka' });
  assert.equal(setengah.length, 2);
  assert.ok(!setengah.some((l) => l.id === 'nama'));
});
