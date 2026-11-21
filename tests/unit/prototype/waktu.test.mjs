// @vitest-environment node
// Dipindah dari prototipe tests/waktu.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { bacaJuknis, pilihPanel } from '@/lib/prototype/sidang/logic/panel.js';
import { buatSesi, jawab, ringkas } from '@/lib/prototype/sidang/sesi.js';
import { statusWaktu, BATAS_DETIK } from '@/lib/prototype/sidang/logic/waktu.js';

const juknis = bacaJuknis('Lomba Karya Tulis Ilmiah. Orisinalitas (30%) Metodologi (40%) Presentasi (30%). Dinilai 3 juri.');
const panel = pilihPanel(juknis, 7);

test('each question gets 90 seconds by default', () => assert.equal(BATAS_DETIK, 90));

test('time status moves from calm to low to over', () => {
  assert.deepEqual(statusWaktu(0, 90), { sisa: 90, label: '1:30', tingkat: 'aman' });
  assert.equal(statusWaktu(70, 90).tingkat, 'menipis');
  assert.equal(statusWaktu(70, 90).label, '0:20');
  assert.deepEqual(statusWaktu(95, 90), { sisa: 0, label: '0:00', tingkat: 'habis' });
});

test('answers record how long they took, and the summary counts overtime answers', () => {
  let s = buatSesi(panel, juknis, 'LKTI');
  /* jawaban berbukti, supaya juri tidak mendesak dan urutan tetap 6 giliran (desakan diuji di sesi.test.mjs) */
  const KUAT = 'Karena data survei 120 siswa menunjukkan 64 persen, metodenya bisa dicek ulang; keterbatasannya satu sekolah.';
  s = jawab(s, KUAT, 30);
  s = jawab(s, KUAT, 120);
  assert.equal(s.tanyaJawab[0].detik, 30);
  assert.equal(s.tanyaJawab[1].detik, 120);
  assert.equal(s.tanyaJawab.length, 6);
  for (let i = 2; i < s.tanyaJawab.length; i++) s = jawab(s, KUAT, 40);
  const r = ringkas(s);
  assert.equal(r.lewatWaktu, 1);
  assert.equal(r.rataDetik, Math.round((30 + 120 + 40 * 4) / 6));
});

test('answering without a duration still works', () => {
  const s = jawab(buatSesi(panel, juknis, 'LKTI'), 'tanpa waktu');
  assert.equal(s.tanyaJawab[0].detik, null);
});
