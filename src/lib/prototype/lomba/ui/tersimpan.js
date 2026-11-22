/* Saved competitions and the last 7 days of skipped ones; skipped ones can go back on the Radar.
   Pencarian lengket di atas daftar: menyusut jadi pill ringkas saat digulir (referensi aplikasi pesan-antar).
   Chip kategori bulat di bawahnya. Mengetik/memilih chip hanya memperbarui daftar, jadi fokus & gulir tidak hilang. */
import { state, simpan, cari, esc } from '../state.js';
import { NAMA_KATEGORI } from '../data/lomba.js';
import { saringLomba, kategoriDi } from '../logic/cari.js';
import { sisaLabel } from './poster.js';
import { chipHtml } from './chip.js';
import { mountIcons } from '../../shared/ds.js';
import { tandaiSumber } from '../../shared/gerak.js';

export const note = 'Tersimpan: lomba yang kamu simpan, dan yang dilewati 7 hari terakhir. Yang dilewati bisa dikembalikan ke Radar. Kolom cari menempel di atas dan menyusut saat daftar digulir; chip kategori menyaring kedua daftar.';

let kueri = '', kategori = 'semua', pengamat = null;
export function pergi() { pengamat?.disconnect(); pengamat = null; }

const baris = (id, aksi) => { const l = cari(id); return `<li class="lb-row">
  <span class="lb-row__swatch g-${l.gem}${l.gambar ? ' lb-row__swatch--foto' : ''}" aria-hidden="true"${l.gambar ? ` style="background-image:url('/prototype/${esc(l.gambar)}')"` : ''}></span>
  <a class="lb-row__main" href="#lomba-detail" data-buka="${id}"><strong class="wrap-any">${esc(l.nama)}</strong><span class="small muted">${esc(l.cakupan)} · ${sisaLabel(l.hariLagi)}</span></a>
  ${aksi}</li>`; };

function daftarHtml() {
  const d = state.deck, opsi = { kueri, kategori, namaKategori: NAMA_KATEGORI };
  const sim = saringLomba(d.tersimpan, cari, opsi), lew = saringLomba(d.dilewati, cari, opsi);
  const menyaring = !!kueri.trim() || kategori !== 'semua';
  const kosongCari = menyaring && !sim.length && !lew.length;
  const jumlah = (n, total) => (menyaring ? `${n} dari ${total}` : String(total));
  if (kosongCari) {
    return `<div class="empty lb-cari-kosong"><img src="/prototype/assets/panik.svg" alt="" width="120" height="120">
      <h2>Tidak ada yang cocok</h2><p>${kueri.trim() ? `Tidak ada lomba tersimpan dengan kata “${esc(kueri.trim())}”${kategori !== 'semua' ? ` di kategori ${esc(NAMA_KATEGORI[kategori])}` : ''}.` : `Belum ada lomba ${esc(NAMA_KATEGORI[kategori])} di sini.`}</p>
      <button type="button" class="btn" data-bersihkan><span data-icon="close"></span>Hapus saringan</button></div>`;
  }
  return `<section aria-labelledby="h-sim"><h2 id="h-sim" class="lb-sub">Disimpan <span class="pill num">${jumlah(sim.length, d.tersimpan.length)}</span></h2>
      ${sim.length ? `<ul class="lb-rows">${sim.map((id) => baris(id, `<a class="btn btn--ghost" href="#lomba-detail" data-buka="${id}">Detail</a>`)).join('')}</ul>`
        : d.tersimpan.length ? '<p class="small muted">Tidak ada yang cocok di daftar ini.</p>'
        : '<div class="empty"><img src="/prototype/assets/tidur.svg" alt="Ata tidur"><p>Belum ada yang disimpan. Geser kartu ke kanan di Radar untuk menyimpan.</p><a class="btn" href="#radar">Buka Radar</a></div>'}</section>
    <section aria-labelledby="h-lew"><h2 id="h-lew" class="lb-sub">Dilewati 7 hari terakhir <span class="pill num">${jumlah(lew.length, d.dilewati.length)}</span></h2>
      ${lew.length ? `<ul class="lb-rows">${lew.map((id) => baris(id, `<button type="button" class="btn btn--ghost" data-pulih="${id}"><span data-icon="replay"></span>Kembalikan</button>`)).join('')}</ul>`
        : `<p class="small muted">${d.dilewati.length ? 'Tidak ada yang cocok di daftar ini.' : 'Tidak ada yang dilewati.'}</p>`}</section>`;
}

function chipsHtml() {
  const d = state.deck, ada = kategoriDi([...d.tersimpan, ...d.dilewati], cari, NAMA_KATEGORI);
  if (kategori !== 'semua' && !ada.includes(kategori)) ada.push(kategori);
  if (!ada.length) return '';
  return `<div class="scroller lb-chips"><div class="lb-filter" role="group" aria-label="Filter kategori">
    ${chipHtml({ nilai: 'semua', label: 'Semua', aktif: kategori === 'semua' })}
    ${ada.map((k) => chipHtml({ nilai: k, label: NAMA_KATEGORI[k], aktif: kategori === k })).join('')}</div></div>`;
}

export function view(ctx) {
  const d = state.deck, total = d.tersimpan.length + d.dilewati.length;
  return { html: `<section class="view lb-tersimpan">
    <a class="back" href="#radar"><span data-icon="left"></span>Radar</a>
    <header><p class="eyebrow">Radar Lomba</p><h1>Tersimpan</h1><span class="lb-cari__penanda" aria-hidden="true"></span></header>
    <div class="lb-cari" id="lbCari">
      <div class="lb-cari__kotak">
        <span class="lb-cari__judul" aria-hidden="true">Tersimpan</span>
        <span class="lb-cari__ikon" data-icon="search" aria-hidden="true"></span>
        <label class="sr-only" for="cariLomba">Cari di lomba tersimpan dan yang dilewati</label>
        <input type="search" id="cariLomba" class="lb-cari__input" placeholder="Cari nama, penyelenggara, kategori" autocomplete="off" enterkeyhint="search" value="${esc(kueri)}" ${total ? '' : 'disabled'}>
        <button type="button" class="lb-cari__hapus" data-bersihkan aria-label="Hapus pencarian" ${kueri ? '' : 'hidden'}><span data-icon="close"></span></button>
      </div>
    </div>
    <div id="lbChips">${chipsHtml()}</div>
    <p class="sr-only" id="lbHasil" aria-live="polite"></p>
    <div id="lbDaftar" class="lb-daftar">${daftarHtml()}</div>
  </section>`, init(root) {
    const input = root.querySelector('#cariLomba'), bar = root.querySelector('#lbCari'), hapus = root.querySelector('.lb-cari__hapus');
    const perbarui = ({ chips = false } = {}) => {
      const daftar = root.querySelector('#lbDaftar');
      daftar.innerHTML = daftarHtml(); mountIcons(daftar); ikat(daftar);
      if (chips) { const c = root.querySelector('#lbChips'); c.innerHTML = chipsHtml(); mountIcons(c); ikatChips(); }
      hapus.hidden = !kueri;
      const n = daftar.querySelectorAll('.lb-row').length;
      root.querySelector('#lbHasil').textContent = kueri.trim() || kategori !== 'semua' ? `${n} lomba cocok` : '';
    };
    const bersihkan = () => { kueri = ''; kategori = 'semua'; input.value = ''; perbarui({ chips: true }); input.focus(); };
    const ikatChips = () => root.querySelectorAll('#lbChips [data-f]').forEach((b) => b.addEventListener('click', () => {
      kategori = b.dataset.f;
      root.querySelectorAll('#lbChips [data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      perbarui();
    }));
    const ikat = (el) => {
      el.querySelectorAll('[data-buka]').forEach((a) => a.addEventListener('click', () => { tandaiSumber(a.closest('.lb-row')?.querySelector('.lb-row__swatch')); state.dipilih = a.dataset.buka; simpan(); }));
      el.querySelectorAll('[data-pulih]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.pulih; state.deck = { ...state.deck, dilewati: state.deck.dilewati.filter((x) => x !== id), antrean: [id, ...state.deck.antrean.filter((x) => x !== id)] }; simpan();
        perbarui({ chips: true }); ctx.toast('Dikembalikan ke Radar');
      }));
      el.querySelectorAll('[data-bersihkan]').forEach((b) => b.addEventListener('click', bersihkan));
    };
    input.addEventListener('input', () => { kueri = input.value; perbarui(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); bersihkan(); } });
    hapus.addEventListener('click', (e) => { e.preventDefault(); bersihkan(); });
    ikat(root.querySelector('#lbDaftar')); ikatChips();

    /* menyusut begitu penanda di atas bar keluar dari area gulir */
    pergi();
    const gulir = root.closest('.views') || null, penanda = root.querySelector('.lb-cari__penanda');
    if (typeof IntersectionObserver === 'function' && penanda) {
      pengamat = new IntersectionObserver(([e]) => {
        const ringkas = !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 1;
        bar.classList.toggle('is-ringkas', ringkas);
        input.placeholder = ringkas ? 'Cari lomba' : 'Cari nama, penyelenggara, kategori';
      }, { root: gulir, threshold: 0 });
      pengamat.observe(penanda);
    }
  } };
}
