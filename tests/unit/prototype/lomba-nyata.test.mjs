// @vitest-environment node
// Dipindah dari prototipe tests/lomba-nyata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LOMBA, LOMBA_NYATA, PROFIL } from '@/lib/prototype/lomba/data/lomba.js';
import { LOMBA_UJI as LOMBA_DEMO } from './fixtures/lomba-uji.mjs';
import { skorCocok } from '@/lib/prototype/lomba/logic/cocok.js';
import { buatDeck } from '@/lib/prototype/lomba/logic/radar.js';
import { usulkanLangkah } from '@/lib/prototype/lomba/logic/peta.js';
import { labelBiaya, labelSisa, labelTingkat, masihBuka } from '@/lib/prototype/lomba/logic/label.js';

const byId = (id) => LOMBA.find((l) => l.id === id);
const iso = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

test('the catalogue is ten real competitions and nothing fictional, all ids unique', () => {
  assert.equal(LOMBA_NYATA.length, 10);
  assert.equal(LOMBA, LOMBA_NYATA);
  assert.ok(LOMBA.every((l) => l.nyata === true && l.gambar));
  assert.equal(new Set(LOMBA.map((l) => l.id)).size, LOMBA.length);
});

test('the five posters added 21 November carry the dates printed on them', () => {
  const tgl = Object.fromEntries(LOMBA.map((l) => [l.id, l.tenggatIso]));
  assert.equal(tgl['interval-2027'], '2026-11-30');
  assert.equal(tgl['epic-12'], '2026-11-22');
  assert.equal(tgl['cipta-karya-2026'], '2026-11-26');
  assert.equal(tgl['kspi-2026'], '2026-11-21');
  assert.equal(tgl['digicomp-2026'], '2026-10-30');
  assert.equal(byId('epic-12').biaya, null, 'only the BMC stage is stated free');
  assert.equal(byId('kspi-2026').kategori, 'olimpiade');
});

test('real competitions are marked real, cite their source, ship their poster, and never claim DATA DEMO', () => {
  for (const l of LOMBA_NYATA) {
    assert.equal(l.nyata, true, l.id);
    assert.match(l.sumber, /^Poster @\w/);
    assert.ok(existsSync(new URL('../../../public/prototype/' + l.gambar, import.meta.url)), l.gambar + ' missing');
    assert.doesNotMatch(l.penyelenggara, /DATA DEMO/);
  }
});

test('deadlines come from the poster date, unknown ones stay unknown', () => {
  const essay = byId('essay-unesa-2026');
  assert.equal(essay.tenggatIso, '2026-11-24');
  const harap = Math.round((Date.parse('2026-11-24T00:00:00Z') - (() => { const t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()); })()) / 864e5); /* tanggal lokal */
  assert.equal(essay.hariLagi, harap);
  assert.equal(byId('id-fest-2026').hariLagi, null);
  assert.equal(byId('area-creator-8').hariLagi, null);
});

test('facts stated on the posters are kept exactly', () => {
  assert.equal(byId('essay-unesa-2026').biaya, 25000);
  assert.equal(byId('onat-2026').biaya, 100000);
  assert.equal(byId('esdm-jurnalistik-2026').biaya, 0);
  assert.equal(byId('esdm-jurnalistik-2026').hadiah, 'Total Rp122,5 juta');
  assert.equal(byId('onat-2026').tenggatIso, '2026-11-25');
  assert.equal(byId('esdm-jurnalistik-2026').tenggatIso, '2026-12-09');
});

test('unknown fee, deadline and eligibility are shown as "check the guide", never guessed', () => {
  assert.equal(labelBiaya(null), 'Cek juknis');
  assert.equal(labelBiaya(0), 'Gratis');
  assert.equal(labelBiaya(25000), 'Rp25.000');
  assert.equal(labelSisa(null), 'Cek tgl');
  assert.equal(labelSisa(-1), 'Ditutup');
  assert.equal(labelSisa(0), 'Hari ini');
  assert.equal(labelSisa(4), 'H-4');
  assert.equal(labelTingkat([]), 'Jenjang: cek juknis');
  const r = skorCocok(byId('area-creator-8'), PROFIL);
  assert.ok(r.alasan.some((a) => /cek juknis/.test(a)), r.alasan.join(' | '));
  assert.ok(!r.alasan.includes('Gratis pendaftaran'), 'an unknown fee is not "free"');
});

test('closed competitions leave the Radar; ones without a stated deadline stay', () => {
  const tutup = { ...LOMBA_DEMO[2], id: 'tutup', hariLagi: -1 };
  const deck = buatDeck([tutup, byId('id-fest-2026'), byId('onat-2026')], PROFIL);
  assert.ok(!deck.antrean.includes('tutup'));
  assert.ok(deck.antrean.includes('id-fest-2026'));
  assert.equal(masihBuka(tutup), false);
  assert.equal(masihBuka(byId('id-fest-2026')), true);
});

test('a roadmap for a competition without a deadline says its dates are estimates', () => {
  const u = usulkanLangkah(byId('id-fest-2026'), '2026-11-20');
  assert.ok(u.langkah.length >= 3);
  assert.match(u.peringatan, /perkiraan/);
  assert.ok(u.langkah.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.tanggal)));
  assert.equal(iso(0).length, 10);
});

test('a deck saved before the real posters existed gets them on top once, and not again', async () => {
  const { sisipkanBaru } = await import('@/lib/prototype/lomba/logic/radar.js');
  const lama = buatDeck(LOMBA_DEMO, PROFIL, { slot: ['lkti-garuda'] });
  const ids = LOMBA.filter(masihBuka).map((l) => l.id);
  const r = sisipkanBaru(lama, ids, undefined);
  const nyataBuka = LOMBA_NYATA.filter(masihBuka).map((l) => l.id);
  assert.deepEqual(r.state.antrean.slice(0, nyataBuka.length), nyataBuka);
  const lagi = sisipkanBaru({ ...r.state, antrean: r.state.antrean.slice(1) }, ids, r.dilihat);
  assert.ok(!lagi.state.antrean.includes(r.state.antrean[0]), 'a card already decided on does not come back');
});
