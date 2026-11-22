/* Perilaku bersama untuk panel bawah (.sheet di dalam .scrim):
   - pasangPegas(): sheet muncul dengan pegas, bisa diseret ke bawah mengikuti jari, ke atas melawan (rubber-band),
     dilepas → menutup bila jauh/cepat, atau memantul kembali. Scrim meredup sesuai jarak.
   - kurungFokus(): Tab dan Shift+Tab berputar di dalam panel.
   Fisika ada di logic/pegas.js (diuji); berkas ini hanya menempelkannya ke DOM. */
import { posisiSeret, simulasiPegas, kecepatanDari, putuskanLepas } from './logic/pegas.js';
import { indeksKurung } from './logic/fokus.js';

const gerakDikurangi = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PEGANGAN = '.sheet__grip, .sheet__grip + h2';
const INTERAKTIF = 'button, a[href], input, textarea, select, label, summary, [contenteditable="true"], [role="slider"], [tabindex]:not([tabindex="-1"])';
const BISA_FOKUS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function kurungFokus(root) {
  if (!root || root.dataset.kurung) return;
  root.dataset.kurung = '1';
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const bisa = [...root.querySelectorAll(BISA_FOKUS)].filter((el) => !el.disabled && !el.closest('[inert],[hidden]') && el.getClientRects().length);
    const i = indeksKurung(bisa.length, bisa.indexOf(document.activeElement), e.shiftKey);
    if (i < 0) return;
    e.preventDefault();
    bisa[i].focus();
  });
}

export function pasangPegas(sheet, tutup) {
  if (!sheet || sheet.dataset.pegas) return;
  sheet.dataset.pegas = '1';
  const scrim = sheet.closest('.scrim');
  let raf = 0, y = 0, seret = null, menutup = false;

  const tengah = () => scrim && getComputedStyle(scrim).alignItems === 'center';
  const tinggi = () => sheet.getBoundingClientRect().height || 400;
  const set = (nilai) => {
    y = nilai;
    sheet.style.transform = Math.abs(nilai) < 0.05 ? '' : `translate3d(0,${nilai.toFixed(2)}px,0)`;
    if (scrim) scrim.style.setProperty('--redup', String(Math.max(0, Math.min(1, 1 - Math.max(0, nilai) / tinggi()))));
  };
  let pengaman = 0, akhiri = null;
  const henti = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(pengaman); akhiri = null; };
  /* putar jejak bingkai demi bingkai. Bila rAF tidak berjalan (tab/iframe tersembunyi), pengaman waktu
     langsung menaruh sheet di posisi akhirnya, jadi sheet tak pernah tertahan di luar layar. */
  const putar = (jejak, selesai) => {
    henti();
    let i = 0;
    const tamat = () => { if (akhiri !== tamat) return; henti(); if (sheet.isConnected) set(jejak[jejak.length - 1]); selesai?.(); };
    akhiri = tamat;
    const langkah = () => {
      if (!sheet.isConnected) return henti();
      set(jejak[i]); i += 1;
      if (i < jejak.length) raf = requestAnimationFrame(langkah); else tamat();
    };
    raf = requestAnimationFrame(langkah);
    pengaman = setTimeout(tamat, Math.round((jejak.length / 60) * 1000) + 300);
  };
  const tanpaAnimasi = () => gerakDikurangi() || document.visibilityState === 'hidden';
  const pegas = (ke, v0 = 0, selesai) => {
    if (tanpaAnimasi()) { henti(); set(ke); selesai?.(); return; }
    putar(simulasiPegas(y, v0, ke), selesai);
  };
  const tutupDenganGeser = (v0) => {
    if (menutup) return;
    menutup = true;
    const ujung = tinggi() + 48;
    if (tanpaAnimasi()) { henti(); return tutup(); }
    /* turun tanpa memantul: pegas lebih teredam menuju sedikit di bawah layar */
    const jejak = simulasiPegas(y, Math.max(v0, 600), ujung, { kaku: 260, redam: 40 }).map((n) => Math.min(n, ujung));
    const ke = jejak.findIndex((n) => n >= ujung - 2);
    putar(ke > 0 ? jejak.slice(0, ke + 1) : jejak, tutup);
  };

  /* muncul: dari bawah (HP) atau sedikit di bawah tempatnya (dialog tengah di desktop) */
  if (!tanpaAnimasi()) { set(tengah() ? 56 : tinggi() + 24); pegas(0, tengah() ? 0 : -400); }
  else set(0);

  sheet.addEventListener('pointerdown', (e) => {
    if (menutup || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const diPegangan = !!e.target.closest(PEGANGAN);
    /* sentuhan hanya dari pegangan (sisanya untuk gulir isi); mouse/pena juga dari area kosong saat isi di puncak */
    if (!diPegangan && (e.pointerType === 'touch' || e.target.closest(INTERAKTIF) || sheet.scrollTop > 0)) return;
    henti();
    seret = { id: e.pointerId, awal: e.clientY - Math.max(0, y), mulai: e.clientY, aktif: false, sampel: [{ t: e.timeStamp, y: e.clientY }] };
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!seret || e.pointerId !== seret.id) return;
    if (!seret.aktif) {
      if (Math.abs(e.clientY - seret.mulai) < 4) return;
      seret.aktif = true;
      try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* pointer sudah hilang: seret tetap jalan tanpa capture */ }
      sheet.classList.add('is-seret');
    }
    e.preventDefault();
    seret.sampel.push({ t: e.timeStamp, y: e.clientY });
    if (seret.sampel.length > 8) seret.sampel.shift();
    set(posisiSeret(e.clientY - seret.awal));
  });
  const lepas = (e) => {
    if (!seret || e.pointerId !== seret.id) return;
    const s = seret; seret = null;
    sheet.classList.remove('is-seret');
    if (!s.aktif) return;
    sheet.dataset.barusSeret = '1';
    setTimeout(() => delete sheet.dataset.barusSeret, 0);
    const v = kecepatanDari(s.sampel);
    if (e.type !== 'pointercancel' && putuskanLepas({ geser: y, kecepatan: v, tinggi: tinggi() }) === 'tutup') tutupDenganGeser(v);
    else pegas(0, y > 0 ? Math.min(v, 0) : v);
  };
  sheet.addEventListener('pointerup', lepas);
  sheet.addEventListener('pointercancel', lepas);
  /* klik yang sebenarnya akhir seretan tidak boleh menutup lewat scrim / memicu tombol */
  sheet.addEventListener('click', (e) => { if (sheet.dataset.barusSeret) { e.stopPropagation(); e.preventDefault(); } }, true);
}
