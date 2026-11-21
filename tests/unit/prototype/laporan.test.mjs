// @vitest-environment node
// Dipindah dari prototipe tests/laporan.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { AKTIVITAS, LOMBA, CATATAN_MENTOR, RENCANA } from '@/lib/prototype/portofolio/data/laporan.js';
import {
  bangunLaporan,
  validasiPesan,
  kodeVerifikasi,
  namaBerkas,
  bulanLabel,
  statusKata,
  BATAS_PESAN,
} from '@/lib/prototype/portofolio/logic/laporan.js';

const profil = { nama: 'Raka', jenjang: 'SMA kelas 11', sekolah: 'SMAN 3 Bandung' };

const dasar = {
  profil,
  periode: '2026-11',
  aktivitas: AKTIVITAS,
  lomba: LOMBA,
  catatan: CATATAN_MENTOR,
  rencana: RENCANA,
  pesan: 'Bulan ini aku fokus menulis KTI.',
};

test('laporan memuat periode, nama, dan ringkasan angka', () => {
  const l = bangunLaporan(dasar);
  assert.equal(l.periodeLabel, 'November 2026');
  assert.equal(l.nama, 'Raka');
  assert.equal(l.ringkasan.hariAktif, 12);
  assert.equal(l.ringkasan.jamFokus, 10.5);
  assert.equal(l.ringkasan.tugasSelesai, 10);
  assert.equal(l.ringkasan.totalTugas, 12);
  assert.match(l.ringkasan.kalimat, /12 hari aktif/);
});

test('laporan hanya memakai aktivitas pada periode yang dipilih', () => {
  const l = bangunLaporan({ ...dasar, periode: '2026-10' });
  assert.equal(l.aktivitas.length, 0);
  assert.match(l.ringkasan.kalimat, /lebih tenang/i);
  assert.equal(l.ringkasan.hariAktif, 0);
});

test('bagian yang dimatikan hilang dari data laporan', () => {
  const l = bangunLaporan({ ...dasar, bagian: ['aktivitas'] });
  assert.deepEqual(l.bagian, ['aktivitas']);
  assert.ok(l.aktivitas.length > 0);
  assert.deepEqual(l.lomba, []);
  assert.equal(l.catatan, null);
  assert.deepEqual(l.rencana, []);
});

test('laporan tidak pernah memuat chat, Ingatan, atau API key', () => {
  const l = bangunLaporan({
    ...dasar,
    ingatan: [{ teks: 'Punya laptop pinjaman' }],
    chat: [{ teks: 'Aku mentok banget' }],
    apiKey: 'sk-rahasia',
    catatanPribadi: 'jangan dibagikan',
  });
  const teks = JSON.stringify(l);
  assert.ok(!/ingatan/i.test(teks), 'kata ingatan bocor');
  assert.ok(!/apiKey|sk-rahasia/i.test(teks), 'api key bocor');
  assert.ok(!teks.includes('Aku mentok banget'), 'isi chat bocor');
  assert.ok(!teks.includes('jangan dibagikan'), 'catatan pribadi bocor');
});

test('pesan pribadi dibatasi 280 karakter', () => {
  assert.equal(validasiPesan('a'.repeat(BATAS_PESAN)).ok, true);
  const lewat = validasiPesan('a'.repeat(BATAS_PESAN + 1));
  assert.equal(lewat.ok, false);
  assert.match(lewat.galat, /280/);
  assert.equal(validasiPesan('halo').sisa, BATAS_PESAN - 4);
});

test('pesan yang tersimpan juga dipotong di batas', () => {
  const l = bangunLaporan({ ...dasar, pesan: 'x'.repeat(400) });
  assert.equal(l.pesan.length, BATAS_PESAN);
});

test('kode verifikasi dan nama berkas deterministik', () => {
  const a = kodeVerifikasi('2026-11', 'Raka');
  const b = kodeVerifikasi('2026-11', 'Raka');
  assert.equal(a, b);
  assert.match(a, /^ATA-2026-11-[0-9A-F]{4}$/);
  assert.notEqual(a, kodeVerifikasi('2026-10', 'Raka'));
  assert.equal(namaBerkas('Raka', '2026-11'), 'Laporan-Ata_Raka_2026-11.pdf');
  assert.equal(namaBerkas('Raka P.', '2026-11'), 'Laporan-Ata_RakaP_2026-11.pdf');
});

test('status memakai kata, bukan hanya warna', () => {
  assert.equal(statusKata(90), 'Sesuai rencana');
  assert.equal(statusKata(60), 'Cukup sesuai');
  assert.equal(statusKata(30), 'Perlu perhatian');
});

test('label bulan Indonesia dan kasus periode aneh', () => {
  assert.equal(bulanLabel('2026-09'), 'September 2026');
  assert.equal(bulanLabel('2026-13'), '2026-13');
  assert.equal(bulanLabel(''), '');
});

test('tanpa lomba aktif, bagian lomba menjadi daftar kosong (bukan error)', () => {
  const l = bangunLaporan({ ...dasar, lomba: [] });
  assert.deepEqual(l.lomba, []);
});
