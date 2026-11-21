/* Pemilihan Resep dan Racikan. Semua fungsi murni (tanpa DOM, tanpa jaringan). */

import { PUSTAKA } from '../data/resep.js';

export function resepUntuk(jenis, pustaka = PUSTAKA) {
  const cocok = pustaka.filter((r) => Array.isArray(r.jenis) && r.jenis.includes(jenis));
  if (cocok.length) return cocok[0];
  return pustaka.find((r) => r.jenis.includes('semua')) || null;
}

function salinDalam(nilai) {
  if (typeof structuredClone === 'function') return structuredClone(nilai);
  return JSON.parse(JSON.stringify(nilai));
}

export function duplikat(resep, { id, nama } = {}) {
  const salinan = salinDalam(resep);
  salinan.id = id || `${resep.id}-salinan`;
  salinan.nama = nama || `${resep.nama} (salinan)`;
  salinan.racikan = true;
  return salinan;
}

/**
 * ekspor Markdown: prompt sudah terisi (hasil isiTemplat) atau templat mentah.
 * @param {object} racikan
 * @param {{tanggal?: string, lomba?: string, promptPerLangkah?: Record<string,string>}} meta
 */
export function keMarkdown(racikan, meta = {}) {
  const baris = [];
  baris.push(`# ${racikan.nama}`, '');
  const catatan = ['Data demo'];
  if (meta.tanggal) catatan.push(`dibuat ${meta.tanggal}`);
  baris.push(`_${catatan.join(' · ')}_`, '');
  if (meta.lomba) baris.push(`**Untuk lomba:** ${meta.lomba}`);
  if (typeof racikan.menit === 'number') baris.push(`**Perkiraan total:** ${racikan.menit} menit`);
  baris.push('');

  racikan.langkah.forEach((l, i) => {
    baris.push(`## Langkah ${i + 1} — ${l.judul}`, '');
    baris.push(`**Tujuan:** ${l.tujuan}`, '');
    baris.push(`**AI disarankan:** ${l.ai.nama} — ${l.ai.alasan}`, '');
    baris.push(`**Perkiraan:** ${l.menit} menit`, '');
    baris.push('### Prompt', '', '```text');
    baris.push(meta.promptPerLangkah?.[l.id] || l.prompt);
    baris.push('```', '');
    baris.push(`**Keluaran:** ${l.keluaran}`, '');
    if (l.cek?.length) {
      baris.push('**Cek kualitas:**');
      for (const c of l.cek) baris.push(`- ${c}`);
      baris.push('');
    }
    if (l.tips) baris.push(`**Tips teknis:** ${l.tips}`, '');
  });

  return `${baris.join('\n').trim()}\n`;
}
