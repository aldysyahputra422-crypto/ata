// @vitest-environment node
// Dipindah dari prototipe tests/konteks.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { pilihIngatan, paketKonteks, perkiraanToken, ANGGARAN_TOKEN } from '@/lib/prototype/tanya/logic/konteks.js';
import { PROFIL, SLOT, TUGAS } from '@/lib/prototype/tanya/data/profil.js';

const ingatan = (n, extra = {}) => ({
  id: `m${n}`,
  jenis: 'fakta',
  teks: `Ingatan nomor ${n}`,
  disematkan: false,
  dibuat: `2026-11-${String(n).padStart(2, '0')}T08:00:00.000Z`,
  ...extra,
});

test('pilihIngatan menaruh yang disematkan dulu, lalu yang terbaru', () => {
  const list = [
    ingatan(1),
    ingatan(2, { disematkan: true }),
    ingatan(9),
    ingatan(3, { disematkan: true }),
  ];
  const hasil = pilihIngatan(list, 3).map((m) => m.id);
  assert.deepEqual(hasil, ['m3', 'm2', 'm9']);
});

test('pilihIngatan membatasi 12 butir', () => {
  const list = Array.from({ length: 20 }, (_, i) => ingatan(i + 1));
  const hasil = pilihIngatan(list, 12);
  assert.equal(hasil.length, 12);
  assert.equal(hasil[0].id, 'm20');
});

test('paketKonteks memuat profil, Slot, tugas, dan ingatan', () => {
  const paket = paketKonteks({
    profil: PROFIL,
    slot: SLOT,
    tugas: TUGAS,
    ingatan: [ingatan(1), ingatan(2)],
  });
  assert.ok(paket.teks.includes('Raka'));
  assert.ok(paket.teks.includes(SLOT.judul));
  assert.ok(paket.teks.includes('Ingatan nomor 1'));
  assert.ok(paket.token <= ANGGARAN_TOKEN);
  assert.equal(paket.ingatan.length, 2);
});

test('anggaran kecil memangkas berurutan: pesan dulu, lalu ringkasan, lalu ingatan', () => {
  const panjang = 'kalimat panjang '.repeat(200);
  const paket = paketKonteks({
    profil: PROFIL,
    slot: SLOT,
    tugas: TUGAS,
    ingatan: [1, 2, 3].map((n) => ingatan(n, { teks: panjang })),
    ringkasan: panjang,
    pesan: [{ peran: 'pengguna', teks: panjang }],
    anggaran: 300,
  });
  assert.ok(paket.token <= paket.anggaran, `${paket.token} > ${paket.anggaran}`);
  assert.deepEqual(paket.dibuang, ['pesan', 'ringkasan', 'ingatan']);
  assert.ok(paket.teks.includes('Raka'), 'persona dan profil tetap ada');
});

test('Lupakan semua: ingatan tidak lagi muncul di teks konteks', () => {
  const paket = paketKonteks({ profil: PROFIL, slot: SLOT, tugas: [], ingatan: [] });
  assert.ok(!paket.teks.includes('Ingatan nomor'));
  assert.equal(paket.ingatan.length, 0);
  assert.ok(!paket.barisPakai.includes('ingatan'), paket.barisPakai);
});

test('baris "Ata pakai" menghitung sumber yang benar-benar dipakai', () => {
  const paket = paketKonteks({
    profil: PROFIL,
    slot: SLOT,
    tugas: TUGAS,
    ingatan: [ingatan(1), ingatan(2), ingatan(3)],
  });
  assert.equal(paket.barisPakai, 'Ata pakai: profil, Slot 2nd INTERVAL International Essay & Research Festival 2027, 3 ingatan');
});

test('tanpa Slot, baris pakai tidak menyebut Slot', () => {
  const paket = paketKonteks({ profil: PROFIL, slot: null, ingatan: [] });
  assert.equal(paket.barisPakai, 'Ata pakai: profil');
});

test('ingatan yang dipangkas anggaran tidak lagi disebut di baris pakai', () => {
  const panjang = 'kalimat panjang '.repeat(120);
  const paket = paketKonteks({
    profil: PROFIL,
    slot: SLOT,
    ingatan: [1, 2].map((n) => ingatan(n, { teks: panjang })),
    anggaran: 300,
  });
  assert.ok(paket.dibuang.includes('ingatan'));
  assert.equal(paket.ingatan.length, 0);
  assert.ok(!paket.barisPakai.includes('ingatan'), paket.barisPakai);
});
