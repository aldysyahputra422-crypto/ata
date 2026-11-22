/* Tarik-untuk-segarkan: TANGAN dari bawah mencubit ujung KAIN kaca lalu menariknya turun.
   Arah sesuai gerak tubuh: menarik sesuatu = ke arah diri sendiri, jadi tangan datang dari sisi pengguna (bawah),
   punggung tangan menghadap kita, jari bertumpu di atas kain, ibu jari menjepit dari balik kain.
   Kain menggantung dari tepi atas wadah gulir; tepi bawahnya tertarik paling jauh di titik cubitan (mengikuti jari,
   termasuk geser horizontal) sementara sisi-sisinya tertinggal, dan lipatan memancar dari titik cubitan.
   Ilustrasi tangan orisinal (SVG), gaya stiker maskot: garis #2A1410 + tepi putih, kaki red panda cokelat tua.

   Fase (p = jarak / ambang):
     0 – .45   kain mulai turun; tangan naik dari bawah, jari lurus (meraih)
     .40 – .65 jari menekuk menekan kain, ibu jari menyelinap ke balik kain (mencubit)
     ≥ .65     tangan ikut turun bersama ujung kain; miring mengikuti geser horizontal
     ≥ 1       ambang: lipatan menegang, label "Lepas untuk segarkan"
   Lepas ≥ 1 → kain ditahan, tangan menyentak kecil berirama (memuat), segarkan() dijalankan SEKALI.
   Selesai → label hasil, jari melepas, tangan turun keluar layar, kain naik kembali berpegas.
   Lepas < 1 / gesture batal → kembali berpegas.
   Hanya mulai bila wadah gulir (dan wadah bersarang di bawah jari) di puncak, gerakan awal vertikal,
   dan bukan di dalam sheet/kolom isian. Reduced-motion: tanpa ayunan/pegas. */

const AMBANG = 86, MAKS = 150, TAHAN = 64;
let cssDipasang = false;

/* titik (0,0) = buku jari, tepat di tepi kain. Jari menunjuk ke atas (ke arah kain), pergelangan ke bawah. */
export const TANGAN = `
<svg class="tarik__tangan" viewBox="-60 -60 120 230" width="120" height="230" aria-hidden="true">
  <defs>
    <filter id="tarik-stiker" x="-30%" y="-20%" width="160%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="tebal"/>
      <feFlood flood-color="#fff"/><feComposite in2="tebal" operator="in" result="tepi"/>
      <feMerge><feMergeNode in="tepi"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="tarik-pudar" x1="0" y1="0" x2="0" y2="1"><stop offset=".68" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="tarik-lengan-pudar" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="230"><rect x="-60" y="-60" width="120" height="230" fill="url(#tarik-pudar)"/></mask>
  </defs>
  <g class="tarik__ibu" style="transform-origin:-22px 22px">
    <path d="M-20 26 Q-38 22 -40 4 Q-41 -6 -33 -7 Q-25 -7 -24 4 Q-23 14 -16 16 Z" fill="#3A1D14" stroke="#2A1410" stroke-width="3" stroke-linejoin="round"/>
  </g>
  <g mask="url(#tarik-lengan-pudar)"><g filter="url(#tarik-stiker)">
    <g>
      <path d="M-21 40 L-24 170 L24 170 L21 40 Z" fill="#B84A22" stroke="#2A1410" stroke-width="3"/>
      <path d="M-21 40 L-22 82 Q0 90 22 82 L21 40 Z" fill="#3A1D14"/>
    </g>
    <g class="tarik__punggung">
      <path d="M-25 -2 Q-28 34 -18 50 L18 50 Q28 34 25 -2 Q20 -8 0 -8 Q-20 -8 -25 -2 Z" fill="#3A1D14" stroke="#2A1410" stroke-width="3" stroke-linejoin="round"/>
    </g>
    <g class="tarik__jari" style="transform-origin:-16.5px 0px"><rect x="-22" y="-30" width="11" height="34" rx="5.5" fill="#3A1D14" stroke="#2A1410" stroke-width="3"/><path class="tarik__lipat-jari" d="M-20 -12 q3.5 -2.5 7 0" stroke="#5A3125" stroke-width="2" fill="none" stroke-linecap="round"/></g>
    <g class="tarik__jari" style="transform-origin:-5.5px 0px"><rect x="-11" y="-36" width="11" height="40" rx="5.5" fill="#3A1D14" stroke="#2A1410" stroke-width="3"/><path class="tarik__lipat-jari" d="M-9 -16 q3.5 -2.5 7 0" stroke="#5A3125" stroke-width="2" fill="none" stroke-linecap="round"/></g>
    <g class="tarik__jari" style="transform-origin:5.5px 0px"><rect x="0" y="-36" width="11" height="40" rx="5.5" fill="#3A1D14" stroke="#2A1410" stroke-width="3"/><path class="tarik__lipat-jari" d="M2 -16 q3.5 -2.5 7 0" stroke="#5A3125" stroke-width="2" fill="none" stroke-linecap="round"/></g>
    <g class="tarik__jari" style="transform-origin:16.5px 0px"><rect x="11" y="-28" width="11" height="32" rx="5.5" fill="#3A1D14" stroke="#2A1410" stroke-width="3"/><path class="tarik__lipat-jari" d="M13 -11 q3.5 -2.5 7 0" stroke="#5A3125" stroke-width="2" fill="none" stroke-linecap="round"/></g>
  </g>
  </g>
</svg>`;

const SEBAR = [-12, -4, 4, 12];
/* pose: g = 0 jari lurus menyebar (meraih) … 1 jari menekuk menekan kain, ibu jari ke balik kain (mencubit) */
export function poseTangan(svg, g) {
  svg.querySelectorAll('.tarik__jari').forEach((j, i) => { j.style.transform = `rotate(${SEBAR[i] * (1 - g)}deg) scaleY(${1 - 0.38 * g})`; });
  svg.querySelectorAll('.tarik__lipat-jari').forEach((l) => { l.style.opacity = String(0.35 + 0.65 * g); });
  const ibu = svg.querySelector('.tarik__ibu');
  ibu.style.transform = `rotate(${-10 + 34 * g}deg)`;
  ibu.style.opacity = String(1 - 0.85 * g); /* ibu jari menghilang ke balik kain */
}

/* bentuk kain: lebar w, tepi bawah di titik cubit (cx, e), sisi tertinggal di s */
export function bentukKain(w, cx, e) {
  const s = Math.max(0, e * 0.42);
  const tarikan = Math.min(42, 14 + e * 0.22); /* kecil = cubitan tajam, kain mengerucut masuk ke genggaman */
  return `M0 0 H${w} V${s} C${w - (w - cx) * 0.45} ${s} ${cx + tarikan} ${e} ${cx} ${e} C${cx - tarikan} ${e} ${cx * 0.45} ${s} 0 ${s} Z`;
}
export function lipatanKain(w, cx, e) {
  if (e < 4) return '';
  const ujung = [-0.42, -0.2, 0, 0.2, 0.42];
  return ujung.map((k) => {
    const xa = cx + k * w, xb = cx + k * 26;
    return `M${xb} ${e - 4} Q${(xa + xb) / 2 + k * 18} ${e * 0.45} ${xa} 0`;
  }).join(' ');
}

function pasangCss() {
  if (cssDipasang) return;
  cssDipasang = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  /* app: tarik.css is imported by the route (src/styles/prototype/shared/tarik.css), nothing to load here */
  void l;
}

const jepit = (v, a, b) => Math.min(b, Math.max(a, v));
const mulus = (t) => t * t * (3 - 2 * t);
const tahan = (dy) => MAKS * (1 - Math.exp(-dy / 210));   /* karet: makin jauh makin berat */
const kurangGerak = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const INTERAKTIF = 'input,textarea,select,button,a,[contenteditable],.sheet,.scrim,[data-tanpa-tarik],.lb-deck,.karusel,.peta-maze';

/* semua wadah gulir antara target dan wadah utama harus di puncak */
function diPuncak(target, wadah) {
  for (let e = target; e && e !== wadah.parentElement; e = e.parentElement) {
    if (e.scrollTop > 0) return false;
    if (e === wadah) break;
  }
  return wadah.scrollTop <= 0;
}

export function pasangTarik(wadah, { segarkan, labelAwal = 'Tarik untuk segarkan' } = {}) {
  if (!wadah || wadah.dataset.tarik) return null;
  wadah.dataset.tarik = '1';
  pasangCss();
  wadah.style.overscrollBehaviorY = 'contain'; /* matikan tarik-segarkan bawaan browser */

  const el = document.createElement('div');
  el.className = 'tarik';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="tarik__kain"></div><svg class="tarik__lipatan"><path class="tarik__garis" d=""/><path class="tarik__tepi" d=""/></svg>
    <p class="tarik__label"><span class="tarik__cincin"></span><span class="tarik__teks"></span></p>${TANGAN}`;
  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  document.body.append(el, status);
  const tangan = el.querySelector('.tarik__tangan'), kain = el.querySelector('.tarik__kain');
  const garis = el.querySelector('.tarik__garis'), tepi = el.querySelector('.tarik__tepi');
  const label = el.querySelector('.tarik__label'), teks = el.querySelector('.tarik__teks');

  let mode = 'diam', y = 0, dx = 0, x0 = 0, y0 = 0, raf = 0, sentak = 0, idPointer = null, lebar = 360;

  function letakkan() {
    const r = wadah.getBoundingClientRect();
    lebar = r.width;
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
  }

  /* gambar satu keadaan: y (px isi turun), g (genggam 0..1) dihitung dari p kecuali diberikan; keluar = tangan turun keluar */
  function gambar({ g: gPaksa, naik: keluar = 0 } = {}) {
    const p = y / AMBANG;
    const muncul = mulus(jepit(p / 0.45, 0, 1));
    const g = gPaksa ?? mulus(jepit((p - 0.4) / 0.25, 0, 1));
    const cx = jepit(lebar / 2 + dx * 0.45, 70, lebar - 70);
    const e = y + 6;                                    /* tepi kain di titik cubit */
    const d = bentukKain(lebar, cx, e);
    kain.style.clipPath = `path('${d}')`;
    kain.style.height = `${e + 2}px`;
    garis.setAttribute('d', lipatanKain(lebar, cx, e));
    garis.style.opacity = String(jepit(g * 0.9 + (p >= 1 ? 0.1 : 0), 0, 1));
    tepi.setAttribute('d', d.replace(/^M0 0 H[\d.]+ V([\d.]+) /, `M${lebar} $1 `).replace(/ Z$/, ''));
    /* tangan: naik dari bawah menuju tepi kain, lalu ikut turun bersamanya */
    let yTangan = e + 20 + (1 - muncul) * 150 + keluar; /* buku jari di bawah tepi, ujung jari menekan kain */
    if (mode === 'segar') yTangan += Math.sin(sentak) * 2.5;
    const miring = kurangGerak() ? 0 : jepit(dx * 0.1, -12, 12);
    tangan.style.transform = `translate(${cx - 60}px, ${yTangan - 60}px) rotate(${miring}deg)`;
    tangan.style.opacity = String(jepit(muncul * 1.6 + (gPaksa != null ? 1 : 0), 0, 1) * (1 - jepit(keluar / 150, 0, 1)));
    poseTangan(tangan, g);
    /* label di atas kain (bidang pekat, bukan di atas foto) */
    label.style.transform = `translate(-50%, ${Math.max(6, e * 0.42 - 34)}px)`;
    label.style.left = `${lebar / 2}px`;
    label.style.opacity = String(jepit((p - 0.3) * 2.5, 0, 1));
    el.classList.toggle('is-ambang', p >= 1 && mode === 'tarik');
    wadah.style.transform = y > 0.5 ? `translateY(${y}px)` : '';
  }

  function setLabel(t) { if (teks.textContent !== t) teks.textContent = t; }

  /* pegas sederhana (redaman kritis) menuju sasaran; tanpa rAF (tab tersembunyi) langsung ke akhir */
  function pegas(ke, { g, naikKe = 0, selesai } = {}) {
    cancelAnimationFrame(raf);
    const awalY = y, awalNaik = 0, t0 = performance.now(), dur = kurangGerak() ? 0 : 420;
    let jadi = false;
    const akhir = () => { if (jadi) return; jadi = true; y = ke; gambar({ g, naik: naikKe }); selesai?.(); };
    if (!dur || document.hidden) return akhir();
    const langkah = (t) => {
      const k = jepit((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3) * Math.cos(k * 2.2); /* sedikit memantul */
      y = awalY + (ke - awalY) * e;
      gambar({ g, naik: awalNaik + (naikKe - awalNaik) * e });
      if (k < 1) raf = requestAnimationFrame(langkah); else akhir();
    };
    raf = requestAnimationFrame(langkah);
    setTimeout(akhir, dur + 250);
  }

  function mulai(cx, cy, target) {
    if (mode !== 'diam' || target.closest(INTERAKTIF) || !diPuncak(target, wadah)) return false;
    x0 = cx; y0 = cy; dx = 0; mode = 'mungkin';
    return true;
  }
  function gerak(cx, cy) {
    const ddx = cx - x0, ddy = cy - y0;
    if (mode === 'mungkin') {
      if (Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(ddy)) { mode = 'diam'; return false; } /* geser horizontal */
      if (ddy < -4 || wadah.scrollTop > 0) { mode = 'diam'; return false; }                     /* gulir biasa */
      if (ddy > 8) { mode = 'tarik'; letakkan(); el.classList.add('is-tampil'); document.documentElement.classList.add('sedang-tarik'); setLabel(labelAwal); }
      else return false;
    }
    if (mode !== 'tarik') return false;
    dx = ddx;
    y = tahan(Math.max(0, ddy - 8));
    setLabel(y >= AMBANG ? 'Lepas untuk segarkan' : labelAwal);
    gambar();
    return true;
  }
  async function lepas(batal = false) {
    document.documentElement.classList.remove('sedang-tarik');
    if (mode === 'mungkin') { mode = 'diam'; return; }
    if (mode !== 'tarik') return;
    if (batal || y < AMBANG) {
      mode = 'kembali';
      pegas(0, { selesai: () => { mode = 'diam'; el.classList.remove('is-tampil'); } });
      return;
    }
    mode = 'segar';
    dx = 0;
    el.classList.add('is-memuat');
    setLabel('Memperbarui…');
    status.textContent = 'Memperbarui';
    pegas(TAHAN, { g: 1 });
    const putar = () => { if (mode !== 'segar') return; sentak += 0.35; gambar({ g: 1 }); requestAnimationFrame(putar); };
    if (!kurangGerak()) requestAnimationFrame(putar);
    const t0 = performance.now();
    let hasil;
    try { hasil = { ok: true, pesan: (await segarkan?.()) || 'Diperbarui' }; }
    catch (e) { hasil = { ok: false, pesan: `Gagal memperbarui: ${e?.message || 'coba lagi'}` }; }
    /* beri waktu minimal supaya status terbaca, bukan berkedip */
    const sisa = 650 - (performance.now() - t0);
    if (sisa > 0) await new Promise((r) => setTimeout(r, sisa));
    mode = 'hasil';
    el.classList.remove('is-memuat');
    el.classList.toggle('is-gagal', !hasil.ok);
    setLabel(hasil.pesan);
    status.textContent = hasil.pesan;
    await new Promise((r) => setTimeout(r, hasil.ok ? 700 : 1600));
    /* jari membuka, tangan naik, isi kembali */
    pegas(0, { g: 0, naikKe: 160, selesai: () => { mode = 'diam'; el.classList.remove('is-tampil', 'is-gagal'); } });
  }

  /* sentuh: touchmove non-pasif agar gulir bawaan bisa dicegah hanya saat benar-benar menarik */
  wadah.addEventListener('touchstart', (e) => { if (e.touches.length === 1) mulai(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: true });
  wadah.addEventListener('touchmove', (e) => { if (mode === 'mungkin' || mode === 'tarik') { if (gerak(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault(); } }, { passive: false });
  wadah.addEventListener('touchend', () => lepas(false));
  wadah.addEventListener('touchcancel', () => lepas(true));
  /* pena & mouse (desktop): seret dari area kosong */
  wadah.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' || e.button !== 0) return; if (mulai(e.clientX, e.clientY, e.target)) idPointer = e.pointerId; });
  wadah.addEventListener('pointermove', (e) => {
    if (e.pointerId !== idPointer) return;
    if (gerak(e.clientX, e.clientY)) { try { wadah.setPointerCapture(e.pointerId); } catch (er) { /* sudah dilepas */ } e.preventDefault(); }
  });
  const akhiriPointer = (e, batal) => { if (e.pointerId !== idPointer) return; idPointer = null; lepas(batal); };
  wadah.addEventListener('pointerup', (e) => akhiriPointer(e, false));
  wadah.addEventListener('pointercancel', (e) => akhiriPointer(e, true));
  const batalTarik = (e) => { if (e.key === 'Escape' && mode === 'tarik') { mode = 'tarik'; lepas(true); } };
  window.addEventListener('keydown', batalTarik);

  /* app only: the screen is mounted again on every visit, so what was added outside the container is taken back */
  const copot = () => { window.removeEventListener('keydown', batalTarik); el.remove(); status.remove(); delete wadah.dataset.tarik; };
  return { el, copot, get mode() { return mode; } };
}
