// @vitest-environment node
// Dipindah dari prototipe tests/lomba-manual.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { buatLombaManual, hariLagiDari, urlSah, bersihkanSimulasiLama, tandaSimulasiLama } from '@/lib/prototype/lomba/logic/manual.js';

const H = { id: 'manual-x', hariIniIso: '2026-11-21' };

test('F-1: a manual entry keeps only what the user typed; nothing is guessed', () => {
  const r = buatLombaManual({ nama: '  Lomba  Esai   Hijau ', kategori: 'karya-tulis', tenggatIso: '2026-12-01', url: 'https://contoh.ac.id/esai', biaya: 'Rp25.000' }, H);
  assert.equal(r.ok, true);
  const l = r.lomba;
  assert.equal(l.nama, 'Lomba Esai Hijau');
  assert.equal(l.hariLagi, 10);
  assert.equal(l.biaya, 25000);
  assert.equal(l.sumberUrl, 'https://contoh.ac.id/esai');
  assert.equal(l.manual, true);
  assert.equal(l.perluCek, true);
  assert.deepEqual(l.tingkat, [], 'unknown level stays empty');
  assert.equal(l.hadiah, 'Belum diisi');
  assert.equal(l.penyelenggara, 'Penyelenggara belum diisi');
  assert.equal(l.berkas, undefined, 'no poster file is attached as if it had been read');
});

test('F-1: empty optional fields stay null; invalid input is reported per field', () => {
  const kosong = buatLombaManual({ nama: 'Olimpiade Sains', kategori: 'olimpiade' }, H);
  assert.equal(kosong.lomba.biaya, null);
  assert.equal(kosong.lomba.tenggatIso, null);
  assert.equal(kosong.lomba.hariLagi, null);
  const salah = buatLombaManual({ nama: 'ab', kategori: 'sulap', url: 'javascript:alert(1)', biaya: '-' , tenggatIso: '2026-13-45' }, H);
  assert.equal(salah.ok, false);
  assert.deepEqual(Object.keys(salah.galat).sort(), ['kategori', 'nama', 'tenggatIso', 'url']);
});

test('only http(s) links are accepted; days are counted from the injected local date', () => {
  assert.equal(urlSah('ftp://x.id'), null);
  assert.equal(urlSah('data:text/html,hi'), null);
  assert.equal(urlSah('http://x.id/a'), 'http://x.id/a');
  assert.equal(hariLagiDari('2026-11-20', '2026-11-21'), -1);
  assert.equal(hariLagiDari(null, '2026-11-21'), null);
});

test('F-1: old simulated "poster reading" entries are dropped, or flagged when already a Slot', () => {
  const palsu = { id: 'unggah-a', unggahan: true, nama: 'Lomba Cipta Puisi Remaja', hadiah: 'Hadiah belum terbaca', berkas: 'x.jpg' };
  const palsuSlot = { ...palsu, id: 'unggah-b' };
  const asli = buatLombaManual({ nama: 'Lomba Cipta Puisi Remaja', kategori: 'karya-tulis' }, H).lomba;
  assert.equal(tandaSimulasiLama(asli), false, 'a real manual entry with the same name is not touched');
  const hasil = bersihkanSimulasiLama([palsu, palsuSlot, asli], ['unggah-b']);
  assert.deepEqual(hasil.map((u) => u.id), ['unggah-b', 'manual-x']);
  assert.equal(hasil[0].simulasiLama, true);
});
