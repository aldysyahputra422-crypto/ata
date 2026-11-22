/* Slots: the plan's active competitions (Gratis 1, Pro 3) as frosted folders with progress; an empty slot invites to the Radar. */
import { state, simpan, cari, esc, petaUntuk, batasSlot, namaPaket } from '../state.js';
import { lepasSlot } from '../logic/radar.js';
import { progres } from '../logic/peta.js';
import { sisaLabel } from './poster.js';
import { pasangCondong, transisiTampilan } from '../../shared/gerak.js';
import { mountIcons } from '../../shared/ds.js';
import { tanggalPanjang } from '../logic/peta.js';
import { labelBiaya } from '../logic/label.js';
import { isiKertas, kertasHtml } from '../../shared/folder.js';

export const note = 'Slot: klik folder untuk membukanya. Folder melebar jadi panel berisi progres dan tiga langkah terdekat, lalu kembali ke tempatnya saat ditutup. Tunjuk folder dengan mouse untuk melihatnya condong dan isinya mengipas. Jumlah lomba aktif mengikuti paket (Gratis 1, Pro 3), ditampilkan sebagai folder (poster di panel belakang, tutup kaca, garis progres Peta Jalan). Slot kosong mengajak ke Radar. Lepas Slot selalu meminta konfirmasi.';

const ring = (p) => `<div class="ring ring--sm" role="img" aria-label="Progres ${p} persen"><svg viewBox="0 0 76 76"><circle class="ring__track" cx="38" cy="38" r="31" fill="none" stroke-width="9"/><circle class="ring__bar" cx="38" cy="38" r="31" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(p / 100) * 194.8} 194.8"/></svg><b class="num">${p}%</b></div>`;

export function view(ctx) {
  const ids = state.deck.slot, BATAS_SLOT = batasSlot(), kosong = Math.max(0, BATAS_SLOT - ids.length);
  return { html: `<section class="view">
    <header><p class="eyebrow">Fokus</p><h1>Slot kamu</h1><p class="lede">${ids.length} dari ${BATAS_SLOT} Slot terpakai. Paket ${namaPaket()} mencakup ${BATAS_SLOT} Slot aktif.</p></header>
    <div class="lb-folders">${ids.map((id) => { const l = cari(id), p = progres(petaUntuk(id).langkah); return `<article class="lb-folder">
      <a class="folder__box folder-ata" href="#peta" data-buka="${id}" aria-haspopup="dialog"
        aria-label="Buka folder ${esc(l.nama)}: ${esc(sisaLabel(l.hariLagi))}, ${p.selesai} dari ${p.total} langkah">
        <span class="folder-ata__belakang"${l.gambar ? ` style="background-image:url('/prototype/${esc(l.gambar)}')"` : ''}></span>
        ${kertasHtml(isiKertas(petaUntuk(id).langkah, petaUntuk(id).disetujui))}
        <span class="folder-ata__depan">
          <span class="folder-ata__teks"><strong>${esc(l.nama)}</strong>
            <span class="folder-ata__meta">${esc(sisaLabel(l.hariLagi))} · ${p.selesai}/${p.total} langkah</span></span>
          <span class="folder-ata__aksi" aria-hidden="true"><span data-icon="route"></span></span>
        </span>
        <span class="folder-ata__progres" style="--p:${p.persen}%" aria-hidden="true"></span>
      </a>
      <button type="button" class="btn btn--ghost" data-lepas="${id}">Lepas Slot</button></article>`; }).join('')}
      ${Array.from({ length: kosong }, () => `<article class="lb-folder lb-folder--empty"><a class="folder__box folder-ata folder-ata--kosong" href="#radar">
        <span class="folder-ata__belakang"></span>
        <span class="folder-ata__depan"><span class="folder-ata__teks"><strong>Slot kosong</strong><span class="folder-ata__meta">Pilih dari Radar</span></span>
        <span class="folder-ata__aksi folder-ata__aksi--tambah" aria-hidden="true"><span data-icon="plus"></span></span></span></a></article>`).join('')}
    </div>
  </section>`, init(root) {
    root.querySelectorAll('.lb-folder:not(.lb-folder--empty) .folder__box').forEach((f) => pasangCondong(f, { maks: 7 }));
    root.querySelectorAll('[data-buka]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); bukaFolder(a, a.dataset.buka, ctx); }));
    root.querySelectorAll('[data-lepas]').forEach((b) => b.addEventListener('click', () => {
      const l = cari(b.dataset.lepas);
      ctx.sheet(`<h2>Lepas ${esc(l.nama)}?</h2><p>Progres Peta Jalannya tetap tersimpan kalau kamu ambil lagi nanti.</p>
        <div class="btn-row"><button type="button" class="btn" id="batal">Batal</button><button type="button" class="btn btn--primary" id="ya">Lepas Slot</button></div>`, (sheet, close) => {
        sheet.querySelector('#batal').addEventListener('click', close);
        sheet.querySelector('#ya').addEventListener('click', () => { close(); state.deck = lepasSlot(state.deck, l.id); simpan(); ctx.render(); ctx.toast('Slot dilepas'); });
      });
    }));
  } };
}

/* ---------- folder terbuka: folder yang sama melebar jadi panel (shared element), lalu kembali saat ditutup ---------- */
const NAMA_VT = 'folder-buka';

function panelHtml(l, pj) {
  const p = progres(pj.langkah), berikut = pj.langkah.filter((s) => !s.selesai).slice(0, 3);
  return `<div class="folder-buka" role="dialog" aria-modal="true" aria-labelledby="judulFolder">
    <div class="folder-buka__tirai" data-tutup></div>
    <section class="folder-panel m-kaca-tebal" style="view-transition-name:${NAMA_VT}">
      <header class="folder-panel__kepala">
        ${l.gambar ? `<img class="folder-panel__sampul" src="/prototype/${esc(l.gambar)}" alt="" width="72" height="90">` : `<span class="folder-panel__sampul g-${l.gem}" aria-hidden="true"></span>`}
        <div><p class="eyebrow">Slot · ${esc(sisaLabel(l.hariLagi))}</p><h2 id="judulFolder" class="wrap-any">${esc(l.nama)}</h2>
          <p class="small muted">${esc(l.penyelenggara.replace(' (DATA DEMO)', ''))} · ${esc(labelBiaya(l.biaya))}</p></div>
        <button type="button" class="ikon-bundar folder-panel__tutup" data-tutup aria-label="Tutup folder"><span data-icon="close"></span></button>
      </header>
      <div class="folder-panel__isi">
        <div class="folder-panel__progres fx-urut" style="--u:0">${ring(p.persen)}<div><strong class="num">${p.selesai} dari ${p.total} langkah</strong>
          <span class="small muted">${pj.disetujui ? 'Peta Jalan disetujui' : 'Masih usulan. Setujui dulu supaya langkahnya bisa dicentang.'}</span></div></div>
        <h3 class="lb-sub fx-urut" style="--u:1">${berikut.length ? 'Langkah terdekat' : 'Semua langkah selesai'}</h3>
        ${berikut.length ? `<ol class="folder-panel__langkah">${berikut.map((s, i) => `<li class="fx-urut" style="--u:${2 + i}"><span class="lb-step__num num">${pj.langkah.indexOf(s) + 1}</span>
          <span><strong class="wrap-any">${esc(s.nama)}</strong><span class="small muted">${esc(tanggalPanjang(s.tanggal))}</span></span></li>`).join('')}</ol>` : ''}
        <div class="btn-row fx-urut" style="--u:${2 + berikut.length}">
          <a class="btn btn--primary" href="#peta" data-ke-peta><span data-icon="route"></span>Buka Peta Jalan</a>
          <a class="btn" href="#lomba-detail" data-ke-detail><span data-icon="file"></span>Detail lomba</a>
        </div>
      </div>
    </section>
  </div>`;
}

function bukaFolder(box, id, ctx) {
  const ov = document.getElementById('overlay'), l = cari(id), pj = petaUntuk(id);
  state.dipilih = id; simpan();
  /* panel, tutup, dan esc_ dideklarasikan SEBELUM transisi: tanpa animasi (gerak dikurangi, atau browser tanpa
     View Transitions) transisiTampilan menjalankan callback-nya saat itu juga, dan pasang() memakai ketiganya */
  const panel = () => ov.querySelector('.folder-buka');
  const tutup = (lanjut) => {
    const p = panel(); if (!p) return;
    document.removeEventListener('keydown', esc_);
    transisiTampilan(() => {
      ov.innerHTML = '';
      box.closest('.lb-folder')?.classList.remove('is-terbuka');
      box.style.viewTransitionName = NAMA_VT; /* panel kembali menyusut ke folder asalnya */
      if (!lanjut) box.focus({ preventScroll: true }); /* folder sudah terlihat lagi: fokus bisa kembali */
    }, 'folder-tutup')?.finished.catch(() => {}).finally(() => { box.style.viewTransitionName = ''; });
    if (!document.startViewTransition) box.style.viewTransitionName = '';
    if (lanjut) location.hash = lanjut;
  };
  const esc_ = (e) => { if (e.key === 'Escape') tutup(); };
  document.addEventListener('keydown', esc_);
  box.style.viewTransitionName = NAMA_VT; /* keadaan lama: folder ini; keadaan baru: panel dengan nama yang sama */
  transisiTampilan(() => {
    box.style.viewTransitionName = '';
    box.closest('.lb-folder').classList.add('is-terbuka');
    ov.innerHTML = panelHtml(l, pj);
    mountIcons(ov);
    pasang(); /* perilaku dipasang bersamaan dengan panel dibuat: tidak ada jeda tanpa handler */
  }, 'folder');
  function pasang() {
    const p = panel();
    if (!p) return;
    p.querySelectorAll('[data-tutup]').forEach((b) => b.addEventListener('click', () => tutup()));
    p.querySelector('[data-ke-peta]').addEventListener('click', (e) => { e.preventDefault(); tutup('peta'); });
    p.querySelector('[data-ke-detail]').addEventListener('click', (e) => { e.preventDefault(); tutup('lomba-detail'); });
    p.querySelector('.folder-panel__tutup').focus({ preventScroll: true });
    p.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...p.querySelectorAll('button, a[href]')];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    });
  }
}

export function pergi() { const ov = document.getElementById('overlay'); if (ov?.querySelector('.folder-buka')) ov.innerHTML = ''; }
