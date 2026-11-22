/* Competition detail: the poster, the facts, why it fits, and what to do next. */
import { state, simpan, cari, esc, HARI_INI, semuaLomba, batasSlot } from '../state.js';
import { PROFIL } from '../data/lomba.js';
import { skorCocok } from '../logic/cocok.js';
import { putuskan, lepasSlot } from '../logic/radar.js';
import { tambahHari, tanggalPanjang } from '../logic/peta.js';
import { posterHtml, sheetSlotPenuh, sisaLabel } from './poster.js';
import { karuselHtml, pasangKarusel } from './karusel.js';
import { labelBiaya, labelTingkat } from '../logic/label.js';
import { pasangParallax, tandaiSumber } from '../../shared/gerak.js';

let lepasParallax = () => {};
export function pergi() { lepasParallax(); lepasParallax = () => {}; }

export const note = 'Detail lomba: poster, info penting, alasan cocok dari profilmu, dan langkah berikutnya: jadikan Slot, simpan, atau latihan Sidang Juri.';

export function view(ctx) {
  const l = cari(state.dipilih) || cari('essay-unesa-2026'), d = state.deck, c = skorCocok(l, PROFIL);
  const diSlot = d.slot.includes(l.id), disimpan = d.tersimpan.includes(l.id);
  const biaya = labelBiaya(l.biaya);
  const tenggatTeks = Number.isFinite(l.hariLagi) ? tanggalPanjang(tambahHari(HARI_INI, l.hariLagi)) : 'belum tertulis';
  /* tata letak dari referensi travel: foto hero penuh, lembar bergrip menimpa hero, tiga petak info,
     "host row" jadi baris Ata, fasilitas jadi syarat 2 kolom, bilah aksi bawah yang menempel */
  return { html: `<section class="view lb-detail">
    <div class="lb-detail__grid">
      <div class="lb-detail__hero" id="lbHero">
        <div class="lb-detail__foto">${posterHtml(l, 'poster-art--big')}</div>
        <a class="lb-hero-btn lb-hero-btn--kiri" href="#radar" aria-label="Kembali ke Radar"><span data-icon="left"></span></a>
        ${diSlot ? '' : `<button type="button" class="lb-hero-btn lb-hero-btn--kanan${disimpan ? ' is-aktif' : ''}" id="simpanBtn" aria-pressed="${disimpan}" aria-label="${disimpan ? 'Sudah disimpan' : 'Simpan'}" ${disimpan ? 'disabled' : ''}><span data-icon="star"></span></button>`}
      </div>
      <div class="lb-detail__info lb-detail__lembar">
        <span class="lb-grip" aria-hidden="true"></span>
        <header><h1 class="wrap-any">${esc(l.nama)}</h1>
          <p class="lb-detail__meta"><span class="lb-detail__skor num">${c.skor}% cocok</span> · ${esc(l.cakupan)} · ${esc(labelTingkat(l.tingkat))}</p></header>
        ${l.nyata ? `<div class="banner lb-nyata"><span data-icon="shield"></span><span><strong>Info lomba nyata.</strong> Diambil dari poster asli (${esc(l.sumber)}). Ata belum membaca juknisnya: cek tanggal, biaya, dan syarat di sumber resmi sebelum mendaftar.</span></div>` : ''}
        ${l.simulasiLama ? '<div class="banner banner--warn"><span data-icon="alert"></span><span><strong>Ini data contoh dari simulasi lama, bukan isi postermu.</strong> Ata belum bisa membaca poster. Lepas Slot ini atau tambahkan ulang lombanya lewat isian manual.</span></div>'
          : l.perluCek ? '<div class="banner banner--warn"><span data-icon="alert"></span><span>Data ini kamu isi sendiri. Ata tidak membaca poster; cocokkan lagi tenggat, biaya, dan syarat dengan juknis resmi.</span></div>' : ''}
        <dl class="lb-petak">
          <div class="lb-petak__isi fx-rise" style="--i:0"><span class="lb-petak__ikon" data-icon="clock"></span><dt>Tenggat</dt><dd>${sisaLabel(l.hariLagi)}<span>${tenggatTeks}</span></dd></div>
          <div class="lb-petak__isi fx-rise" style="--i:1"><span class="lb-petak__ikon" data-icon="file"></span><dt>Biaya</dt><dd>${biaya}<span>${l.biaya === null || l.biaya === undefined ? 'belum tertulis' : 'pendaftaran'}</span></dd></div>
          <div class="lb-petak__isi fx-rise" style="--i:2"><span class="lb-petak__ikon" data-icon="trophy"></span><dt>Hadiah</dt><dd class="wrap-any">${esc(l.hadiah)}</dd></div>
        </dl>
        <div class="lb-ata fx-rise" style="--i:3"><img src="/prototype/assets/wink.svg" alt="" width="48" height="48"><div><strong>Kenapa Ata pilihkan ini</strong><span class="small muted">${esc(l.penyelenggara)}</span></div></div>
        <ul class="lb-why lb-why--lembar">${c.alasan.map((a) => `<li><span data-icon="check"></span>${esc(a)}</li>`).join('')}</ul>
        <section aria-labelledby="hSyarat"><h2 id="hSyarat" class="lb-sub">Syarat</h2>
          <ul class="lb-syarat">${l.syarat.map((s) => `<li><span data-icon="check"></span><span class="wrap-any">${esc(s)}</span></li>`).join('')}</ul></section>
        <a class="lb-sidang" href="https://claude.ai/artifact/RaCppZidoTdoUfVQQBuhzK" target="_blank" rel="noopener"><span class="lb-petak__ikon" data-icon="gavel"></span><span><strong>Latihan Sidang Juri</strong><span class="small muted">Hadapi panel juri sebelum hari H</span></span><span data-icon="right"></span></a>
        <p class="small muted">Sumber: ${l.simulasiLama ? 'simulasi lama (bukan data asli)' : l.unggahan ? (l.sumberUrl ? `isianmu · <a href="${esc(l.sumberUrl)}" target="_blank" rel="noopener noreferrer">${esc(new URL(l.sumberUrl).hostname)}</a>` : 'isianmu sendiri') : l.nyata ? esc(l.sumber) : 'akun penyelenggara (DATA DEMO)'}</p>
        ${karuselHtml({ aktifId: l.id, daftar: semuaLomba(), profil: PROFIL, skorCocok, posterHtml, esc })}
        <div class="lb-aksi-bawah">
          <div class="lb-aksi-bawah__harga"><strong class="num">${biaya}</strong><span class="small muted">${diSlot ? 'Sudah jadi Slot' : 'Biaya daftar'}</span></div>
          ${diSlot ? '<a class="btn btn--primary lb-aksi-bawah__cta" href="#peta"><span data-icon="route"></span>Buka Peta Jalan</a>' : `<button type="button" class="btn btn--primary lb-aksi-bawah__cta" id="jadiSlot"><span data-icon="flag"></span>Jadikan Slot <span class="num">(${d.slot.length}/${batasSlot()})</span></button>`}
        </div>
      </div>
    </div>
  </section>`, init(root) {
    const views = root.closest('.views');
    lepasParallax(); lepasParallax = pasangParallax(views, root.querySelector('.lb-detail__foto'));
    pasangKarusel(root, {
      onPilih(id, kartu) {
        /* kartu karusel "melebar" jadi hero detail berikutnya */
        root.querySelector('#lbHero')?.classList.add('vt-lepas');
        tandaiSumber(kartu?.querySelector('.poster-art'));
        state.dipilih = id;
        simpan();
        if (location.hash === '#lomba-detail') ctx.render();
        else location.hash = '#lomba-detail';
      },
    });
    root.querySelector('#simpanBtn')?.addEventListener('click', (e) => {
      e.currentTarget.classList.add('is-aktif', 'is-letup'); /* bintang meletup dulu, baru layar digambar ulang */
      setTimeout(() => { state.deck = putuskan(state.deck, l.id, 'simpan').state; simpan(); ctx.render(); ctx.toast('Disimpan'); }, 260);
    });
    root.querySelector('#jadiSlot')?.addEventListener('click', () => {
      const r = putuskan(state.deck, l.id, 'slot', { batas: batasSlot() });
      if (r.ditolak) return sheetSlotPenuh(ctx, state.deck.slot, cari, (id) => { state.deck = lepasSlot(state.deck, id); simpan(); ctx.render(); ctx.toast('Slot dilepas. Sekarang ada ruang untuk lomba baru.'); });
      state.deck = r.state; simpan(); ctx.render(); ctx.toast('Jadi Slot. Ata sudah menyiapkan usulan Peta Jalan.');
    });
  } };
}
