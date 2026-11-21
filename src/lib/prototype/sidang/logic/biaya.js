/* Session cost estimate for Sidang Juri, shown before any session that uses the student's own key. */
const PER_TANYA_MIN = 900, PER_TANYA_MAX = 1400, RINGKASAN_PER_JURI = 1500;

/* rounded up to the nearest Rp100, Indonesian thousand dots */
const rupiah = (n) => 'Rp' + (Math.ceil(n / 100) * 100).toLocaleString('id-ID');

export function perkiraanSesi({ jumlahJuri, pertanyaanPerJuri, penyedia }) {
  const tokenMin = jumlahJuri * pertanyaanPerJuri * PER_TANYA_MIN + jumlahJuri * RINGKASAN_PER_JURI;
  const tokenMax = jumlahJuri * pertanyaanPerJuri * PER_TANYA_MAX + jumlahJuri * RINGKASAN_PER_JURI;
  const rupiahMin = Math.round((tokenMin / 1000) * penyedia.hargaPer1kToken);
  const rupiahMax = Math.round((tokenMax / 1000) * penyedia.hargaPer1kToken);
  return { tokenMin, tokenMax, rupiahMin, rupiahMax, label: '≈ ' + rupiah(rupiahMin) + '–' + rupiah(rupiahMax) };
}
