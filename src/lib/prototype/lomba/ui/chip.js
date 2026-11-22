/* Chip kategori bulat: ikon dalam lingkaran pastel + label (pola filter dari referensi travel app, palet tetap Senja). */
import { esc } from '../state.js';

export const GAYA_KATEGORI = {
  semua: { ikon: 'sparkle', gem: 'semua' },
  'karya-tulis': { ikon: 'pen', gem: 'coral' },
  poster: { ikon: 'image', gem: 'apricot' },
  video: { ikon: 'film', gem: 'rose' },
  bisnis: { ikon: 'briefcase', gem: 'mint' },
  olimpiade: { ikon: 'trophy', gem: 'sky' },
  pidato: { ikon: 'mic', gem: 'lemon' }
};

/* attr: nama atribut data untuk nilai (mis. 'f' → data-f="…"), gem/ikon bisa ditimpa (Peta Jalan memakai gem lomba) */
export function chipHtml({ nilai, label, aktif, attr = 'f', gem, ikon }) {
  const g = GAYA_KATEGORI[nilai] || {};
  const kelasGem = (gem || g.gem) === 'semua' ? 'chip-bulat--semua' : `g-${gem || g.gem || 'sky'}`;
  return `<button type="button" class="chip-bulat ${kelasGem}" data-${attr}="${esc(nilai)}" aria-pressed="${aktif}">`
    + `<span class="chip-bulat__ikon" data-icon="${ikon || g.ikon || 'star'}" aria-hidden="true"></span><span class="chip-bulat__label">${esc(label)}</span></button>`;
}
