// @vitest-environment node
// Dipindah dari prototipe tests/jawab.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { jawabDemo, periksaTempel, BATAS_TEMPEL } from '@/lib/prototype/tanya/logic/jawab.js';
import { PROFIL, SLOT } from '@/lib/prototype/tanya/data/profil.js';

const konteks = { profil: PROFIL, slot: SLOT, ingatan: [], sudahIntegritas: false };

test('pertanyaan aturan lomba tanpa juknis tidak menyebut angka', () => {
  const jawab = jawabDemo('Berapa batas maksimal halaman KTI-nya?', konteks);
  assert.ok(!/\d/.test(jawab.teks), `ada angka: ${jawab.teks}`);
  assert.match(jawab.teks, /juknis|panduan resmi/i);
  assert.equal(jawab.pahamAturan, false);
});

test('pertanyaan biaya dan tenggat tanpa juknis juga tidak mengarang', () => {
  for (const tanya of ['Biaya pendaftarannya berapa?', 'Deadline pengumpulannya kapan?', 'Format ukuran font berapa?']) {
    const jawab = jawabDemo(tanya, konteks);
    assert.ok(!/\d/.test(jawab.teks), `${tanya} → ${jawab.teks}`);
  }
});

test('dengan juknis terlampir, Ata boleh menyebut isi juknis', () => {
  const jawab = jawabDemo('Berapa batas halamannya?', {
    ...konteks,
    slot: { ...SLOT, juknis: true, ringkasJuknis: 'Maksimal 15 halaman, margin 2,5 cm.' },
  });
  assert.match(jawab.teks, /15 halaman/);
  assert.equal(jawab.pahamAturan, true);
});

test('tempel 12.000 karakter diterima, lebih dari itu ditolak dengan pesan jelas dan teks utuh', () => {
  const pas = 'a'.repeat(BATAS_TEMPEL);
  assert.equal(periksaTempel(pas).ok, true);

  const lewat = 'b'.repeat(BATAS_TEMPEL + 1);
  const hasil = periksaTempel(lewat);
  assert.equal(hasil.ok, false);
  assert.equal(hasil.teks, lewat, 'teks tidak boleh hilang');
  assert.match(hasil.galat, /12\.000/);
  assert.match(hasil.galat, /tidak hilang/i);
});

test('jawaban demo biasa memuat kartu langkah hari ini', () => {
  const jawab = jawabDemo('Aku harus mulai dari mana?', konteks);
  assert.ok(jawab.teks.length > 40);
  assert.equal(jawab.kartu.judul, 'Langkah hari ini');
  assert.ok(jawab.kartu.butir.length >= 2);
  assert.ok(jawab.kartu.butir.every((b) => b.menit <= 30), 'langkah harus kecil');
});

test('"aku mentok" mengecilkan target, bukan menambah tugas', () => {
  const jawab = jawabDemo('Aku mentok, bingung banget', konteks);
  assert.equal(jawab.kartu.judul, 'Satu langkah kecil');
  assert.equal(jawab.kartu.butir.length, 1);
  assert.match(jawab.teks, /kecil/i);
});

test('catatan integritas muncul sekali per lomba', () => {
  const pertama = jawabDemo('Halo', konteks);
  assert.ok(pertama.integritas, 'catatan integritas belum muncul');
  assert.match(pertama.integritas, /aturan penggunaan AI|sitasi/i);
  const kedua = jawabDemo('Halo lagi', { ...konteks, sudahIntegritas: true });
  assert.equal(kedua.integritas, null);
});

test('jawaban menyebut sumber konteks yang dipakai', () => {
  const jawab = jawabDemo('Halo', { ...konteks, ingatan: [{ teks: 'a' }, { teks: 'b' }] });
  assert.match(jawab.sumber, /profil/);
  assert.match(jawab.sumber, /2 ingatan/);
});
