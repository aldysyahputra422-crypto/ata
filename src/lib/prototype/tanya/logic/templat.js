/* Mesin templat sederhana: hanya substitusi, tanpa eval.
   {{profil.jenjang}} · {{lomba.judul}} · {{langkah[s1].hasil}} */

const VARIABEL = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function bacaKonteks(konteks, jalur) {
  const bagian = String(jalur)
    .replace(/\[([^\]]+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let nilai = konteks;
  for (const b of bagian) {
    if (nilai === null || nilai === undefined) return undefined;
    nilai = nilai[b];
  }
  return nilai;
}

export function labelKolom(jalur) {
  return String(jalur)
    .replace(/^profil\./, '')
    .replace(/^lomba\./, '')
    .replace(/^langkah\[([^\]]+)\]\.hasil$/, 'hasil langkah $1')
    .replace(/_/g, ' ');
}

function rapikan(teks) {
  return teks
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([,;:])\s*([,;:])/g, '$1')
    .replace(/([,;:])\s+([.!?])/g, '$2')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * @param {string} teks templat
 * @param {object} konteks { profil, lomba, langkah }
 * @param {{mati?: string[]}} opsi bidang privasi yang dimatikan
 * @returns {{teks: string, kosong: string[], dilewati: string[]}}
 */
export function isiTemplat(teks, konteks = {}, { mati = [] } = {}) {
  const kosong = [];
  const dilewati = [];
  const hasil = String(teks ?? '').replace(VARIABEL, (_utuh, jalur) => {
    if (mati.includes(jalur)) {
      dilewati.push(jalur);
      return '';
    }
    const nilai = bacaKonteks(konteks, jalur);
    const primitif = nilai === null || ['string', 'number', 'boolean'].includes(typeof nilai);
    if (!primitif || String(nilai).trim() === '') {
      if (!kosong.includes(jalur)) kosong.push(jalur);
      return `[isi: ${labelKolom(jalur)}]`;
    }
    return String(nilai);
  });
  /* templat rusak (mis. "{{}}" atau "{{   }}") tidak boleh lolos mentah ke prompt */
  const bersih = hasil.replace(/\{\{[^{}]*\}\}/g, '[isi: kolom]');
  return { teks: rapikan(bersih), kosong, dilewati };
}
