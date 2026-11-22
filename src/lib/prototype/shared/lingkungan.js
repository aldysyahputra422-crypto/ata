/* Lingkungan senja + material kaca (lihat shared/lingkungan.css).
   - pasangLingkungan(): lapisan foto/cahaya/tirai di setiap .app, fase cahaya disamakan antar-dokumen
   - filter #kaca-lensa: peta perpindahan yang hanya membiaskan TEPI (tengah tetap jernih), seperti kaca tebal pada mockup
   - shell: siarkanLingkungan() mengirim ukuran, posisi, dan parallax ke iframe supaya latar menyambung mulus
   - iframe: terimaLingkungan() memakai nilai itu (dipasang otomatis oleh shared/embed.js) */
import { geserParallax } from './logic/lingkungan.js';

const PERIODE_NAPAS = 26; /* detik, sama dengan @keyframes lingkungan-napas */
const kurangiGerak = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const penunjukHalus = () => typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/* peta perpindahan: R = geser X (128 netral), G = geser Y; gradasi hanya di 14 % tepi */
const petaSumbu = (warna, arah) => {
  const [x2, y2] = arah === 'x' ? ['1', '0'] : ['0', '1'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="${x2}" y2="${y2}">`
    + `<stop offset="0" stop-color="${warna(0)}"/><stop offset=".14" stop-color="${warna(128)}"/><stop offset=".86" stop-color="${warna(128)}"/><stop offset="1" stop-color="${warna(255)}"/>`
    + `</linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
};

function pasangFilter() {
  if (document.getElementById('kaca-lensa-svg')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.id = 'kaca-lensa-svg';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<filter id="kaca-lensa" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage href="${petaSumbu((v) => `rgb(${v},0,0)`, 'x')}" preserveAspectRatio="none" result="px"/>
      <feImage href="${petaSumbu((v) => `rgb(0,${v},0)`, 'y')}" preserveAspectRatio="none" result="py"/>
      <feComposite in="px" in2="py" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="peta"/>
      <feDisplacementMap in="SourceGraphic" in2="peta" scale="-34" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  document.body.append(svg);
  /* hanya Chromium yang memakai filter SVG di backdrop-filter; lainnya tetap blur biasa (lihat .m-lensa) */
  const chromium = !!(navigator.userAgentData && navigator.userAgentData.brands?.some((b) => /Chromium/.test(b.brand)));
  if (chromium && CSS.supports('backdrop-filter', 'url(#kaca-lensa) blur(2px)')) document.documentElement.classList.add('bisa-lensa');
}

export function pasangLingkungan(root = document) {
  root.querySelectorAll('.app').forEach((app) => {
    if (app.querySelector(':scope > .lingkungan')) return;
    const l = document.createElement('div');
    l.className = 'lingkungan';
    l.setAttribute('aria-hidden', 'true');
    l.innerHTML = '<div class="lingkungan__foto"></div><div class="lingkungan__cahaya"></div><div class="lingkungan__tirai"></div>';
    /* semua dokumen bernapas serempak: fase dihitung dari jam dinding, bukan dari waktu muat */
    l.style.setProperty('--fase', `-${((Date.now() / 1000) % PERIODE_NAPAS).toFixed(2)}s`);
    app.prepend(l);
  });
  pasangFilter();
}

/* ---------- sisi iframe ---------- */
export function terimaLingkungan(d) {
  document.querySelectorAll('.lingkungan').forEach((l) => {
    for (const k of ['lw', 'lh', 'lx', 'ly', 'gx', 'gy']) if (Number.isFinite(d[k])) l.style.setProperty(`--${k}`, `${d[k]}px`);
    if (d.lebar) l.dataset.lebar = d.lebar;
  });
}

/* ---------- sisi shell ---------- */
let gx = 0, gy = 0;
export function siarkanLingkungan(bingkai) {
  const vw = innerWidth, vh = innerHeight, lebar = vw <= 640 ? 'sempit' : 'lebar';
  for (const f of bingkai) {
    if (!f || f.hidden || !f.contentWindow) continue;
    const r = f.getBoundingClientRect();
    try {
      f.contentWindow.postMessage({ ata: 'lingkungan', lw: vw, lh: vh, lx: Math.round(r.left), ly: Math.round(r.top), gx, gy, lebar }, location.origin);
    } catch (e) { /* belum siap: dikirim lagi saat load */ }
  }
}

/* parallax halus mengikuti penunjuk (±10 px, berlawanan arah), juga dikirim ke iframe yang tampak */
export function pasangParallaxLingkungan(ambilBingkai) {
  if (kurangiGerak() || !penunjukHalus()) return;
  const sendiri = document.querySelector('.app > .lingkungan');
  let terakhir = 0, tunda = 0;
  const kirim = () => { tunda = 0; terakhir = performance.now(); siarkanLingkungan(ambilBingkai()); };
  const ke = (x, y) => {
    ({ gx, gy } = geserParallax(x, y, innerWidth, innerHeight, 10));
    sendiri?.style.setProperty('--gx', `${gx}px`);
    sendiri?.style.setProperty('--gy', `${gy}px`);
    const jeda = performance.now() - terakhir;
    if (jeda >= 48) kirim(); else if (!tunda) tunda = setTimeout(kirim, 48 - jeda);
  };
  window.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') ke(e.clientX, e.clientY); }, { passive: true });
  return ke; /* dipakai juga untuk posisi kursor yang diteruskan dari iframe */
}
