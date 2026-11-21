// @vitest-environment node
// Dipindah dari prototipe tests/paket-ata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PAKET } from '@/lib/prototype/masuk/data/paket.js';
import * as L from '@/lib/prototype/masuk/logic/paket.js';
const { batasSlot, bisaTambahSlot, fiturTerkunci, labelPaket } = L;

test('K-03: Gratis dan Pro sama-sama tiga Slot aktif', () => {
  assert.equal(batasSlot('gratis'), 3);
  assert.equal(batasSlot('pro'), 3);
  assert.equal(batasSlot('tidak-ada'), 3);
});

test('Slot keempat ditolak di Gratis maupun Pro', () => {
  assert.equal(bisaTambahSlot('gratis', 2).boleh, true);
  const penuh = bisaTambahSlot('gratis', 3);
  assert.equal(penuh.boleh, false);
  assert.equal(penuh.sisa, 0);
  assert.equal(bisaTambahSlot('pro', 3).boleh, false);
});



test('tidak ada fitur terkunci palsu; Pro menyatakan tidak termasuk biaya AI', () => {
  assert.deepEqual(fiturTerkunci('gratis'), []);
  assert.deepEqual(fiturTerkunci('pro'), []);
  assert.match(PAKET.pro.catatan.join(' '), /tidak termasuk biaya AI/);
});

test('label paket; daftar fitur tidak menjanjikan layanan yang belum ada', () => {
  assert.equal(labelPaket('pro'), 'Pro');
  const semua = [...PAKET.gratis.fitur, ...PAKET.pro.fitur].map((f) => f.label).join(' ');
  assert.doesNotMatch(semua, /mentor|WhatsApp|Drive|Prioritas antrean/i);
  assert.doesNotMatch(semua + ' ' + PAKET.pro.catatan.join(' '), /AI terkelola|pesan\/hari|kredit AI/i, 'BYOK: tidak ada AI yang disubsidi');
});

test('Pro tidak bisa diaktifkan dari browser: tidak ada fungsi aktivasi lokal (Pro hanya dari server)', () => {
  assert.equal(L.aktivasi, undefined);
});

test('entitlement limits come from ONE config (shared/logic/hak.js)', async () => {
  const { HAK } = await import('@/lib/prototype/shared/logic/hak.js');
  const { BATAS_PAKET } = await import('@/lib/prototype/shared/logic/bersama.js');
  for (const p of Object.keys(HAK)) {
    assert.equal(PAKET[p].batasSlot, HAK[p].slotAktif);
    assert.equal(BATAS_PAKET[p], HAK[p].slotAktif);
  }
  assert.equal(HAK.pro.slotAktif, 3, 'K-03: Pro 3 active Slots');
});
