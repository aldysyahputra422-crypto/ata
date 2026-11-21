// @vitest-environment node
// Dipindah dari prototipe tests/saran.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { saranBerikut, selisih } from '@/lib/prototype/app/logic/saran.js';

const HARI = '2026-11-20';
const tugas = (id, tenggat, selesai = false) => ({ id, judul: `Tugas ${id}`, tenggat, selesai, slot: 's', slotNama: 'LKTI' });
const slot = (id, hariLagi, disetujui = true) => ({ id, nama: `Lomba ${id}`, hariLagi, disetujui });

test('days between ISO dates', () => {
  assert.equal(selisih('2026-11-22', HARI), 2);
  assert.equal(selisih('2026-11-18', HARI), -2);
});

test('an overdue task outranks everything and says how late it is', () => {
  const s = saranBerikut({ hariIni: HARI, slot: [slot('a', 3, false)], tugas: [tugas('1', '2026-11-19'), tugas('2', '2026-11-21')] });
  assert.equal(s[0].jenis, 'telat');
  assert.match(s[0].alasan, /Lewat tenggat 1 hari/);
  assert.deepEqual(s[0].aksi, { tab: 'progres' });
  assert.ok(s.some((x) => x.jenis === 'peta'), 'an unapproved roadmap with a close deadline is suggested');
});

test('finished tasks, far tasks and approved maps produce no noise', () => {
  const s = saranBerikut({ hariIni: HARI, slot: [slot('a', 30)], tugas: [tugas('1', '2026-11-19', true), tugas('2', '2026-12-20')] });
  assert.deepEqual(s, []);
});

test('no Slot at all suggests starting from the Radar', () => {
  const s = saranBerikut({ hariIni: HARI, slot: [], tugas: [] });
  assert.equal(s[0].id, 'slot-kosong');
  assert.equal(s[0].aksi.rute, 'radar');
});

test('real competitions closing within a week are suggested only when a Slot is free', () => {
  const nyata = [{ id: 'onat', nama: 'ONAT', hariLagi: 5 }, { id: 'jauh', nama: 'Jauh', hariLagi: 19 }, { id: 'tanpa', nama: 'Tanpa', hariLagi: null }];
  const ada = saranBerikut({ hariIni: HARI, slot: [slot('a', 30)], tugas: [], lombaNyata: nyata, batas: 3 });
  assert.deepEqual(ada.map((x) => x.id), ['nyata:onat']);
  const penuh = saranBerikut({ hariIni: HARI, slot: [slot('a', 30), slot('b', 30), slot('c', 30)], tugas: [], lombaNyata: nyata, batas: 3 });
  assert.deepEqual(penuh, []);
});

test('at most three suggestions, most urgent first', () => {
  const t = ['2026-11-10', '2026-11-12', '2026-11-15', '2026-11-19', '2026-11-21'].map((d, i) => tugas(String(i), d));
  const s = saranBerikut({ hariIni: HARI, slot: [slot('a', 2, false)], tugas: t });
  assert.equal(s.length, 3);
  assert.ok(s.every((x, i, a) => i === 0 || a[i - 1].bobot >= x.bobot));
  assert.match(s[0].alasan, /10 hari/);
});
