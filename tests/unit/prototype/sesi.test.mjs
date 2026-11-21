// @vitest-environment node
// Dipindah dari prototipe tests/sesi.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { bacaJuknis, pilihPanel } from '@/lib/prototype/sidang/logic/panel.js';
import { buatSesi, jawab, ringkas, simpanRiwayat, muatRiwayat, nilai, predikat } from '@/lib/prototype/sidang/sesi.js';

const juknis = bacaJuknis('Lomba Karya Tulis Ilmiah. Orisinalitas (30%) Metodologi (40%) Presentasi (30%). Dinilai 3 juri.');
const panel = pilihPanel(juknis, 7);
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('a session has two questions per judge, alternating between judges', () => {
  const s = buatSesi(panel, juknis, 'LKTI Garuda Muda');
  assert.equal(s.tanyaJawab.length, 6);
  assert.deepEqual(s.tanyaJawab.map((t) => t.juriId), [...panel.juri.map((j) => j.id), ...panel.juri.map((j) => j.id)]);
  assert.equal(s.giliran, 0);
  assert.equal(s.status, 'berjalan');
  for (const t of s.tanyaJawab) assert.ok(t.tanya.length > 10);
});

test('answering fills the answer and moves to the next turn', () => {
  const s = jawab(buatSesi(panel, juknis, 'LKTI'), 'Karena datanya dari survei 120 siswa.');
  assert.equal(s.tanyaJawab[0].jawab, 'Karena datanya dari survei 120 siswa.');
  assert.equal(s.giliran, 1);
});

test('the last answer finishes the session; weak answers add one follow-up per judge (6 + 3 = 9 turns)', () => {
  let s = buatSesi(panel, juknis, 'LKTI');
  let n = 0;
  while (s.status === 'berjalan' && n < 50) { s = jawab(s, 'jawaban ' + n); n++; }
  assert.equal(s.status, 'selesai');
  assert.equal(n, 9, 'every judge pressed exactly once after a weak answer');
  assert.equal(s.tanyaJawab.filter((t) => t.desakan).length, 3);
  assert.equal(jawab(s, 'lagi').giliran, 9);
});

const KUAT = 'Karena data survei 120 siswa selama dua minggu menunjukkan 64 persen memilih gorengan, metode ini bisa dicek ulang; keterbatasannya sampel hanya satu sekolah.';

test('a strong answer is not pressed; a weak one is pressed by the same judge right away', () => {
  const s0 = buatSesi(panel, juknis, 'LKTI');
  const kuat = jawab(s0, KUAT);
  assert.equal(kuat.tanyaJawab.length, 6, 'no follow-up after evidence');
  const lemah = jawab(s0, 'Pokoknya bagus banget dan bermanfaat.');
  assert.equal(lemah.tanyaJawab.length, 7);
  assert.equal(lemah.tanyaJawab[1].desakan, true);
  assert.equal(lemah.tanyaJawab[1].juriId, s0.tanyaJawab[0].juriId);
  assert.equal(lemah.tanyaJawab[1].tanya, panel.juri[0].desakan);
});

test('the rubric is strict: length alone earns nothing, a claim without number or source caps at 2, 5 needs everything', () => {
  assert.equal(nilai('ya'), 1);
  assert.equal(nilai('Menurut saya karya ini sangat bermanfaat untuk masyarakat luas karena idenya baru dan berbeda dari yang lain sehingga layak menang.'), 2);
  assert.equal(nilai('Saya mewawancarai 30 calon pengguna, karena itu fitur ini diprioritaskan.'), 4);
  assert.equal(nilai(KUAT), 5);
  assert.equal(nilai('Mungkin kayaknya hasilnya 20 persen dari survei, karena pokoknya bagus.'), 3, 'hedging costs a point');
  assert.equal(predikat(2.9), 'Belum memenuhi standar nasional');
  assert.equal(predikat(3), 'Memenuhi standar nasional');
  assert.equal(predikat(4.2), 'Kompetitif di tingkat nasional');
  assert.equal(predikat(4.8), 'Setara standar internasional');
});

test('the summary scores every criterion 1 to 5 for every judge and explains each question', () => {
  let s = buatSesi(panel, juknis, 'LKTI');
  for (let i = 0; s.status === 'berjalan' && i < 50; i++) s = jawab(s, i % 2 ? 'singkat' : 'Jawaban panjang dengan data survei 120 siswa dan alasan metode yang jelas.');
  const r = ringkas(s);
  assert.ok(/standar|Kompetitif/.test(r.predikat));
  assert.equal(r.perJuri.length, 3);
  for (const j of r.perJuri) {
    assert.deepEqual(Object.keys(j.skor), ['Orisinalitas', 'Metodologi', 'Presentasi']);
    for (const v of Object.values(j.skor)) assert.ok(v >= 1 && v <= 5 && Number.isInteger(v));
    assert.ok(j.alasan.length >= 2 && j.alasan.length <= 3, 'two questions, plus at most one follow-up');
  }
  assert.ok(r.catatan.length > 20);
});

test('saving an unfinished session stores it as "belum-selesai" and loads it back', () => {
  const store = memStore();
  const s = jawab(buatSesi(panel, juknis, 'LKTI'), 'satu');
  simpanRiwayat(s, store);
  const list = muatRiwayat(store);
  assert.equal(list.length, 1);
  assert.equal(list[0].status, 'belum-selesai');
  assert.equal(list[0].giliran, 1);
});

test('saving the same session twice keeps one entry', () => {
  const store = memStore(), s = buatSesi(panel, juknis, 'LKTI');
  simpanRiwayat(s, store); simpanRiwayat(jawab(s, 'x'), store);
  assert.equal(muatRiwayat(store).length, 1);
});

test('blocked storage does not throw', () => {
  const s = buatSesi(panel, juknis, 'LKTI');
  assert.doesNotThrow(() => simpanRiwayat(s, null));
  assert.deepEqual(muatRiwayat(null), []);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => simpanRiwayat(s, broken));
  assert.deepEqual(muatRiwayat(broken), []);
});

test('a criterion scores higher when the answer to its question is stronger', () => {
  let s = buatSesi(panel, juknis, 'LKTI');
  const kuat = 'Karena data survei 120 siswa selama dua minggu menunjukkan 64 persen memilih gorengan, metode ini bisa dicek ulang oleh guru dan pengelola kantin.';
  for (let i = 0; s.status === 'berjalan' && i < 50; i++) { const t = s.tanyaJawab[s.giliran]; s = jawab(s, t.kriteria === 'Metodologi' && !t.desakan ? kuat : 'ya'); }
  const r = ringkas(s), j = r.perJuri.find((p) => s.tanyaJawab.some((t) => t.juriId === p.id && t.kriteria === 'Metodologi'));
  assert.ok(j.skor.Metodologi > j.skor.Orisinalitas, JSON.stringify(j.skor));
});
