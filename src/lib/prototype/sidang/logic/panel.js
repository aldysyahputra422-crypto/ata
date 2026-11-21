/* Read a competition guide (juknis) and pick a panel of 3 to 5 judges for Sidang Juri. Pure functions, no DOM. */
import { JURI } from '../data/juri.js';

/* whole words only: "kti" must not match "aktif" or "bukti", "orasi" must not match "kolaborasi" */
const KATA_KUNCI = [
  ['karya-tulis', /\b(karya tulis|kti|esai|essay|paper|ilmiah|pkm|makalah)\b/i],
  ['poster', /\b(poster|infografis|desain grafis|ilustrasi|fotografi)\b/i],
  ['video', /\b(video|film|vlog|dokumenter|animasi)\b/i],
  ['bisnis', /\b(bisnis|business|wirausaha|startup|business plan|kewirausahaan)\b/i],
  ['olimpiade', /\b(olimpiade|osn|olympiad|kompetisi sains|matematika|fisika|kimia)\b/i],
  ['pidato', /\b(pidato|debat|speech|orasi|story ?telling|mc)\b/i]
];
const DEFAULT_KRITERIA = [{ nama: 'Kesesuaian tema', bobot: 40 }, { nama: 'Kualitas isi', bobot: 40 }, { nama: 'Penyajian', bobot: 20 }];

export function bacaJuknis(teks) {
  const s = String(teks || '');
  const kategori = (KATA_KUNCI.find(([, re]) => re.test(s)) || ['umum'])[0];
  const kriteria = [];
  for (const m of s.matchAll(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /&-]{2,40}?)\s*(?:\(\s*(\d{1,3})\s*%\s*\)|:\s*(\d{1,3})\s*%)/g)) {
    const nama = m[1].trim().replace(/^.*\b(?:dan|serta)\s+/i, '');
    kriteria.push({ nama: nama.charAt(0).toUpperCase() + nama.slice(1), bobot: Number(m[2] || m[3]) });
  }
  const n = s.match(/(\d+)\s*(?:orang\s*)?juri/i);
  const jumlahJuri = Math.min(5, Math.max(3, n ? Number(n[1]) : 3));
  return { kategori, kriteria: kriteria.length ? kriteria : DEFAULT_KRITERIA.map((k) => ({ ...k })), jumlahJuri };
}

function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function acak(list, rnd) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const NAMA_KATEGORI = { 'karya-tulis': 'karya tulis', poster: 'poster dan desain', video: 'video', bisnis: 'bisnis', olimpiade: 'olimpiade sains', pidato: 'pidato dan debat', umum: 'umum' };

export function pilihPanel(juknis, seed) {
  const rnd = mulberry32(seed), n = juknis.jumlahJuri, kat = juknis.kategori;
  const ahli = acak(JURI.filter((j) => j.fokus.includes(kat) && !j.fokus.includes('umum')), rnd);
  const awam = acak(JURI.filter((j) => j.fokus.includes('umum')), rnd);
  const sisa = acak(JURI, rnd);
  const dipilih = [];
  const ambil = (j) => { if (j && !dipilih.includes(j) && dipilih.length < n) dipilih.push(j); };
  if (kat !== 'umum') ambil(ahli[0] || JURI.find((j) => j.fokus.includes(kat)));
  ambil(awam[0]);
  ahli.slice(1, n - 1).forEach(ambil);
  for (const j of sisa) ambil(j);

  const kriteriaUtama = juknis.kriteria.slice().sort((a, b) => b.bobot - a.bobot)[0];
  const alasan = {};
  for (const j of dipilih) {
    if (kat !== 'umum' && j.fokus.includes(kat) && !j.fokus.includes('umum')) {
      alasan[j.id] = `Juknis ini lomba ${NAMA_KATEGORI[kat]}. ${j.peran} akan menguji bagian yang bobotnya paling besar: ${kriteriaUtama.nama} (${kriteriaUtama.bobot}%).`;
    } else if (j.fokus.includes('umum')) {
      alasan[j.id] = `Juri sungguhan hampir selalu ada yang bukan ahli. ${j.nama.split(' ')[0]} menguji apakah gagasanmu bisa dipahami orang awam.`;
    } else {
      alasan[j.id] = `Sudut pandang ${j.peran.toLowerCase()} membantu menguji karyamu dari sisi yang belum terduga.`;
    }
  }
  return { juri: dipilih, alasan };
}
