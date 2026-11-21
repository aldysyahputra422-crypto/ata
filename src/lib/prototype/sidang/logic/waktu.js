/* Per-question answer timer for Sidang Juri. The hearing does not cut the student off; time running out
   is shown (and the judge reacts), and the result counts answers that went over. */
export const BATAS_DETIK = 90;
const MENIPIS = 20;   /* seconds left when the timer turns to "running low" */

const fmt = (d) => Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0');

export function statusWaktu(terpakai, batas = BATAS_DETIK) {
  const sisa = Math.max(0, Math.ceil(batas - terpakai));
  return { sisa, label: fmt(sisa), tingkat: sisa === 0 ? 'habis' : sisa <= MENIPIS ? 'menipis' : 'aman' };
}
