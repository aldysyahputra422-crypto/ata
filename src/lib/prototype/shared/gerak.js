/* Primitif gerak bersama (vanilla, tanpa library). Semua berhenti pada prefers-reduced-motion
   dan hanya menganimasikan transform/opacity supaya tetap 60 fps.
   - transisiTampilan(): pindah layar lewat View Transitions API bawaan browser (kartu → detail "melebar"); fallback langsung
   - pasangCondong(): folder condong mengikuti penunjuk ("hover to lean"), kembali dengan pantulan
   - pasangParallax(): foto hero detail bergerak 0,4× gulir dan meregang saat ditarik
   - pudarTema(): warna memudar ~350 ms saat tema berganti, bukan meloncat
   - masuk(): lapisan baru (tab) muncul naik-memudar lewat Web Animations API */
import { sudutCondong, parallaxHero } from './logic/gerak.js';

export const gerakDikurangi = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_OUT = 'cubic-bezier(.22,1,.36,1)';

/* jalankan perubahan DOM di dalam view transition bila ada; `jenis` dipasang di <html data-vt> agar CSS bisa membedakan */
export function transisiTampilan(ubah, jenis = 'layar') {
  if (gerakDikurangi() || typeof document.startViewTransition !== 'function' || document.visibilityState === 'hidden') {
    ubah();
    return null;
  }
  document.documentElement.dataset.vt = jenis;
  /* callback transisi menunggu kesempatan render; bila render ditahan (frame tersembunyi, tab latar),
     jangan biarkan layar tertahan: lewati animasinya dan perbarui DOM langsung setelah 300 ms. Selalu sekali saja. */
  let sudah = false;
  const sekali = () => { if (sudah) return; sudah = true; ubah(); };
  try {
    const t = document.startViewTransition(sekali);
    /* transisi yang dilewati (tab tersembunyi, dipotong transisi lain) menolak promise-nya: itu wajar, bukan galat */
    t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {});
    const aman = setTimeout(() => { if (!sudah) { try { t.skipTransition(); } catch (e) { /* abaikan */ } sekali(); } }, 300);
    t.finished.finally(() => { clearTimeout(aman); if (document.documentElement.dataset.vt === jenis) delete document.documentElement.dataset.vt; }).catch(() => {});
    return t;
  } catch (e) {
    delete document.documentElement.dataset.vt;
    sekali();
    return null;
  }
}

/* tandai satu elemen sebagai sumber "kartu melebar"; nama lama dibersihkan supaya selalu unik */
export function tandaiSumber(el, nama = 'lb-hero') {
  document.querySelectorAll('[data-vt-nama]').forEach((x) => { x.style.viewTransitionName = ''; delete x.dataset.vtNama; });
  if (!el) return;
  el.style.viewTransitionName = nama;
  el.dataset.vtNama = nama;
}

export function pasangCondong(el, { maks = 6 } = {}) {
  if (!el || el.dataset.condong || gerakDikurangi()) return;
  el.dataset.condong = '1';
  let raf = 0, kotak = null;
  const ke = (rx, ry, angkat) => { el.style.setProperty('--rx', `${rx}deg`); el.style.setProperty('--ry', `${ry}deg`); el.style.setProperty('--angkat', angkat); };
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; kotak = el.getBoundingClientRect(); el.classList.add('is-condong'); });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !kotak) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const s = sudutCondong(e.clientX - kotak.left, e.clientY - kotak.top, kotak.width, kotak.height, maks); ke(s.rx, s.ry, 1); });
  });
  el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); kotak = null; el.classList.remove('is-condong'); ke(0, 0, 0); });
  /* keyboard: fokus mengangkat tanpa condong */
  el.addEventListener('focus', () => el.style.setProperty('--angkat', 1));
  el.addEventListener('blur', () => el.style.setProperty('--angkat', 0));
}

/* gulir: wadah yang menggulir; hero: elemen yang digeser (foto) */
export function pasangParallax(gulir, hero) {
  if (!gulir || !hero || gerakDikurangi()) return () => {};
  let raf = 0;
  const terapkan = () => {
    raf = 0;
    if (!hero.isConnected) return;
    const p = parallaxHero(gulir.scrollTop, hero.offsetHeight);
    hero.style.setProperty('--geser', `${p.geser}px`);
    hero.style.setProperty('--skala', p.skala);
    hero.style.setProperty('--redup', p.redup);
  };
  const h = () => { if (!raf) raf = requestAnimationFrame(terapkan); };
  gulir.addEventListener('scroll', h, { passive: true });
  terapkan();
  return () => { gulir.removeEventListener('scroll', h); cancelAnimationFrame(raf); };
}

let pudarTimer = 0;
export function pudarTema() {
  if (gerakDikurangi()) return;
  const html = document.documentElement;
  html.classList.add('tema-berganti');
  clearTimeout(pudarTimer);
  pudarTimer = setTimeout(() => html.classList.remove('tema-berganti'), 420);
}

export function masuk(el, { dari = 10, durasi = 260 } = {}) {
  if (!el || gerakDikurangi() || typeof el.animate !== 'function') return null;
  return el.animate([{ opacity: 0, transform: `translateY(${dari}px)` }, { opacity: 1, transform: 'none' }], { duration: durasi, easing: EASE_OUT });
}
