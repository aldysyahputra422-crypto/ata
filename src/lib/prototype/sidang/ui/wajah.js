/* Expressive judge faces for Sidang Juri: a rounded capsule with bold eyes and brows, coloured by the judge's gem,
   with an accessory that tells judges apart. Moods change brows, eyes and mouth; "marah" adds flames on top. */
export const MOOD = ['netral', 'tanya', 'serius', 'marah', 'senang'];

const GEM = {
  mint: ['#D9FBC9', '#7FD45A', '#3E8E1F'], coral: ['#FFE3D8', '#FF8C66', '#C2401C'], apricot: ['#FFE8C2', '#FFB04A', '#C26A00'],
  sky: ['#D6ECFF', '#6FB3FF', '#1F6FD1'], rose: ['#FFDCE5', '#FF8FB0', '#C2386A'], lemon: ['#FFF6BF', '#FFD84A', '#B88A00']
};
const INK = '#2A1410';
const EYE_X = [42, 78], EYE_Y = 56;

function mata(bentuk, mood) {
  if (mood === 'senang') return EYE_X.map((x) => `<path class="mata-senyum" d="M${x - 7} ${EYE_Y + 2} Q${x} ${EYE_Y - 7} ${x + 7} ${EYE_Y + 2}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`).join('');
  return EYE_X.map((x) => {
    const shape = bentuk === 'oval' ? `<ellipse cx="${x}" cy="${EYE_Y}" rx="5.5" ry="7.5"/>`
      : bentuk === 'kotak' ? `<rect x="${x - 6}" y="${EYE_Y - 6}" width="12" height="12" rx="3.5"/>`
      : bentuk === 'sipit' ? `<rect x="${x - 7.5}" y="${EYE_Y - 2.5}" width="15" height="5" rx="2.5"/>`
      : `<circle cx="${x}" cy="${EYE_Y}" r="6.5"/>`;
    return `<g class="mata" fill="${INK}">${shape}<circle cx="${x + 2}" cy="${EYE_Y - 2.5}" r="1.6" fill="#FFFFFF"/></g>`;
  }).join('');
}

function alis(mood, tebal) {
  const w = tebal ? 7 : 5;
  const pair = {
    netral: [[30, 43, 52, 43], [68, 43, 90, 43]],
    tanya: [[30, 37, 52, 35], [68, 44, 90, 44]],
    serius: [[31, 41, 52, 46], [68, 46, 89, 41]],
    marah: [[29, 38, 53, 49], [67, 49, 91, 38]],
    senang: [[31, 42, 51, 39], [69, 39, 89, 42]]
  }[mood];
  return pair.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`).join('');
}

function mulut(mood) {
  return {
    netral: `<path d="M53 72 Q60 75 67 72" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    tanya: `<ellipse cx="60" cy="73" rx="4" ry="4.5" fill="${INK}"/>`,
    serius: `<line x1="52" y1="73" x2="68" y2="73" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
    marah: `<path d="M51 76 Q60 67 69 76" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
    senang: `<path d="M48 69 Q60 82 72 69 Z" fill="${INK}"/><path d="M53 74 Q60 79 67 74" fill="#FF7FA3"/>`
  }[mood];
}

function aksesori(jenis, c, id) {
  switch (jenis) {
    case 'kacamata': return EYE_X.map((x) => `<rect x="${x - 12}" y="${EYE_Y - 11}" width="24" height="22" rx="8" fill="none" stroke="${INK}" stroke-width="3"/>`).join('') + `<path d="M54 ${EYE_Y - 3} Q60 ${EYE_Y - 7} 66 ${EYE_Y - 3}" fill="none" stroke="${INK}" stroke-width="3"/>`;
    case 'antena': return `<line x1="60" y1="24" x2="60" y2="9" stroke="${c[2]}" stroke-width="3.5" stroke-linecap="round"/><circle class="antena" cx="60" cy="7" r="5" fill="url(#${id}-rim)"/>`;
    case 'headset': return `<path d="M14 50 Q14 14 60 14 Q106 14 106 50" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><rect x="2" y="44" width="13" height="24" rx="6" fill="${INK}"/><rect x="105" y="44" width="13" height="24" rx="6" fill="${INK}"/>`;
    case 'pita': return `<g transform="translate(92 24) rotate(18)"><path d="M0 0 L-12 -8 L-12 8 Z M0 0 L12 -8 L12 8 Z" fill="${c[1]}" stroke="${c[2]}" stroke-width="2" stroke-linejoin="round"/><circle r="3.5" fill="${c[2]}"/></g>`;
    default: return '';
  }
}

function api(id) {
  return `<g class="api"><path d="M18 40 C10 26 20 18 22 6 C30 16 34 22 38 12 C44 22 48 14 50 2 C58 14 62 8 66 0 C72 12 78 10 82 2 C88 14 92 20 98 10 C102 22 112 26 102 40 Z" fill="url(#${id}-api)"/>`
    + `<path d="M30 40 C26 30 34 24 36 16 C42 26 46 22 50 14 C56 24 62 20 66 12 C70 22 76 24 80 16 C84 26 92 30 88 40 Z" fill="#FFD84A"/></g>`;
}

/* resting expression from the judge's personality */
export function moodDasar(juri) {
  const k = juri.kepribadian.toLowerCase();
  if (/kritis|tegas|skeptis|dingin|tajam|menuntut|provokatif/.test(k)) return 'serius';
  if (/hangat|ramah|jenaka|akrab|bersemangat|antusias|energik/.test(k)) return 'senang';
  return 'netral';
}

let seq = 0;
/* face with a fresh gradient id, for screens that render many faces */
export const wajah = (juri, mood) => wajahSvg(juri, mood || moodDasar(juri), 'w' + (++seq));

export function wajahSvg(juri, mood, id) {
  if (!MOOD.includes(mood)) mood = 'netral';
  const c = GEM[juri.warna] || GEM.coral, w = juri.wajah || { mata: 'bulat', aksesori: 'polos' };
  return `<svg viewBox="0 0 120 92" class="wajah wajah--${mood}" role="img" aria-label="${juri.nama.replace(/"/g, '')}" xmlns="http://www.w3.org/2000/svg">`
    + `<defs><linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`
    + `<linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="${c[0]}"/></linearGradient>`
    + `<linearGradient id="${id}-api" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#E8361C"/><stop offset=".6" stop-color="#FF7A1A"/><stop offset="1" stop-color="#FFB02E"/></linearGradient></defs>`
    + (mood === 'marah' ? api(id) : '')
    + (w.aksesori === 'antena' || w.aksesori === 'headset' ? aksesori(w.aksesori, c, id) : '')
    + `<rect x="7" y="25" width="106" height="62" rx="31" fill="url(#${id}-face)" stroke="url(#${id}-rim)" stroke-width="7"/>`
    + `<rect x="18" y="31" width="58" height="9" rx="4.5" fill="#FFFFFF" opacity=".7"/>`
    + (mood === 'senang' ? `<ellipse cx="30" cy="68" rx="7" ry="4" fill="#FF8FB0" opacity=".55"/><ellipse cx="90" cy="68" rx="7" ry="4" fill="#FF8FB0" opacity=".55"/>` : '')
    + mata(w.mata, mood) + alis(mood, w.aksesori === 'alis-tebal') + mulut(mood)
    + (w.aksesori === 'kacamata' || w.aksesori === 'pita' ? aksesori(w.aksesori, c, id) : '')
    + `</svg>`;
}
