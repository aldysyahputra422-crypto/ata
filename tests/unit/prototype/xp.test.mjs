// @vitest-environment node
// Dipindah dari prototipe tests/xp.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { hitungXP, prioritasTugas, XP } from '@/lib/prototype/shared/logic/xp.js';
import { awalBersama, rapikanBersama, aturStatusTugas, centangTugas, daftarTugas } from '@/lib/prototype/shared/logic/bersama.js';

const H = '2026-11-21';
const L = (tanggal, selesaiPada = '', selesai = !!selesaiPada) => ({ tanggal, selesaiPada, selesai });

test('XP comes only from finished steps: on time 10, late 5, full map +20; nothing finished means 0', () => {
  assert.equal(hitungXP({}, H).xp, 0);
  assert.equal(hitungXP({ a: { langkah: [L('2026-11-25')] } }, H).xp, 0, 'an open step earns nothing');
  const r = hitungXP({ a: { langkah: [L('2026-11-20', '2026-11-21'), L('2026-11-25', '2026-11-20')] } }, H);
  assert.equal(r.xp, XP.TERLAMBAT + XP.TEPAT_WAKTU + XP.PETA_TUNTAS);
  assert.equal(r.tepat, 1);
  assert.equal(r.tuntas, 1);
});

test('level and progress follow the 100 XP rule', () => {
  const langkah = Array.from({ length: 11 }, (_, i) => L('2026-12-01', `2026-11-${String(10 + i).padStart(2, '0')}`));
  const r = hitungXP({ a: { langkah } }, H);
  assert.equal(r.xp, 11 * 10 + 20);
  assert.equal(r.level, 2);
  assert.equal(r.xpLevel, 30);
  assert.equal(r.keLevelBerikut, 70);
});

test('the streak counts consecutive real completion days ending today or yesterday; old undated steps never count', () => {
  const peta = (hari) => ({ a: { langkah: [...hari.map((d) => L('2026-12-01', d)), L('2026-12-01'), { tanggal: '2026-12-01', selesai: true, selesaiPada: '' }] } });
  assert.equal(hitungXP(peta(['2026-11-21', '2026-11-20', '2026-11-19']), H).streak, 3);
  assert.equal(hitungXP(peta(['2026-11-20', '2026-11-19']), H).streak, 2, 'nothing yet today does not break it');
  assert.equal(hitungXP(peta(['2026-11-19', '2026-11-18']), H).streak, 0, 'a missed day breaks it');
  assert.equal(hitungXP(peta([]), H).streak, 0, 'an undated old completion earns XP but no streak');
  assert.equal(hitungXP(peta([]), H).xp, 10);
});

test('achievements are earned from the data, not handed out', () => {
  const r = hitungXP({ a: { langkah: [L('2026-12-01', H), L('2026-12-01')] } }, H);
  const dapat = Object.fromEntries(r.pencapaian.map((p) => [p.id, p.dapat]));
  assert.deepEqual(dapat, { pertama: true, lima: false, tepat: false, tuntas: false, streak3: false });
});

test('priority rule: overdue or due within 2 days is high, within 7 medium, otherwise low', () => {
  assert.equal(prioritasTugas({ tenggat: '2026-11-20' }, H).tingkat, 'tinggi');
  assert.equal(prioritasTugas({ tenggat: '2026-11-23' }, H).tingkat, 'tinggi');
  assert.equal(prioritasTugas({ tenggat: '2026-11-27' }, H).tingkat, 'sedang');
  assert.equal(prioritasTugas({ tenggat: '2026-12-10' }, H).tingkat, 'rendah');
  assert.equal(prioritasTugas({ tenggat: '2026-11-20', selesai: true }, H).tingkat, 'rendah');
});

const toko = () => {
  const b = rapikanBersama({ ...awalBersama(), slot: ['a'], peta: { a: { disetujui: true, langkah: [{ id: 'l0', nama: 'Riset', tanggal: '2026-11-22' }, { id: 'l1', nama: 'Tulis', tanggal: '2026-11-25' }] } } }, () => true);
  return b;
};

test('task status moves belum → dikerjakan → selesai, records the real completion date, and clears it when undone', () => {
  let r = aturStatusTugas(toko(), 'a/l0', 'dikerjakan', H);
  assert.equal(r.b.peta.a.langkah[0].status, 'dikerjakan');
  assert.equal(r.b.peta.a.langkah[0].selesai, false);
  r = aturStatusTugas(r.b, 'a/l0', 'selesai', H);
  assert.equal(r.baruSelesai, true);
  assert.equal(r.b.peta.a.langkah[0].selesaiPada, H);
  const lagi = aturStatusTugas(r.b, 'a/l0', 'selesai', '2026-11-30');
  assert.equal(lagi.b.peta.a.langkah[0].selesaiPada, H, 'finishing again keeps the first date');
  assert.equal(lagi.baruSelesai, false);
  r = aturStatusTugas(r.b, 'a/l0', 'belum', H);
  assert.equal(r.b.peta.a.langkah[0].selesaiPada, '');
  assert.equal(daftarTugas(r.b, () => ({ nama: 'A' }))[0].status, 'belum');
});

test('status changes are refused for unknown statuses, unknown tasks and unapproved maps; old toggle still works', () => {
  assert.equal(aturStatusTugas(toko(), 'a/l0', 'hampir', H).ditolak, 'status-tidak-dikenal');
  assert.equal(aturStatusTugas(toko(), 'a/zz', 'selesai', H).ditolak, 'tidak-ada');
  const b = toko(); b.peta.a.disetujui = false;
  assert.equal(aturStatusTugas(b, 'a/l0', 'selesai', H).ditolak, 'belum-disetujui');
  const c = centangTugas(toko(), 'a/l1', H);
  assert.equal(c.selesai, true);
  assert.equal(c.b.peta.a.langkah[1].selesaiPada, H);
  assert.equal(centangTugas(c.b, 'a/l1', H).selesai, false);
});

test('stored data survives tidying: status and completion date are kept, broken dates dropped', () => {
  const b = rapikanBersama({ ...awalBersama(), slot: ['a'], peta: { a: { disetujui: true, langkah: [
    { id: 'l0', nama: 'X', tanggal: '2026-11-22', status: 'dikerjakan' },
    { id: 'l1', nama: 'Y', tanggal: '2026-11-22', selesai: true, selesaiPada: 'kemarin' }] } } }, () => true);
  assert.equal(b.peta.a.langkah[0].status, 'dikerjakan');
  assert.equal(b.peta.a.langkah[1].status, 'selesai');
  assert.equal(b.peta.a.langkah[1].selesaiPada, '', 'an invalid date is not trusted');
});
