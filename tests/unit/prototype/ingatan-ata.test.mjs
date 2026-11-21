// @vitest-environment node
// Dipindah dari prototipe tests/ingatan-ata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { saringSensitif, usulIngatan } from '@/lib/prototype/tanya/logic/ingatan.js';

test('menolak nomor kartu dan rekening', () => {
  for (const teks of [
    'Nomor kartu 4111 1111 1111 1111',
    'rekening 1234567890123456',
    'kartu: 5500-0000-0000-0004',
  ]) {
    const hasil = saringSensitif(teks);
    assert.equal(hasil.boleh, false, teks);
    assert.equal(hasil.jenis, 'kartu', teks);
  }
});

test('menolak kata sandi, OTP, dan API key', () => {
  for (const teks of ['kata sandi: rahasia123', 'OTP 998211', 'api key sk-live-abc123', 'PIN 1234']) {
    const hasil = saringSensitif(teks);
    assert.equal(hasil.boleh, false, teks);
    assert.equal(hasil.jenis, 'kredensial', teks);
  }
});

test('menolak data kesehatan', () => {
  const hasil = saringSensitif('Aku sedang terapi karena gangguan kecemasan');
  assert.equal(hasil.boleh, false);
  assert.equal(hasil.jenis, 'kesehatan');
  assert.match(hasil.alasan, /kesehatan/i);
});

test('menerima ingatan biasa tentang belajar dan lomba', () => {
  for (const teks of [
    'Lebih suka tugas kecil 25 menit',
    'Ingin lolos LKTI Garuda Muda 2027',
    'Punya laptop pinjaman dan kuota terbatas',
    'Topik: pemilahan sampah di kantin sekolah',
  ]) {
    assert.equal(saringSensitif(teks).boleh, true, teks);
  }
});

test('teks dengan nomor kartu tidak pernah jadi usulan Ingatan', () => {
  const usul = usulIngatan('Kartu hadiahku 4111 1111 1111 1111 buat beli buku');
  assert.equal(usul, null);
});

test('usulIngatan mengembalikan butir siap simpan untuk teks aman', () => {
  const usul = usulIngatan('Aku paling fokus belajar setelah jam 8 malam');
  assert.ok(usul);
  assert.equal(usul.jenis, 'preferensi');
  assert.match(usul.teks, /jam 8 malam/);
  assert.ok(usul.id.startsWith('m-'));
});

test('menangkap bentuk alami: sandinya, didiagnosis, norek pendek, CVV', () => {
  assert.equal(saringSensitif('Akun emailku raka@sekolah.sch.id sandinya rahasia123').boleh, false);
  assert.equal(saringSensitif('Aku didiagnosis asma tahun lalu').jenis, 'kesehatan');
  assert.equal(saringSensitif('No rekening BCA-ku 1234567890').jenis, 'kartu');
  assert.equal(saringSensitif('CVV kartuku 321').jenis, 'kredensial');
});
