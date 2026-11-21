// @vitest-environment node
// Dipindah dari prototipe tests/konteks-ai.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { paketKonteks, lombaRelevan } from '@/lib/prototype/tanya/logic/konteks.js';
import { promptSistem, PROMPT_ATA } from '@/lib/prototype/tanya/logic/percakapan.js';
import { LOMBA_UJI } from './fixtures/lomba-uji.mjs';

const nyata = LOMBA_UJI.map((l) => ({ ...l, nyata: true, sumber: 'Poster uji' }));

test('competitions are retrieved only when the question is about competitions, capped and ranked by match', () => {
  assert.deepEqual(lombaRelevan(nyata, 'Apa kabar hari ini?'), [], 'small talk pulls no catalogue');
  const r = lombaRelevan(nyata, 'Lomba olimpiade apa yang cocok buat saya?', ['olimpiade']);
  assert.ok(r.length <= 5);
  assert.equal(r[0].kategori, 'olimpiade');
  const dekat = lombaRelevan(nyata, 'Lomba mana yang deadline-nya paling dekat?');
  assert.equal(dekat[0].id, 'poster-hijau', 'the 2-day deadline leads when asking about deadlines');
});

test('closed and non-real competitions are never handed to the AI', () => {
  const daftar = [{ ...nyata[0], hariLagi: -3 }, { ...nyata[1], nyata: false }, nyata[2]];
  assert.deepEqual(lombaRelevan(daftar, 'lomba apa yang cocok?').map((l) => l.id), [nyata[2].id]);
});

test('a category switched off is not in the context and not claimed in the "Ata pakai" line', () => {
  const p = paketKonteks({ profil: null, slot: null, progres: { level: 1, xp: 30, streak: 1, selesai: 3, terlambat: 1, slot: [] } });
  assert.doesNotMatch(p.teks, /Profil:/);
  assert.match(p.teks, /Progres:/);
  assert.doesNotMatch(p.barisPakai, /profil/);
  assert.match(p.barisPakai, /progres/);
});

test('the AI context omits the old demo persona; the production prompt carries identity, factuality and the no-tools rule', () => {
  const p = paketKonteks({ profil: { nama: 'Raka', jenjang: 'SMA', sekolah: 'X' }, persona: false });
  assert.doesNotMatch(p.teks, /asisten lomba untuk pelajar Indonesia, bagian dari Sobat Ambis/);
  const s = promptSistem(p.teks);
  assert.match(s, /personal AI agent/);
  assert.match(s, /TIDAK punya alat untuk mencari di internet/);
  assert.match(s, /Jangan mengarang aturan, tanggal, biaya/);
  assert.match(s, /KONTEKS PENGGUNA/);
  assert.ok(s.endsWith(p.teks.trim()));
  assert.ok(PROMPT_ATA.length > 1500, 'a real production prompt, not a one-liner');
});

test('each competition line carries its source and says when data is missing', () => {
  const p = paketKonteks({ lomba: [{ ...nyata[0], tenggatIso: null, hariLagi: null, biaya: null, tingkat: [] }], persona: false });
  assert.match(p.teks, /belum tertulis/);
  assert.match(p.teks, /Poster uji/);
  assert.match(p.barisPakai, /1 lomba relevan/);
});
