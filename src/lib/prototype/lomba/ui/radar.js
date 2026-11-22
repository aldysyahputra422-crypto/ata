/* Radar: today's matches as a card stack. Drag right = save, left = skip, up = make it a Slot.
   Buttons and arrow keys do the same. The last decision can be undone for 5 seconds. */
import { state, simpan, cari, semuaLomba, esc, batasSlot, HARI_INI } from '../state.js';
import { PROFIL, NAMA_KATEGORI } from '../data/lomba.js';
import { skorCocok } from '../logic/cocok.js';
import { putuskan, urungkan, lepasSlot } from '../logic/radar.js';
import { posterHtml, sheetSlotPenuh } from './poster.js';
import { chipHtml } from './chip.js';
import { labelBiaya } from '../logic/label.js';
import { mountIcons, reducedMotion } from '../../shared/ds.js';
import { tandaiSumber } from '../../shared/gerak.js';
import { temukanLomba, statusCari, simpanCari, putusCari } from '../../shared/akun.js';
import { buatLombaManual, KATEGORI_MANUAL, JENJANG_MANUAL } from '../logic/manual.js';

export const note = 'Radar: tumpukan kartu lomba yang cocok hari ini. Geser kanan untuk simpan, kiri lewati, atas jadikan Slot (atau pakai tombol dan panah keyboard). Keputusan terakhir bisa diurungkan 5 detik. Coba jadikan Slot dua kali untuk melihat penolakan Slot ke-4, dan "Tambah lomba" untuk memasukkan lomba sendiri (isian manual; OCR poster belum tersedia).';
let filter = 'semua', siap = false, onKey = null;
/* kueri "Temukan lomba baru": null = belum disentuh (pakai usulan dari profil). Begitu pengguna mengetik, nilainya
   disimpan di sini, sehingga gambar ulang layar (kartu siap, Slot berubah di tab lain, tarik-untuk-segarkan)
   memakai ketikan pengguna, bukan usulan awal. fokusKueri mengingat kursor agar ketikan tidak terputus. */
let kueri = null, fokusKueri = null;
const kueriAwal = () => (PROFIL.minat.length ? `lomba ${NAMA_KATEGORI[PROFIL.minat[0]]} ${PROFIL.tingkat}` : '');
export const nilaiKueri = () => kueri ?? kueriAwal();
export function pergi() { if (onKey) document.removeEventListener('keydown', onKey); onKey = null; }

const AKSI = { simpan: { label: 'Simpan', ikon: 'star', pesan: 'Disimpan' }, lewati: { label: 'Lewati', ikon: 'close', pesan: 'Dilewati' }, slot: { label: 'Jadikan Slot', ikon: 'flag', pesan: 'Jadi Slot' } };

export function view(ctx) {
  const d = state.deck, BATAS_SLOT = batasSlot(), penuh = d.slot.length >= BATAS_SLOT;
  const kategoriAda = [...new Set(d.antrean.map((id) => cari(id).kategori))];
  const antrean = d.antrean.filter((id) => filter === 'semua' || cari(id).kategori === filter);
  const jeda = penuh && !state.cariTambahan;
  const lama = typeof document === 'undefined' ? null : document.activeElement;
  fokusKueri = lama && lama.id === 'qTemukan' ? [lama.selectionStart, lama.selectionEnd] : null;
  const sapa = d.antrean.length ? `Ata nemu ${d.antrean.length} lomba buat kamu hari ini.` : 'Hari ini belum ada yang cocok. Aku tetap pantau besok.';
  return { html: `<section class="view lb-radar">
    <header class="lb-head"><div><p class="eyebrow">Radar Lomba · ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>${esc(sapa)}</h1></div>
      <div class="lb-head__actions"><a class="btn" href="#tersimpan"><span data-icon="history"></span>Tersimpan <span class="pill num">${d.tersimpan.length}</span></a>
      <button type="button" class="btn" id="unggah"><span data-icon="plus"></span>Tambah lomba</button></div></header>
    ${jeda ? `<div class="banner banner--warn lb-pause"><span data-icon="pause"></span><div><strong>Kamu lagi fokus di ${BATAS_SLOT} lomba. Radar istirahat dulu.</strong><p class="small">Slot penuh, jadi Ata tidak menyodorkan lomba baru. Kamu tetap bisa melihat-lihat.</p>
      <div class="btn-row"><button type="button" class="btn" id="tambahan">Cari lomba tambahan</button><a class="btn btn--ghost" href="#slot">Lihat Slot</a></div></div></div>` : `
    <div class="scroller"><div class="lb-filter" role="group" aria-label="Filter kategori">
      ${chipHtml({ nilai: 'semua', label: 'Semua', aktif: filter === 'semua' })}
      ${Object.keys(NAMA_KATEGORI).filter((k) => kategoriAda.includes(k) || k === filter).map((k) => chipHtml({ nilai: k, label: NAMA_KATEGORI[k], aktif: filter === k })).join('')}
    </div></div>
    <div class="lb-deck-wrap">${!siap ? '<div class="lb-deck"><div class="skeleton lb-skel"></div></div>' : deckHtml(antrean)}</div>
    ${antrean.length && siap ? `<div class="lb-actions" role="group" aria-label="Keputusan kartu teratas">
      <button type="button" class="lb-act lb-act--skip" data-aksi="lewati" aria-label="Lewati"><span data-icon="close"></span></button>
      <button type="button" class="lb-act lb-act--slot" data-aksi="slot" aria-label="Jadikan Slot, ${d.slot.length} dari ${BATAS_SLOT} terpakai"><span data-icon="flag"></span><span class="lb-act__label">Slot <b class="num">${d.slot.length}/${BATAS_SLOT}</b></span></button>
      <button type="button" class="lb-act lb-act--save" data-aksi="simpan" aria-label="Simpan"><span data-icon="star"></span></button>
    </div><p class="lb-hint small muted">Geser kartu, atau tekan <kbd aria-label="panah kiri" data-icon="left"></kbd> lewati, <kbd aria-label="panah kanan" data-icon="right"></kbd> simpan, <kbd aria-label="panah atas" data-icon="up"></kbd> jadikan Slot</p>` : ''}`}
    <section class="card lb-temukan" aria-labelledby="judulTemukan">
      <h2 id="judulTemukan">Temukan lomba baru</h2>
      <p class="small">Dengan <strong>API key pencarian milikmu</strong> (Tavily atau Brave), Ata mencari halaman lomba publik secara otomatis. Tanpa key, Ata menyusun kata kunci yang bisa kamu buka sendiri di mesin pencari. Ata tidak memakai key pencarian miliknya sendiri. Hasilnya <strong>kandidat yang belum terverifikasi</strong>: buka sumbernya dan cek juknis sebelum ikut.</p>
      <p class="small" id="statusCari" aria-live="polite">Memeriksa key pencarian…</p>
      <form class="lb-temukan__form" id="formTemukan">
        <label class="sr-only" for="qTemukan">Kata kunci lomba</label>
        <input class="input" id="qTemukan" placeholder="mis. lomba esai SMA, business plan" value="${esc(nilaiKueri())}" minlength="3" required>
        <button type="submit" class="btn" id="tombolTemukan"><span data-icon="search"></span>Cari</button>
      </form>
      <div id="hasilTemukan" aria-live="polite"></div>
    </section>
  </section>`, init(root) {
    const formT = root.querySelector('#formTemukan'), elKueri = root.querySelector('#qTemukan');
    elKueri?.addEventListener('input', () => { kueri = elKueri.value; });
    if (elKueri && fokusKueri) { elKueri.focus({ preventScroll: true }); try { elKueri.setSelectionRange(...fokusKueri); } catch (e) { /* abaikan */ } }
    fokusKueri = null;
    formT?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = root.querySelector('#hasilTemukan'), btn = root.querySelector('#tombolTemukan');
      btn.disabled = true; out.innerHTML = '<p class="small muted">Mencari…</p>';
      const r = await temukanLomba(root.querySelector('#qTemukan').value);
      btn.disabled = false;
      if (!r.ok) { out.innerHTML = `<div class="banner"><span data-icon="alert"></span><p>${esc(r.galat.pesan)}</p></div>`; mountIcons(out); return; }
      if (r.data.mode === 'B') {
        out.innerHTML = `<div class="banner"><span data-icon="search"></span><div><strong>Mode tanpa key pencarian</strong><p class="small">Ata tidak menjalankan pencarian. Buka kata kunci ini di mesin pencari, lalu tambahkan lomba yang kamu temukan lewat "Tambah lomba" (isi manual atau tempel tautannya).</p></div></div>
          <ul class="lb-temukan__daftar">${r.data.kueri.map((k) => `<li><a href="${esc(k.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(k.teks)}</strong></a><span class="small muted">Buka di mesin pencari</span></li>`).join('')}</ul>`;
        mountIcons(out); return;
      }
      const h = r.data.hasil;
      const waktu = new Date(r.data.diperiksa * 1000).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const ALASAN = { 'judul-umum': 'judul terlalu umum', 'halaman-daftar': 'halaman daftar/kategori', 'artikel-panduan': 'artikel panduan', 'bukan-lomba': 'bukan halaman lomba' };
      const JENIS = { resmi: 'Situs resmi', 'portal-info-lomba': 'Portal info lomba', 'media-sosial': 'Media sosial', lainnya: 'Situs lain' };
      const buang = Object.entries(r.data.disaring || {});
      const catatanSaring = buang.length ? ` · ${buang.reduce((a, [, n]) => a + n, 0)} disaring (${buang.map(([k, n]) => `${n} ${ALASAN[k] || k}`).join(', ')})` : '';
      out.innerHTML = h.length ? `<p class="small muted">${h.length} kandidat${esc(catatanSaring)} · diperiksa ${esc(waktu)}${r.data.dariCache ? ' (cache)' : ''} · lewat ${esc(r.data.penyedia)}</p>
        <ul class="lb-temukan__daftar">${h.map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.judul)}</strong></a>
          <span class="small muted"><span class="lb-temukan__jenis lb-temukan__jenis--${esc(x.jenisSumber || 'lainnya')}">${esc(JENIS[x.jenisSumber] || 'Situs lain')}</span> ${esc(x.domain)}</span>${x.cuplikan ? `<span class="small">${esc(x.cuplikan)}</span>` : ''}
          <span class="lb-temukan__status">Belum terverifikasi · tenggat & syarat: perlu verifikasi</span>
          <button type="button" class="btn btn--ghost" data-tambah-url="${esc(x.url)}" data-tambah-nama="${esc(x.judul)}">Tambahkan ke Radar</button></li>`).join('')}</ul>`
        : `<p class="small muted">Tidak ada kandidat yang lolos saringan${esc(catatanSaring)}. Coba kata kunci yang lebih spesifik, mis. nama lomba atau penyelenggara.</p>`;
      out.querySelectorAll('[data-tambah-url]').forEach((b) => b.addEventListener('click', () => tambahSheet(ctx, { url: b.dataset.tambahUrl, nama: b.dataset.tambahNama })));
    });
    const elCari = root.querySelector('#statusCari');
    const tampilCari = (st) => {
      if (!elCari) return;
      elCari.innerHTML = st && st.terhubung
        ? `Key pencarian milikmu tersambung (${esc(st.jenis === 'brave' ? 'Brave Search' : 'Tavily')}). Biaya pencarian ditagih ke akunmu di penyedia itu. <button type="button" class="btn btn--ghost" id="putusCari">Putuskan</button>`
        : `Belum ada key pencarian. <button type="button" class="btn" id="hubungCari">Hubungkan key pencarian milikmu</button>`;
      elCari.querySelector('#putusCari')?.addEventListener('click', async () => { const r = await putusCari(); tampilCari(r.ok ? r.data : null); });
      elCari.querySelector('#hubungCari')?.addEventListener('click', () => cariSheet(ctx, tampilCari));
    };
    if (elCari) statusCari().then((r) => tampilCari(r.ok ? r.data : null));
    if (!siap) setTimeout(() => { siap = true; ctx.render(); }, reducedMotion() ? 0 : 700);
    root.querySelector('#unggah').addEventListener('click', () => tambahSheet(ctx));
    root.querySelector('#tambahan')?.addEventListener('click', () => { state.cariTambahan = true; simpan(); ctx.render(); });
    root.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; ctx.render(); }));
    if (!siap || jeda || !antrean.length) return;
    const top = root.querySelector('.lb-card.is-top'), id = antrean[0];
    let sibuk = false;
    const putus = (aksi, arah) => {
      if (sibuk) return;
      const r = putuskan(state.deck, id, aksi, { batas: batasSlot() });
      if (r.ditolak) {
        if (top) { top.style.transform = ''; top.classList.remove('is-drag'); }
        return sheetSlotPenuh(ctx, state.deck.slot, cari, (lepasId) => { state.deck = lepasSlot(state.deck, lepasId); simpan(); ctx.render(); ctx.toast('Slot dilepas. Sekarang ada ruang untuk lomba baru.'); });
      }
      sibuk = true;
      const go = () => { state.deck = r.state; simpan(); ctx.render(); ctx.toast(`${AKSI[aksi].pesan}: ${cari(id).nama}`, { label: 'Urungkan', run: () => { state.deck = urungkan(state.deck); simpan(); ctx.render(); } }); };
      if (top && !reducedMotion()) { top.classList.add('is-gone'); top.style.transform = { kanan: 'translate(140%,-6%) rotate(18deg)', kiri: 'translate(-140%,-6%) rotate(-18deg)', atas: 'translate(0,-130%) rotate(-4deg)' }[arah]; setTimeout(go, 260); } else go();
    };
    root.querySelectorAll('[data-aksi]').forEach((b) => b.addEventListener('click', () => { const a = b.dataset.aksi; putus(a, a === 'simpan' ? 'kanan' : a === 'lewati' ? 'kiri' : 'atas'); }));
    pergi(); onKey = (e) => {
      /* only when nothing else wants the arrows: focus on the page itself, the top card, or the action buttons */
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
      const f = document.activeElement;
      if (f && f !== document.body && !f.closest('.lb-card.is-top, .lb-actions')) return;
      const m = { ArrowRight: ['simpan', 'kanan'], ArrowLeft: ['lewati', 'kiri'], ArrowUp: ['slot', 'atas'] }[e.key];
      if (m) { e.preventDefault(); putus(...m); }
    };
    document.addEventListener('keydown', onKey);
    drag(top, putus, () => { tandaiSumber(top.querySelector('.poster-art')); state.dipilih = id; simpan(); location.hash = 'lomba-detail'; });
  } };
}

function deckHtml(antrean) {
  if (!antrean.length) {
    const habis = !state.deck.antrean.length;
    return `<div class="empty"><img src="/prototype/assets/tidur.svg" alt="Ata tidur"><h2>${habis ? 'Hari ini sudah semua' : 'Belum ada lomba di kategori ini'}</h2>
      <p>${habis ? 'Besok pagi Ata cari lagi. Lomba yang kamu simpan ada di Tersimpan.' : 'Coba kategori lain, atau unggah poster lomba yang kamu temukan sendiri.'}</p>
      <a class="btn" href="#tersimpan"><span data-icon="history"></span>Lihat Tersimpan</a></div>`;
  }
  return `<div class="lb-deck">${antrean.slice(0, 3).map((id, i) => card(cari(id), i)).reverse().join('')}</div>`;
}

function card(l, i) {
  const c = skorCocok(l, PROFIL);
  return `<article class="lb-card${i === 0 ? ' is-top' : ''}" style="--i:${i}" ${i === 0 ? 'tabindex="0" aria-label="' + esc(l.nama) + ', cocok ' + c.skor + ' persen. Tekan Enter untuk detail."' : 'aria-hidden="true"'}>
    ${posterHtml(l)}
    <div class="lb-card__body">
      <div class="lb-match"><span class="lb-match__num num">${c.skor}%</span><span class="small muted">cocok untukmu</span></div>
      <ul class="lb-why">${c.alasan.map((a) => `<li><span data-icon="check"></span>${esc(a)}</li>`).join('')}</ul>
      <p class="small muted lb-meta">${[l.cakupan, l.biaya === null || l.biaya === undefined ? 'Biaya: cek juknis' : labelBiaya(l.biaya), l.hadiah].filter((x, i, a) => x && x !== 'Cek juknis' && a.indexOf(x) === i).map(esc).join(' · ')}</p>
    </div>
    <span class="lb-tag lb-tag--save" aria-hidden="true">SIMPAN</span><span class="lb-tag lb-tag--skip" aria-hidden="true">LEWATI</span><span class="lb-tag lb-tag--slot" aria-hidden="true">JADIKAN SLOT</span>
  </article>`;
}

/* pointer drag on the top card; a tap (no movement) opens the detail */
function drag(el, putus, buka) {
  if (!el) return;
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') buka(); });
  /* seret bawaan browser (gambar/tautan/teks terpilih) memicu pointercancel dan membatalkan geser kartu */
  el.addEventListener('dragstart', (e) => e.preventDefault());
  let s = null;
  el.addEventListener('pointerdown', (e) => { s = { x: e.clientX, y: e.clientY, moved: false }; el.setPointerCapture(e.pointerId); el.classList.add('is-drag'); });
  el.addEventListener('pointermove', (e) => {
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) s.moved = true;
    el.style.transform = `translate(${dx}px,${Math.min(dy, 40)}px) rotate(${dx / 18}deg)`;
    el.dataset.arah = dy < -70 && Math.abs(dy) > Math.abs(dx) ? 'atas' : dx > 50 ? 'kanan' : dx < -50 ? 'kiri' : '';
  });
  const up = (e) => {
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y, moved = s.moved; s = null; el.classList.remove('is-drag'); el.dataset.arah = '';
    if (!moved) { el.style.transform = ''; return buka(); }
    if (dy < -110 && Math.abs(dy) > Math.abs(dx)) return putus('slot', 'atas');
    if (dx > 110) return putus('simpan', 'kanan');
    if (dx < -110) return putus('lewati', 'kiri');
    el.style.transform = '';
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', () => { s = null; el.classList.remove('is-drag'); el.style.transform = ''; });
}

function cariSheet(ctx, selesai) {
  ctx.sheet(`<h2>Hubungkan key pencarian milikmu</h2>
    <p class="small">Key dikirim sekali ke server lokal Ata dan hanya disimpan di memorinya (hilang saat server mati atau kamu putuskan). Key tidak disimpan di browser dan tidak dikirim balik. Biaya pencarian ditagih penyedia ke akunmu.</p>
    <div class="field"><label for="jenisCari">Penyedia</label>
      <select class="input" id="jenisCari"><option value="tavily">Tavily (ada tier gratis tanpa kartu)</option><option value="brave">Brave Search API</option></select></div>
    <div class="field"><label for="kunciCari">API key</label>
      <input class="input" id="kunciCari" type="password" autocomplete="off" spellcheck="false" aria-describedby="galatCari">
      <span class="galat" id="galatCari" role="alert" hidden></span></div>
    <button type="button" class="btn btn--primary btn--block" id="simpanCari">Simpan untuk sesi ini</button>`, (sheet, close) => {
    const galat = sheet.querySelector('#galatCari');
    sheet.querySelector('#simpanCari').addEventListener('click', async () => {
      const input = sheet.querySelector('#kunciCari');
      const r = await simpanCari(sheet.querySelector('#jenisCari').value, input.value);
      input.value = '';
      if (!r.ok) { galat.hidden = false; galat.textContent = r.galat.pesan; return; }
      close(); selesai(r.data); ctx.toast('Key pencarian tersambung untuk sesi ini.');
    });
  });
}

/* Tambah lomba sendiri. Ata TIDAK membaca poster (OCR belum tersedia): pengguna mengisi data dari poster/juknis/URL.
   Gambar poster hanya ditampilkan sebagai acuan saat mengisi, tidak dikirim ke mana pun dan tidak disimpan. */
function tambahSheet(ctx, awal = {}) {
  const pilih = (daftar, label, nilai) => daftar.map((k) => `<option value="${esc(k)}" ${k === nilai ? 'selected' : ''}>${esc(label(k))}</option>`).join('');
  ctx.sheet(`<h2>Tambah lomba</h2>
    <div class="banner banner--warn" role="status"><span data-icon="alert"></span><span><strong>Membaca poster otomatis (OCR) belum tersedia.</strong> Isi data dari poster, juknis, atau situs resminya. Ata tidak menebak isian yang kosong.</span></div>
    <form id="formManual" class="lb-manual" novalidate>
      <div class="field"><label for="mUrl">Tautan resmi (opsional)</label><input class="input" id="mUrl" name="url" inputmode="url" placeholder="https://…" value="${esc(awal.url || '')}" aria-describedby="gUrl"><span class="galat" id="gUrl" hidden></span></div>
      <div class="field"><label for="mNama">Nama lomba</label><input class="input" id="mNama" name="nama" required value="${esc(awal.nama || '')}" aria-describedby="gNama"><span class="galat" id="gNama" hidden></span></div>
      <div class="field"><label for="mPenyelenggara">Penyelenggara</label><input class="input" id="mPenyelenggara" name="penyelenggara"></div>
      <div class="field"><label for="mKategori">Kategori</label><select class="input" id="mKategori" name="kategori" aria-describedby="gKategori"><option value="">Pilih…</option>${pilih(KATEGORI_MANUAL, (k) => NAMA_KATEGORI[k] || k, '')}</select><span class="galat" id="gKategori" hidden></span></div>
      <div class="field"><label for="mJenjang">Untuk jenjang</label><select class="input" id="mJenjang" name="jenjang"><option value="">Belum tahu</option>${pilih(JENJANG_MANUAL, (k) => k, '')}</select></div>
      <div class="field"><label for="mTenggat">Tenggat pendaftaran</label><input class="input" id="mTenggat" name="tenggatIso" type="date" aria-describedby="gTenggat"><span class="galat" id="gTenggat" hidden></span></div>
      <div class="field"><label for="mBiaya">Biaya daftar (Rp, kosongkan bila belum tahu)</label><input class="input" id="mBiaya" name="biaya" inputmode="numeric" aria-describedby="gBiaya"><span class="galat" id="gBiaya" hidden></span></div>
      <div class="field"><label for="mHadiah">Hadiah</label><input class="input" id="mHadiah" name="hadiah"></div>
      <label class="btn btn--ghost btn--block" for="posterAcuan"><span data-icon="image"></span>Lihat poster sebagai acuan (tidak dibaca)</label>
      <input type="file" id="posterAcuan" accept="image/jpeg,image/png,image/webp" class="sr-only">
      <div id="posterPratinjau"></div>
      <button type="submit" class="btn btn--primary btn--block">Simpan ke Radar</button>
    </form>`, (sheet, close) => {
    let urlPratinjau = null;
    sheet.querySelector('#posterAcuan').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (urlPratinjau) URL.revokeObjectURL(urlPratinjau);
      urlPratinjau = URL.createObjectURL(f);
      sheet.querySelector('#posterPratinjau').innerHTML = `<img class="lb-manual__poster" src="${urlPratinjau}" alt="Poster yang kamu pilih, hanya untuk acuan mengisi">`;
    });
    sheet.querySelector('#formManual').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const r = buatLombaManual(data, { id: 'manual-' + Date.now().toString(36), hariIniIso: HARI_INI });
      for (const [k, el] of [['url', 'gUrl'], ['nama', 'gNama'], ['kategori', 'gKategori'], ['tenggatIso', 'gTenggat'], ['biaya', 'gBiaya']]) {
        const g = sheet.querySelector('#' + el), pesan = r.ok ? '' : r.galat[k] || '';
        g.hidden = !pesan; g.textContent = pesan;
      }
      if (!r.ok) { sheet.querySelector('[aria-describedby] ~ .galat:not([hidden])')?.previousElementSibling?.focus(); return; }
      if (urlPratinjau) URL.revokeObjectURL(urlPratinjau);
      state.unggahan.push(r.lomba);
      state.deck = { ...state.deck, antrean: [r.lomba.id, ...state.deck.antrean] }; simpan();
      close(); ctx.render(); ctx.toast('Lomba ditambahkan dari isianmu. Ada di kartu teratas.');
    });
  });
}
