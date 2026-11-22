/* Lomba inside the app shell: port of the prototype's lomba/app.js (hash router, toast with an action, shared sheet,
   view transitions, pull to refresh). Left out: the prototype's own chrome (bar, device frame, screen switch, note)
   and its navigation, which the app shell provides. */
import { mountIcons } from '../shared/ds.js';
import { pasangPegas, kurungFokus } from '../shared/sheet.js';
import { sinkronDariBersama } from './state.js';
import { dengarBersama, bacaBersama } from '../shared/bersama.js';
import { pasangTarik } from '../shared/tarik.js';
import { transisiTampilan } from '../shared/gerak.js';
import * as radar from './ui/radar.js';
import * as tersimpan from './ui/tersimpan.js';
import * as detail from './ui/detail.js';
import * as slot from './ui/slot.js';
import * as peta from './ui/peta.js';

export const SCREENS = { radar, tersimpan, 'lomba-detail': detail, slot, peta };

export function pasangLomba() {
  const screenEl = document.getElementById('screen'), views = document.getElementById('views');
  let current = null, toastTimer = 0;

  const ctx = {
    go(name) { if (location.hash.slice(1) !== name) location.hash = name; else render(name); },
    redirect(name) { history.replaceState(null, '', '#' + name); render(name); },
    render: () => render(current),
    /* toast with an optional action button (e.g. Urungkan), visible for ms */
    toast(msg, aksi, ms = 2600) {
      document.querySelectorAll('#app .toast').forEach((t) => t.remove()); clearTimeout(toastTimer);
      const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
      t.innerHTML = '<span></span>'; t.firstChild.textContent = msg;
      if (aksi) { const b = document.createElement('button'); b.type = 'button'; b.className = 'toast__aksi'; b.textContent = aksi.label; b.addEventListener('click', () => { t.remove(); aksi.run(); }); t.appendChild(b); }
      document.getElementById('app').appendChild(t); toastTimer = setTimeout(() => t.remove(), aksi ? 5000 : ms);
    },
    sheet(html, init) {
      const ov = document.getElementById('overlay'), opener = document.activeElement;
      ov.innerHTML = `<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true">${'<span class="sheet__grip"></span>' + html}</div></div>`;
      mountIcons(ov);
      const close = () => { ov.innerHTML = ''; if (opener && opener.focus) opener.focus(); };
      ov.querySelector('#scrim').addEventListener('click', (e) => { if (e.target.id === 'scrim') close(); });
      ov.querySelector('.sheet').addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      const first = ov.querySelector('button, input, a'); if (first) first.focus();
      if (init) init(ov.querySelector('.sheet'), close);
      pasangPegas(ov.querySelector('.sheet'), close); kurungFokus(ov.querySelector('.sheet'));
      return close;
    }
  };

  function render(name) {
    if (!SCREENS[name]) name = 'radar';
    const pindah = current && (name !== current || document.querySelector('[data-vt-nama]'));
    if (pindah) transisiTampilan(() => gambar(name), name === 'lomba-detail' ? 'detail' : 'layar');
    else gambar(name);
  }

  function gambar(name) {
    if (current && SCREENS[current] && SCREENS[current].pergi) SCREENS[current].pergi();
    current = name;
    const mod = SCREENS[name], v = mod.view(ctx);
    screenEl.innerHTML = v.html; mountIcons(screenEl);
    if (v.init) v.init(screenEl, ctx);
    views.scrollTop = 0;
    screenEl.dataset.layar = name;
  }

  const onHash = () => render(location.hash.slice(1));
  window.addEventListener('hashchange', onHash);
  const lepasBersama = dengarBersama((b) => { sinkronDariBersama(b); render(current); });
  /* In the prototype every tab is its own iframe and hears the others through storage events. Here Hari Ini writes the
     store in this same document while Lomba is unmounted, so the kept module state is refreshed on every mount. */
  sinkronDariBersama(bacaBersama());
  render(location.hash.slice(1) || 'radar');

  const jamKini = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  const tarik = pasangTarik(views, {
    segarkan: async () => { sinkronDariBersama(bacaBersama()); render(current); return `Tenggat dihitung ulang · ${jamKini()}`; }
  });

  return {
    ctx,
    lepas() {
      window.removeEventListener('hashchange', onHash);
      lepasBersama();
      if (tarik) tarik.copot();
      clearTimeout(toastTimer);
      if (current && SCREENS[current] && SCREENS[current].pergi) SCREENS[current].pergi();
      document.querySelectorAll('#app .toast').forEach((t) => t.remove());
      const ov = document.getElementById('overlay'); if (ov) ov.innerHTML = '';
    }
  };
}
