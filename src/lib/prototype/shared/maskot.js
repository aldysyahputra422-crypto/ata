/* Maskot Red Panda: komponen vanilla (pengganti <Mascot> React dari page-mascot, tanpa dependency).
   - kepala menoleh mengikuti kursor (satu background-position, tanpa library animasi)
   - reaksi saat diklik (bergantian + squash), saat di-hover (tersipu), dan lewat maskot.reaksi('tugas-selesai')
   - berkedip acak saat diam, tertidur setelah 25 dtk tanpa gerakan
   - tracking hanya untuk penunjuk halus (mouse/trackpad); squash & kedip mati pada prefers-reduced-motion
   Kursor di dalam iframe diteruskan halaman embed (shared/embed.js) lewat arahkanKe(x, y) di shell. */
import { selArah, posisiSel, reaksiUntuk, REAKSI, TENGAH, LAMA } from './logic/maskot.js';

const SHEET_ARAH = '/prototype/mascots/redpanda-directions.webp';
const SHEET_REAKSI = '/prototype/mascots/redpanda-reactions.webp';
const semua = new Set();
const kurangiGerak = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const penunjukHalus = () => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

let raf = 0, kursor = null, diamTimer = 0;
const DIAM_MS = 25000;

/* posisi kursor dalam koordinat jendela shell; dipanggil dari pointermove sendiri atau pesan iframe */
export function arahkanKe(x, y) {
  kursor = { x, y };
  semua.forEach((m) => m.bangun());
  clearTimeout(diamTimer);
  diamTimer = setTimeout(() => semua.forEach((m) => m.tidur()), DIAM_MS);
  if (raf) return;
  /* rAF, dengan cadangan setTimeout bila frame ditahan (tab latar) — mana yang lebih dulu, sekali saja */
  let idRaf = 0, idWaktu = 0;
  const jalan = () => { if (!raf) return; raf = 0; cancelAnimationFrame(idRaf); clearTimeout(idWaktu); semua.forEach((m) => m.tatap()); };
  raf = 1;
  idRaf = requestAnimationFrame(jalan);
  idWaktu = setTimeout(jalan, 64);
}

let terpasangGlobal = false;
function pasangGlobal() {
  if (terpasangGlobal || typeof window === 'undefined') return;
  terpasangGlobal = true;
  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') arahkanKe(e.clientX, e.clientY); }, { passive: true });
  /* reaksi dari mana saja di dokumen ini: window.dispatchEvent(new CustomEvent('ata:maskot', { detail: 'tugas-selesai' })) */
  window.addEventListener('ata:maskot', (e) => reaksiSemua(e.detail));
  diamTimer = setTimeout(() => semua.forEach((m) => m.tidur()), DIAM_MS);
}

/* maskot yang sedang terlihat bereaksi; mengembalikan jumlahnya (0 = tidak ada yang terlihat) */
export function reaksiSemua(peristiwa) {
  let n = 0;
  semua.forEach((m) => { if (m.terlihat()) { m.reaksi(peristiwa); n += 1; } });
  return n;
}

export function buatMaskot({ ukuran = 64, label = 'Ata si panda merah. Klik untuk menyapa.', kelas = '' } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `maskot ${kelas}`.trim();
  el.style.setProperty('--ukuran', `${ukuran}px`);
  el.setAttribute('aria-label', label);
  el.innerHTML = `<span class="maskot__lapis maskot__arah" style="background-image:url('${SHEET_ARAH}')"></span>
    <span class="maskot__lapis maskot__reaksi" style="background-image:url('${SHEET_REAKSI}')" hidden></span>`;
  const arah = el.querySelector('.maskot__arah'), reaksiEl = el.querySelector('.maskot__reaksi');
  let sel = -1, timerReaksi = 0, kedipTimer = 0, klik = 0, tugas = 0, sibuk = false, tertidur = false;

  const tampilArah = (i) => { if (i === sel) return; sel = i; arah.style.backgroundPosition = posisiSel(i); };
  const tampilReaksi = (i, ms) => {
    clearTimeout(timerReaksi);
    reaksiEl.style.backgroundPosition = posisiSel(i);
    reaksiEl.hidden = false; arah.hidden = true; sibuk = true;
    if (ms) timerReaksi = setTimeout(selesaiReaksi, ms);
  };
  const selesaiReaksi = () => { reaksiEl.hidden = true; arah.hidden = false; sibuk = false; tertidur = false; };
  const squash = () => {
    if (kurangiGerak() || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.10,.86)', offset: .25 }, { transform: 'scale(.95,1.08)', offset: .6 }, { transform: 'scale(1.03,.97)', offset: .82 }, { transform: 'scale(1,1)' }],
      { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
  };
  const jadwalKedip = () => {
    clearTimeout(kedipTimer);
    if (kurangiGerak()) return;
    kedipTimer = setTimeout(() => {
      if (!el.isConnected) return;
      if (!sibuk) tampilReaksi(REAKSI.kedip, LAMA.kedip);
      jadwalKedip();
    }, 3500 + Math.random() * 3500);
  };

  const m = {
    el,
    terlihat: () => el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden], .maskot-intip:not(.is-tampil)'),
    tatap() {
      if (sibuk || !kursor || !penunjukHalus() || !el.isConnected) return;
      const r = el.getBoundingClientRect();
      tampilArah(selArah(kursor.x - (r.left + r.width / 2), kursor.y - (r.top + r.height / 2), Math.max(36, r.width * 0.6)));
    },
    reaksi(peristiwa, ms) {
      const i = typeof peristiwa === 'number' ? peristiwa
        : reaksiUntuk(peristiwa, peristiwa === 'klik' ? klik++ : peristiwa === 'tugas-selesai' ? tugas++ : 0);
      if (i === null || i === undefined) return;
      tampilReaksi(i, ms ?? (peristiwa === 'tugas-selesai' ? LAMA.tugas : peristiwa === 'hover' ? LAMA.hover : LAMA.klik));
      if (peristiwa === 'klik' || peristiwa === 'tugas-selesai') squash();
    },
    tidur() { if (!sibuk && el.isConnected) { tertidur = true; tampilReaksi(REAKSI.tidur, 0); } },
    bangun() { if (tertidur) selesaiReaksi(); },
    lepas() { clearTimeout(timerReaksi); clearTimeout(kedipTimer); semua.delete(m); el.remove(); },
  };

  el.addEventListener('click', () => { if (tertidur) selesaiReaksi(); m.reaksi('klik'); });
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch' && !sibuk) m.reaksi('hover'); });
  tampilArah(TENGAH);
  semua.add(m);
  pasangGlobal();
  jadwalKedip();
  return m;
}
