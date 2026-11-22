/* Peta Jalan: Ata proposes steps up to H-2, the student approves or edits them, and progress lights the path
   through the 3D maze (rendered from the provided labyrinth model in two layers; the path sits between them). */
import { state, simpan, cari, esc, petaUntuk, HARI_INI, segarkanHari } from '../state.js';
import { chipHtml, GAYA_KATEGORI } from './chip.js';
import { progres, validasiTanggal, posisiLangkah, tambahHari, tanggalPanjang } from '../logic/peta.js';
import { MAZE } from '../data/maze.js';
import { sisaLabel } from './poster.js';
import { reducedMotion } from '../../shared/ds.js';

export const note = 'Peta Jalan: Ata mengusulkan langkah sampai H-2 sebelum tenggat. Setujui atau sunting dulu. Centang langkah untuk menyalakan jalur di labirin 3D; maskot ikut pindah. Coba sunting tanggal melewati tenggat, atau buka Slot yang tenggatnya paling dekat untuk melihat langkah yang dipadatkan.';
let ro = null;
export function pergi() { if (ro) ro.disconnect(); ro = null; }

/* a point along the maze path at fraction f (0..1), interpolated between exported cells */
function titik(path, f) {
  const x = f * (path.length - 1), i = Math.min(path.length - 2, Math.floor(x)), t = x - i, a = path[i], b = path[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2]];
}
const potong = (path, f) => { const n = Math.max(1, Math.round(f * (path.length - 1))); return path.slice(0, n + 1); };
const pts = (list) => list.map((p) => `${(p[0] * 100).toFixed(2)},${(p[1] * 100).toFixed(2)}`).join(' ');

export function view(ctx) {
  const ids = state.deck.slot;
  if (!ids.length) return { html: `<section class="view"><header><p class="eyebrow">Peta Jalan</p><h1>Belum ada Slot</h1></header>
    <div class="empty"><img src="/prototype/assets/tidur.svg" alt="Ata tidur"><p>Peta Jalan dibuat untuk lomba yang kamu jadikan Slot. Pilih satu dari Radar dulu.</p><a class="btn btn--primary" href="#radar">Buka Radar</a></div></section>` };
  const id = ids.includes(state.dipilih) ? state.dipilih : ids[0], l = cari(id), pj = petaUntuk(id), p = progres(pj.langkah);
  /* tenggat belum tertulis (lomba nyata): batas akhir langkah = langkah terakhir usulan, ditandai perkiraan */
  const tenggatPasti = Number.isFinite(l.hariLagi);
  const tenggat = tenggatPasti ? tambahHari(HARI_INI, l.hariLagi) : (pj.langkah.at(-1)?.tanggal || tambahHari(HARI_INI, 30)), n = pj.langkah.length;
  const aktif = pj.langkah.findIndex((s) => !s.selesai);
  return { html: `<section class="view lb-peta">
    <a class="back" href="#slot"><span data-icon="left"></span>Slot</a>
    <header class="lb-peta__head"><div><p class="eyebrow">Peta Jalan · ${tenggatPasti ? `tenggat ${tanggalPanjang(tenggat)} · ${sisaLabel(l.hariLagi)}` : 'tenggat belum tertulis, cek juknis'}</p><h1 class="wrap-any">${esc(l.nama)}</h1></div>
      ${ids.length > 1 ? `<div class="lb-filter" role="group" aria-label="Pilih Slot">${ids.map((s) => { const ls = cari(s); return chipHtml({ nilai: s, label: ls.nama, aktif: s === id, attr: 'pilih', gem: ls.gem, ikon: GAYA_KATEGORI[ls.kategori]?.ikon }); }).join('')}</div>` : ''}</header>
    ${pj.peringatan ? `<div class="banner banner--warn"><span data-icon="clock"></span><span>${esc(pj.peringatan)}</span></div>` : ''}
    ${pj.disetujui ? '' : `<div class="card lb-usul"><div class="lb-usul__top"><img src="/prototype/assets/melambai.svg" alt="" width="56" height="56"><div><h2>Usulan Ata: ${n} langkah</h2>
      <p class="small muted">${tenggatPasti ? `Dibagi rata sampai ${tanggalPanjang(tambahHari(HARI_INI, Math.max(0, l.hariLagi - 2)))}, dua hari sebelum tenggat, supaya ada waktu cadangan.` : 'Tanggalnya perkiraan karena tenggat belum tertulis di poster.'}</p></div></div>
      <div class="btn-row"><button type="button" class="btn btn--primary" id="setujui"><span data-icon="check"></span>Setujui</button><button type="button" class="btn" id="sunting"><span data-icon="pen"></span>Sunting dulu</button></div></div>`}
    <div class="lb-maze" id="mazeStage">
      <div class="lb-maze__scene" id="mazeScene">
        <div class="lb-maze__layer lb-maze__bg"></div>
        <svg class="lb-maze__path" id="mazePath" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="lb-maze__layer lb-maze__fg"></div>
        <div id="mazeDots" aria-hidden="true"></div>
        <img class="lb-maze__buddy" id="mazeBuddy" src="/prototype/assets/${p.selesai === n ? 'jempol' : 'lompat'}.svg" alt="">
      </div>
      <p class="lb-maze__cap small" aria-live="polite">${p.selesai === n ? 'Semua langkah selesai. Tinggal kirim, kamu sudah sampai finish!' : `${p.selesai} dari ${n} langkah selesai · berikutnya: ${esc(pj.langkah[aktif].nama)}`}</p>
    </div>
    <section aria-labelledby="h-lk"><div class="lb-sub-row"><h2 id="h-lk" class="lb-sub">Langkah <span class="pill num">${p.persen}%</span></h2>
      <button type="button" class="btn btn--ghost" id="tambah"><span data-icon="pen"></span>Tambah langkah</button></div>
      <ol class="lb-steps">${pj.langkah.map((s, i) => `<li class="lb-step${s.selesai ? ' is-done' : ''}${i === aktif ? ' is-active' : ''}">
        <label class="lb-step__check"><input type="checkbox" data-cek="${s.id}" ${s.selesai ? 'checked' : ''} ${pj.disetujui ? '' : 'disabled'}><span class="sr-only">Tandai selesai: ${esc(s.nama)}</span></label>
        <span class="lb-step__num num" aria-hidden="true">${i + 1}</span>
        <div class="lb-step__main"><strong class="wrap-any">${esc(s.nama)}</strong><span class="small muted">${tanggalPanjang(s.tanggal)}</span></div>
        <button type="button" class="btn btn--ghost lb-step__edit" data-edit="${s.id}" aria-label="Sunting ${esc(s.nama)}"><span data-icon="pen"></span></button></li>`).join('')}</ol>
      ${pj.disetujui ? '' : '<p class="small muted">Setujui usulan dulu untuk mulai mencentang langkah.</p>'}
    </section>
  </section>`, init(root) {
    const ubah = (fn, pesan) => { segarkanHari(); fn(); simpan(); ctx.render(); if (pesan) ctx.toast(pesan); };
    root.querySelectorAll('[data-pilih]').forEach((b) => b.addEventListener('click', () => ubah(() => { state.dipilih = b.dataset.pilih; })));
    root.querySelector('#setujui')?.addEventListener('click', () => ubah(() => { pj.disetujui = true; }, 'Peta Jalan disetujui. Langkah pertama menunggu.'));
    root.querySelector('#sunting')?.addEventListener('click', () => sunting(ctx, pj, null, tenggat));
    root.querySelector('#tambah').addEventListener('click', () => sunting(ctx, pj, null, tenggat, true));
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => sunting(ctx, pj, pj.langkah.find((s) => s.id === b.dataset.edit), tenggat)));
    root.querySelectorAll('[data-cek]').forEach((c) => c.addEventListener('change', () => {
      const s = pj.langkah.find((x) => x.id === c.dataset.cek);
      ubah(() => { s.selesai = c.checked; s.status = c.checked ? 'selesai' : 'belum'; s.selesaiPada = c.checked ? HARI_INI : ''; }, c.checked ? `Langkah selesai: ${s.nama}` : null);
    }));
    gambar(root, pj);
  } };
}

/* draw the path, step dots and mascot for the current scene size (phone or desktop render) */
function gambar(root, pj) {
  const stage = root.querySelector('#mazeStage'), scene = root.querySelector('#mazeScene');
  const draw = () => {
    const src = MAZE[stage.clientWidth >= 640 ? 'desktop' : 'phone'], path = src.path, n = pj.langkah.length;
    scene.style.setProperty('--r', src.ratio); scene.dataset.view = stage.clientWidth >= 640 ? 'desktop' : 'phone';
    const fs = pj.langkah.map((_, i) => posisiLangkah(i, n));
    let akhir = -1; pj.langkah.forEach((s, i) => { if (s.selesai) akhir = i; });
    const fLit = akhir < 0 ? 0.02 : akhir === n - 1 ? 1 : fs[akhir];
    root.querySelector('#mazePath').innerHTML = `<polyline class="lb-maze__dim" points="${pts(path)}"/><polyline class="lb-maze__lit${reducedMotion() ? '' : ' is-anim'}" points="${pts(potong(path, fLit))}"/>`;
    const aktif = pj.langkah.findIndex((s) => !s.selesai);
    root.querySelector('#mazeDots').innerHTML = pj.langkah.map((s, i) => { const [u, v] = titik(path, fs[i]); return `<span class="lb-dot${s.selesai ? ' is-done' : ''}${i === aktif ? ' is-active' : ''}" style="left:${u * 100}%;top:${v * 100}%" title="${esc(s.nama)}"><b class="num">${i + 1}</b></span>`; }).join('')
      + (() => { const [u, v] = path.at(-1); return `<span class="lb-finish" style="left:${u * 100}%;top:${v * 100}%">FINISH</span>`; })();
    const [bu, bv] = akhir < 0 ? path[0] : akhir === n - 1 ? path.at(-1) : titik(path, fs[akhir]);
    const buddy = root.querySelector('#mazeBuddy'); buddy.style.left = bu * 100 + '%'; buddy.style.top = bv * 100 + '%';
  };
  draw(); pergi(); ro = new ResizeObserver(draw); ro.observe(stage);
}

/* edit one step (or add a new one): name and date, with the date checked against today and the deadline */
function sunting(ctx, pj, langkah, tenggat, baru = false) {
  const target = langkah || (baru ? { id: 'l' + Date.now().toString(36), nama: '', tanggal: tambahHari(tenggat, -2) < HARI_INI ? HARI_INI : tambahHari(tenggat, -2), selesai: false } : pj.langkah[0]);
  ctx.sheet(`<h2>${baru ? 'Tambah langkah' : 'Sunting langkah'}</h2>
    <form id="fLangkah" novalidate>
      <div class="field"><label for="nmL">Nama langkah</label><input class="input" id="nmL" maxlength="60" aria-describedby="nmErr" value="${esc(target.nama)}" autocomplete="off"><span class="hint" id="nmErr" aria-live="polite"></span></div>
      <div class="field"><label for="tgL">Tanggal</label><input class="input" type="date" id="tgL" min="${HARI_INI}" max="${tenggat}" value="${target.tanggal}" aria-describedby="tgErr"><span class="hint" id="tgErr" aria-live="polite">Paling lambat ${tanggalPanjang(tenggat)} (tenggat).</span></div>
      <div class="btn-row"><button type="submit" class="btn btn--primary">Simpan langkah</button>${!baru && pj.langkah.length > 1 ? '<button type="button" class="btn btn--ghost" id="hapus">Hapus langkah</button>' : ''}</div>
    </form>`, (sheet, close) => {
    const nm = sheet.querySelector('#nmL'), tg = sheet.querySelector('#tgL');
    sheet.querySelector('#fLangkah').addEventListener('submit', (e) => {
      e.preventDefault();
      const nama = nm.value.trim(), salahN = nama ? null : 'Tulis nama langkahnya dulu.', salahT = validasiTanggal(tg.value, tenggat, HARI_INI);
      nm.setAttribute('aria-invalid', String(!!salahN)); tg.setAttribute('aria-invalid', String(!!salahT));
      sheet.querySelector('#nmErr').textContent = salahN || ''; sheet.querySelector('#tgErr').textContent = salahT || `Paling lambat ${tanggalPanjang(tenggat)} (tenggat).`;
      if (salahN) return nm.focus(); if (salahT) return tg.focus();
      target.nama = nama; target.tanggal = tg.value;
      if (baru) pj.langkah.push(target);
      pj.langkah.sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0));
      simpan(); close(); ctx.render(); ctx.toast(baru ? 'Langkah ditambahkan' : 'Langkah disimpan');
    });
    sheet.querySelector('#hapus')?.addEventListener('click', () => {
      /* simpan() replaces state.peta with a fresh copy, so undo looks the roadmap up again instead of using pj */
      const kunci = Object.keys(state.peta).find((k) => state.peta[k] === pj);
      const i = pj.langkah.indexOf(target); pj.langkah.splice(i, 1); simpan(); close(); ctx.render();
      ctx.toast('Langkah dihapus', { label: 'Urungkan', run: () => {
        const kini = (kunci && state.peta[kunci]) || pj;
        if (!kini.langkah.some((s) => s.id === target.id)) kini.langkah.splice(i, 0, target);
        simpan(); ctx.render();
      } });
    });
  });
}
