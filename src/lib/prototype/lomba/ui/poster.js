/* CSS poster art for a competition (no third-party images), plus the shared "Slot penuh" sheet. */
import { esc } from '../state.js';
import { labelSisa } from '../logic/label.js';
export const sisaLabel = labelSisa;

/* lomba nyata: poster asli di atas salinannya sendiri yang diburamkan (kaca), cap "INFO NYATA" */
function posterFoto(l, kelas) {
  return `<div class="poster-art poster-art--foto g-${l.gem} ${kelas}">
    <img class="poster-art__latar" src="/prototype/${esc(l.gambar)}" alt="" aria-hidden="true" decoding="async" draggable="false">
    <img class="poster-art__img" src="/prototype/${esc(l.gambar)}" alt="Poster ${esc(l.nama)}" decoding="async" draggable="false">
    <span class="badge badge--nyata">INFO NYATA</span>
    <strong class="poster-art__title sr-only">${esc(l.nama)}</strong>
    <span class="stamp">${sisaLabel(l.hariLagi)}</span>
  </div>`;
}

export function posterHtml(l, kelas = '') {
  if (l.gambar) return posterFoto(l, kelas);
  return `<div class="poster-art g-${l.gem} ${kelas}" style="--shape:${l.bentuk || '50%'}">
    <span class="badge">${l.simulasiLama ? 'DATA CONTOH' : l.unggahan ? 'ISIAN MANUAL' : 'DATA DEMO'}</span>
    <strong class="poster-art__title">${esc(l.nama)}</strong>
    <span class="poster-art__org">${esc(l.penyelenggara.replace(' (DATA DEMO)', ''))}</span>
    <span class="stamp">${sisaLabel(l.hariLagi)}</span>
  </div>`;
}

export function sheetSlotPenuh(ctx, slotIds, cari, onLepas) {
  ctx.sheet(`<img src="/prototype/assets/panik.svg" alt="" class="sheet-mascot">
    <h2>Slotmu penuh</h2>
    <p>Slotmu penuh. Selesaikan atau lepas satu dulu, biar tetap fokus.</p>
    <ul class="lb-slotlist">${slotIds.map((id) => { const l = cari(id); return `<li><span class="gem g-${l.gem}">${esc(l.nama)}</span><button type="button" class="btn btn--ghost" data-lepas="${id}">Lepas</button></li>`; }).join('')}</ul>
    <button type="button" class="btn btn--block" id="tutupPenuh">Nanti saja</button>`, (sheet, close) => {
    sheet.querySelector('#tutupPenuh').addEventListener('click', close);
    sheet.querySelectorAll('[data-lepas]').forEach((b) => b.addEventListener('click', () => {
      const l = cari(b.dataset.lepas);
      sheet.innerHTML = `<span class="sheet__grip"></span><h2>Lepas ${esc(l.nama)}?</h2><p>Progres Peta Jalannya tetap tersimpan kalau kamu ambil lagi nanti.</p>
        <div class="btn-row"><button type="button" class="btn" id="batal">Batal</button><button type="button" class="btn btn--primary" id="ya">Lepas Slot</button></div>`;
      sheet.querySelector('#batal').addEventListener('click', close);
      sheet.querySelector('#ya').addEventListener('click', () => { close(); onLepas(l.id); });
      sheet.querySelector('#ya').focus();
    }));
  });
}
