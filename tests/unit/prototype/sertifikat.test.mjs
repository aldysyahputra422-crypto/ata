// @vitest-environment node
// Dipindah dari prototipe tests/sertifikat.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SERTIFIKAT_AWAL, KATEGORI, TINGKAT } from '@/lib/prototype/portofolio/data/sertifikat.js';
import {
  validasiSertifikat,
  saring,
  urutkan,
  ukuranRingkas,
  labelDrive,
  BATAS_BERKAS,
} from '@/lib/prototype/portofolio/logic/sertifikat.js';

const sah = {
  nama: 'LKTI Garuda Muda 2027',
  penyelenggara: 'Yayasan Garuda Muda',
  tingkat: 'Nasional',
  tahun: 2027,
  peringkat: 'Finalis',
  kategori: 'kti',
  ukuranBytes: 2_400_000,
};

test('sertifikat lengkap lolos validasi', () => {
  const hasil = validasiSertifikat(sah);
  assert.equal(hasil.ok, true);
  assert.deepEqual(hasil.galat, {});
});

test('isian kurang dijelaskan per bidang, bukan satu pesan umum', () => {
  const hasil = validasiSertifikat({ nama: '  ', tahun: 1990, ukuranBytes: 0 });
  assert.equal(hasil.ok, false);
  assert.match(hasil.galat.nama, /minimal 3 karakter/);
  assert.match(hasil.galat.penyelenggara, /minimal 3 karakter/);
  assert.match(hasil.galat.tingkat, /Pilih tingkat/);
  assert.match(hasil.galat.tahun, /2015 dan 2027/);
  assert.match(hasil.galat.kategori, /Pilih kategori/);
  assert.match(hasil.galat.berkas, /Pilih berkas/);
});

test('berkas lebih dari 10 MB ditolak dengan saran', () => {
  const hasil = validasiSertifikat({ ...sah, ukuranBytes: BATAS_BERKAS + 1 });
  assert.equal(hasil.ok, false);
  assert.match(hasil.galat.berkas, /10 MB/);
  assert.match(hasil.galat.berkas, /Kompres/);
});

test('tahun harus bilangan bulat dalam rentang', () => {
  assert.equal(validasiSertifikat({ ...sah, tahun: 2026.5 }).ok, false);
  assert.equal(validasiSertifikat({ ...sah, tahun: 'dua ribu' }).ok, false);
  assert.equal(validasiSertifikat({ ...sah, tahun: 2027 }).ok, true);
});

test('kategori dan tingkat hanya dari taksonomi tetap', () => {
  assert.equal(validasiSertifikat({ ...sah, kategori: 'lain-lain' }).ok, false);
  assert.equal(validasiSertifikat({ ...sah, tingkat: 'Dunia' }).ok, false);
  assert.ok(TINGKAT.includes(sah.tingkat));
  assert.ok(KATEGORI.some((k) => k.id === sah.kategori));
});

test('urutan Galeri: tahun terbaru dulu', () => {
  const ids = urutkan(SERTIFIKAT_AWAL).map((s) => s.id);
  assert.deepEqual(ids, ['s1', 's3', 's2']);
});

test('saring memakai kategori dan kata kunci', () => {
  assert.deepEqual(saring(SERTIFIKAT_AWAL, { kategori: 'olimpiade' }).map((s) => s.id), ['s2']);
  assert.deepEqual(saring(SERTIFIKAT_AWAL, { cari: 'poster' }).map((s) => s.id), ['s3']);
  assert.deepEqual(saring(SERTIFIKAT_AWAL, { cari: 'garuda' }).map((s) => s.id), ['s1']);
  assert.equal(saring(SERTIFIKAT_AWAL, { kategori: 'semua', cari: '' }).length, 3);
});

test('saring tidak mengubah daftar asli', () => {
  const salinan = JSON.stringify(SERTIFIKAT_AWAL);
  saring(SERTIFIKAT_AWAL, { cari: 'zzz' });
  assert.equal(JSON.stringify(SERTIFIKAT_AWAL), salinan);
});

test('ukuran berkas dan status Drive punya label manusia', () => {
  assert.equal(ukuranRingkas(2_400_000), '2,4 MB');
  assert.equal(ukuranRingkas(450_000), '450 KB');
  assert.equal(labelDrive('antrean'), 'Menunggu unggah');
  assert.equal(labelDrive('tersimpan'), 'Tersimpan di Drive');
});
