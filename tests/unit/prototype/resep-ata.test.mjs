// @vitest-environment node
// Dipindah dari prototipe tests/resep-ata.test.mjs (R0.05-1). Kasus uji tidak diubah; hanya import & path.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PUSTAKA } from '@/lib/prototype/tanya/data/resep.js';
import { resepUntuk, duplikat, keMarkdown } from '@/lib/prototype/tanya/logic/resep.js';

test('pustaka berisi minimal 8 Resep dan tiap Resep punya 3 sampai 4 langkah', () => {
  assert.ok(PUSTAKA.length >= 8, `hanya ${PUSTAKA.length} Resep`);
  for (const r of PUSTAKA) {
    assert.ok(r.langkah.length >= 3 && r.langkah.length <= 4, `${r.id}: ${r.langkah.length} langkah`);
    for (const l of r.langkah) {
      assert.ok(l.prompt.includes('{{'), `${r.id}/${l.id} tanpa variabel templat`);
      assert.ok(l.cek.length >= 2, `${r.id}/${l.id} tanpa cek kualitas`);
      assert.ok(l.ai.nama && l.ai.alasan, `${r.id}/${l.id} tanpa saran AI`);
    }
  }
});

test('resepUntuk memilih Resep yang cocok dengan jenis lomba', () => {
  assert.equal(resepUntuk('kti').id, 'kti');
  assert.equal(resepUntuk('business_plan').id, 'business-plan');
  assert.equal(resepUntuk('video').id, 'video-pendek');
});

test('resepUntuk jatuh ke Resep "semua" untuk jenis tak dikenal, deterministik', () => {
  const a = resepUntuk('debat');
  const b = resepUntuk('debat');
  assert.equal(a.id, 'pitch-juri');
  assert.equal(a.id, b.id);
  assert.equal(resepUntuk(undefined).id, 'pitch-juri');
});

test('duplikat menyalin dalam (langkah tidak dibagi) tanpa mengubah aslinya', () => {
  const asli = PUSTAKA.find((r) => r.id === 'kti');
  const salinan = duplikat(asli, { id: 'racikan-1', nama: 'KTI versiku' });

  assert.equal(salinan.nama, 'KTI versiku');
  assert.equal(salinan.id, 'racikan-1');
  assert.notEqual(salinan.langkah, asli.langkah);
  salinan.langkah[0].judul = 'Judul baru';
  assert.notEqual(asli.langkah[0].judul, 'Judul baru');
  assert.equal(salinan.langkah[0].id, asli.langkah[0].id, 'id langkah dipertahankan agar {{langkah[sX]}} tetap jalan');
});

test('keMarkdown memuat langkah, prompt, cek kualitas, dan tidak ada undefined', () => {
  const racikan = duplikat(PUSTAKA.find((r) => r.id === 'business-plan'), {
    id: 'racikan-2',
    nama: 'Racikan Keuangan',
  });
  const md = keMarkdown(racikan, { tanggal: '17 November 2026', lomba: 'LKTI Garuda Muda 2027' });
  assert.ok(md.startsWith('# Racikan Keuangan'), md.slice(0, 40));
  assert.ok(md.includes('## Langkah 1'));
  assert.ok(md.includes('**Tujuan:**'));
  assert.ok(md.includes('```text'));
  assert.ok(md.includes('Cek kualitas'));
  assert.ok(md.includes('LKTI Garuda Muda 2027'));
  assert.ok(!md.includes('undefined'), 'ada undefined di markdown');
});

test('duplikat memberi nama bawaan bila nama tidak diberikan', () => {
  const asli = PUSTAKA[0];
  const salinan = duplikat(asli);
  assert.ok(salinan.nama.startsWith(asli.nama));
  assert.notEqual(salinan.id, asli.id);
});
