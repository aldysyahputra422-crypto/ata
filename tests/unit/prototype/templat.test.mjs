// @vitest-environment node
// Dipindah dari prototipe tests/templat.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { isiTemplat, bacaKonteks } from '@/lib/prototype/tanya/logic/templat.js';

const konteks = {
  profil: { nama: 'Raka', jenjang: 'SMA kelas 11', minat: 'lingkungan dan data' },
  lomba: { judul: 'LKTI Garuda Muda 2027', biaya: 'gratis' },
  langkah: { s1: { hasil: 'Topik: pemilahan sampah kantin' } },
};

test('mengisi variabel profil dan lomba', () => {
  const { teks, kosong } = isiTemplat(
    'Aku {{profil.nama}}, {{ profil.jenjang }}. Lomba {{lomba.judul}}, biaya {{lomba.biaya}}.',
    konteks
  );
  assert.equal(teks, 'Aku Raka, SMA kelas 11. Lomba LKTI Garuda Muda 2027, biaya gratis.');
  assert.deepEqual(kosong, []);
});

test('membaca jalur bertitik dan berkurung', () => {
  assert.equal(bacaKonteks(konteks, 'profil.minat'), 'lingkungan dan data');
  assert.equal(bacaKonteks(konteks, 'langkah[s1].hasil'), 'Topik: pemilahan sampah kantin');
  assert.equal(bacaKonteks(konteks, 'profil.tidakAda'), undefined);
});

test('variabel tak dikenal jadi kolom isian, bukan {{…}} mentah', () => {
  const { teks, kosong } = isiTemplat('Target: {{lomba.juara}}. Hadiah {{lomba.hadiah}}.', konteks);
  assert.ok(!teks.includes('{{'), 'tidak boleh ada kurung kurawal mentah');
  assert.ok(teks.includes('[isi: juara]'), teks);
  assert.ok(teks.includes('[isi: hadiah]'), teks);
  assert.deepEqual(kosong, ['lomba.juara', 'lomba.hadiah']);
});

test('hasil langkah sebelumnya kosong jadi kolom isian', () => {
  const { teks, kosong } = isiTemplat('Pakai ide ini: {{langkah[s2].hasil}}', konteks);
  assert.ok(!teks.includes('{{'));
  assert.ok(teks.includes('[isi: hasil langkah s2]'), teks);
  assert.deepEqual(kosong, ['langkah[s2].hasil']);
});

test('bidang yang dimatikan tidak muncul, termasuk di langkah berikutnya', () => {
  const mati = ['profil.jenjang', 'profil.minat'];
  const prompt1 = 'Aku {{profil.nama}} dari {{profil.jenjang}}, minat {{profil.minat}}.';
  const prompt2 = 'Jenjangku {{profil.jenjang}}. Ide: {{langkah[s1].hasil}}.';
  const a = isiTemplat(prompt1, konteks, { mati });
  const b = isiTemplat(prompt2, konteks, { mati });
  for (const hasil of [a, b]) {
    assert.ok(!hasil.teks.includes('SMA kelas 11'), hasil.teks);
    assert.ok(!hasil.teks.includes('lingkungan dan data'), hasil.teks);
    assert.ok(!hasil.teks.includes('{{'), hasil.teks);
  }
  assert.deepEqual(a.dilewati, ['profil.jenjang', 'profil.minat']);
  assert.deepEqual(a.kosong, [], 'bidang yang sengaja dimatikan bukan kolom isian');
});

test('tidak mengevalusi isi pengguna (tanpa eval)', () => {
  const { teks } = isiTemplat('Judul: ${alert(1)} dan `rm -rf`', konteks);
  assert.equal(teks, 'Judul: ${alert(1)} dan `rm -rf`');
});

test('rapikan spasi sisa setelah bidang dimatikan', () => {
  const { teks } = isiTemplat('Jenjang {{profil.jenjang}} , minat {{profil.minat}} .', konteks, {
    mati: ['profil.jenjang', 'profil.minat'],
  });
  assert.equal(teks, 'Jenjang, minat.');
});

test('tanda baca ganda dirapikan setelah bidang dimatikan', () => {
  const { teks } = isiTemplat('Aku {{profil.nama}}, {{profil.jenjang}}, menulis KTI.', konteks, {
    mati: ['profil.jenjang'],
  });
  assert.equal(teks, 'Aku Raka, menulis KTI.');
});

test('templat rusak tidak lolos mentah dan objek tidak jadi [object Object]', () => {
  const a = isiTemplat('Nilai {{}} dan {{   }} di sini', konteks);
  assert.ok(!a.teks.includes('{{'), a.teks);
  const b = isiTemplat('Objek: {{profil}}', konteks);
  assert.ok(!b.teks.includes('[object Object]'), b.teks);
  assert.ok(b.kosong.includes('profil'));
});
