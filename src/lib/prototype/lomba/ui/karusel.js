/* Karusel 3D "mirip dengan ini": kartu tengah tegak, kartu samping miring dan mengecil.
   Mekanika dari referensi travel app (perspektif + snap saat digeser), bukan paletnya.
   Melingkar: kartu terakhir menunggu di kiri kartu pertama, jadi tak ada sisi yang kosong. */
import { posisiMelingkar, putar } from '../logic/karusel.js';

const MAKS = 6;
const JARAK_PER_PIKSEL = (lebar) => lebar * 0.82 + 10;

export function karuselHtml({ aktifId, daftar, profil, skorCocok, posterHtml, esc }) {
  const lain = daftar
    .filter((l) => l.id !== aktifId)
    .map((l) => ({ l, skor: skorCocok(l, profil).skor }))
    .sort((a, b) => Number(!!b.l.nyata) - Number(!!a.l.nyata) || b.skor - a.skor) /* poster nyata dulu, lalu skor */
    .slice(0, MAKS);

  if (!lain.length) return '';

  return `<section class="lb-mirip" aria-labelledby="judulMirip">
    <div class="lb-mirip__kepala">
      <h2 id="judulMirip">Mirip dengan ini</h2>
      <span class="small muted num" id="karuselHitung">1 / ${lain.length}</span>
      <div class="lb-mirip__nav">
        <button type="button" class="ikon-bundar" data-arah="-1" aria-label="Sebelumnya"><span data-icon="left"></span></button>
        <button type="button" class="ikon-bundar" data-arah="1" aria-label="Berikutnya"><span data-icon="right"></span></button>
      </div>
    </div>
    <div class="karusel" id="karusel" role="group" aria-roledescription="karusel" aria-label="Lomba lain yang mirip" tabindex="-1">
      <div class="karusel__trek" id="trekTiga">
        ${lain
          .map(
            ({ l, skor }, i) => `<a class="kartu-3d" href="#lomba-detail" data-pilih="${l.id}" aria-label="${esc(l.nama)}, ${skor} persen mirip">
              ${posterHtml(l, 'poster-art--karusel')}
            </a>`
          )
          .join('')}
      </div>
    </div>
  </section>`;
}

export function pasangKarusel(root, { onPilih }) {
  const karusel = root.querySelector('#karusel');
  const trek = root.querySelector('#trekTiga');
  if (!karusel || !trek) return;

  const kartu = [...trek.children];
  const hitung = root.querySelector('#karuselHitung');
  const gerak = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let indeks = 0;
  let geserAwal = null;
  let geseran = 0;
  let menyeret = false;

  const jarakKartu = () => JARAK_PER_PIKSEL(kartu[0].getBoundingClientRect().width);

  const n = kartu.length;
  const posLalu = new Map();
  const bungkus = (p) => (n > 2 ? ((((p + n / 2) % n) + n) % n) - n / 2 : p);

  function terapkan(geserPiksel = 0) {
    const jarak = jarakKartu();
    const lompat = [];
    kartu.forEach((k, i) => {
      const pos = bungkus(posisiMelingkar(i, indeks, n) - geserPiksel / jarak);
      /* kartu yang pindah ke sisi seberang lingkaran tidak boleh terlihat melintas */
      if (posLalu.has(k) && Math.abs(pos - posLalu.get(k)) > 1.5) { k.style.transition = 'none'; lompat.push(k); }
      posLalu.set(k, pos);
      const jauh = Math.abs(pos);
      const redup = jauh > 2.15;
      const miring = gerak ? Math.max(-32, Math.min(32, -pos * 28)) : 0;
      const dalam = -Math.min(jauh, 2.5) * 96;
      const skala = 1 - Math.min(jauh, 2.5) * 0.09;

      k.style.transform = `translateX(calc(-50% + ${(pos * jarak).toFixed(1)}px)) rotateY(${miring.toFixed(2)}deg) translateZ(${dalam.toFixed(1)}px) scale(${skala.toFixed(3)})`;
      k.style.opacity = redup ? '0' : jauh > 1.6 ? '.55' : '1';
      k.style.zIndex = String(100 - Math.round(jauh * 10));
      k.setAttribute('aria-hidden', jauh > 1.6 ? 'true' : 'false');
      k.tabIndex = jauh < 0.5 ? 0 : -1;
    });
    if (lompat.length) {
      void trek.offsetWidth; /* terapkan posisi baru tanpa transisi, lalu pulihkan */
      requestAnimationFrame(() => lompat.forEach((k) => { k.style.transition = ''; }));
    }
    if (hitung) hitung.textContent = `${indeks + 1} / ${n}`;
  }

  function pindah(arah) {
    if (n < 2) return;
    indeks = putar(indeks, arah, n);
    terapkan(0);
  }

  root.querySelectorAll('[data-arah]').forEach((b) => {
    b.addEventListener('click', () => pindah(Number(b.dataset.arah)));
  });

  kartu.forEach((k) => {
    k.addEventListener('click', (e) => {
      if (Math.abs(geseran) > 6) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      onPilih?.(k.dataset.pilih, k);
    });
    k.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        pindah(1);
        kartu[indeks]?.focus();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        pindah(-1);
        kartu[indeks]?.focus();
      }
    });
  });

  karusel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    geserAwal = e.clientX;
    geseran = 0;
    menyeret = true;
    karusel.setPointerCapture?.(e.pointerId);
    trek.style.transition = 'none';
  });

  karusel.addEventListener('pointermove', (e) => {
    if (!menyeret || geserAwal === null) return;
    geseran = e.clientX - geserAwal;
    terapkan(geseran);
  });

  const lepas = (e) => {
    if (!menyeret) return;
    menyeret = false;
    trek.style.transition = '';
    const ambang = jarakKartu() * 0.3;
    if (geseran < -ambang) pindah(1);
    else if (geseran > ambang) pindah(-1);
    else terapkan(0);
    geserAwal = null;
    setTimeout(() => {
      geseran = 0;
    }, 0);
  };
  karusel.addEventListener('pointerup', lepas);
  karusel.addEventListener('pointercancel', lepas);

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => terapkan(0)).observe(karusel);
  }

  terapkan(0);
  /* letakkan kartu pertama di tengah tanpa animasi saat pertama tampil */
  trek.style.transition = 'none';
  terapkan(0);
  requestAnimationFrame(() => {
    trek.style.transition = '';
  });
}
