/* Radar card deck: save, skip or make a Slot, with undo. The 3-Slot limit is enforced here, not only in the UI. */
import { skorCocok } from './cocok.js';
export const BATAS_SLOT = 3;

export function buatDeck(list, profil, { slot = [] } = {}) {
  /* lomba yang tenggatnya sudah lewat tidak disodorkan (null = tenggat belum tertulis, tetap tampil) */
  const antrean = list.filter((l) => !slot.includes(l.id) && (l.hariLagi === null || l.hariLagi === undefined || l.hariLagi >= 0)).map((l) => ({ id: l.id, s: skorCocok(l, profil).skor })).sort((a, b) => b.s - a.s).map((x) => x.id);
  return { antrean, tersimpan: [], dilewati: [], slot: slot.slice(), riwayat: [] };
}

const DAFTAR = { simpan: 'tersimpan', lewati: 'dilewati', slot: 'slot' };

/* batas: jumlah Slot paket aktif (Gratis 3, Pro 6), dari store bersama; bawaan 3 */
export function putuskan(state, id, aksi, { batas = BATAS_SLOT } = {}) {
  if (aksi === 'slot' && !state.slot.includes(id) && state.slot.length >= batas) return { state, ditolak: 'slot-penuh' };
  /* remember where the card came from so undo can put it back there */
  const asal = ['tersimpan', 'dilewati', 'slot'].find((k) => state[k].includes(id)) || 'antrean';
  const next = { ...state, riwayat: [...state.riwayat, { id, aksi, asal }].slice(-20) };
  for (const k of ['antrean', 'tersimpan', 'dilewati', 'slot']) next[k] = state[k].filter((x) => x !== id);
  next[DAFTAR[aksi]].push(id);
  return { state: next };
}

export function urungkan(state) {
  const last = state.riwayat.at(-1);
  if (!last) return state;
  const k = DAFTAR[last.aksi], asal = last.asal || 'antrean';
  const next = { ...state, [k]: state[k].filter((x) => x !== last.id), riwayat: state.riwayat.slice(0, -1) };
  next[asal] = asal === 'antrean' ? [last.id, ...next.antrean] : [...next[asal], last.id];
  return next;
}

export function lepasSlot(state, id) { return { ...state, slot: state.slot.filter((x) => x !== id) }; }

/* Samakan deck dengan daftar Slot dari store bersama (diubah tab lain, mis. submit di Progres atau reset).
   Slot baru dikeluarkan dari antrean/tersimpan/dilewati; Slot yang hilang dilepas (riwayat Peta Jalannya tetap di store). */
export function samakanSlot(state, ids) {
  const slot = [...new Set(ids)];
  if (slot.length === state.slot.length && slot.every((x, i) => x === state.slot[i])) return state;
  const next = { ...state, slot };
  for (const k of ['antrean', 'tersimpan', 'dilewati']) next[k] = state[k].filter((x) => !slot.includes(x));
  return next;
}

/* Katalog bertambah (mis. poster lomba nyata baru): id yang belum pernah dilihat deck disisipkan di depan antrean, sekali saja.
   `dilihat` = id yang sudah pernah dikenal deck ini (undefined untuk simpanan lama: dihitung dari isi deck). */
export function sisipkanBaru(state, ids, dilihat) {
  const kenal = new Set(dilihat || [...state.antrean, ...state.tersimpan, ...state.dilewati, ...state.slot]);
  const baru = ids.filter((id) => !kenal.has(id));
  return { state: baru.length ? { ...state, antrean: [...baru, ...state.antrean.filter((x) => !baru.includes(x))] } : state, dilihat: [...new Set([...kenal, ...ids])] };
}

/* The Radar queue for the day the caller reads the competitions on (each entry's hariLagi is counted from "today": the
   account's day when signed in, the device's day otherwise; see shared/hari.js). Run at load and whenever the day changes.
   `list` = the catalogue; `lain` = competitions the user added (they sit in the same queue, but are never inserted anew);
   `ditutup` = ids of `lain` this function took out of the queue earlier.
   - a competition whose deadline has passed leaves the queue; one closing today (hariLagi 0) stays;
   - it is remembered (catalogue: forgotten from `dilihat`; `lain`: kept in `ditutup`), so if the day turns out to be
     earlier (the device is a day ahead of the account), it is offered again instead of staying hidden;
   - saved, skipped and Slot lists are never touched. Pure. */
export function segarkanAntrean(state, list, dilihat, { lain = [], ditutup = [] } = {}) {
  const buka = (l) => l.hariLagi === null || l.hariLagi === undefined || l.hariLagi >= 0;
  const tutupLain = new Set(lain.filter((l) => !buka(l)).map((l) => l.id));
  const tutup = new Set([...list.filter((l) => !buka(l)).map((l) => l.id), ...tutupLain]);
  const dipegang = new Set([...state.tersimpan, ...state.dilewati, ...state.slot]);
  const kenal = dilihat || [...state.antrean, ...dipegang];
  const kembali = ditutup.filter((id) => lain.some((l) => l.id === id && buka(l)) && !dipegang.has(id) && !state.antrean.includes(id));
  const sisa = state.antrean.filter((id) => !tutup.has(id));
  const antrean = [...kembali, ...sisa];
  const r = sisipkanBaru(kembali.length || sisa.length !== state.antrean.length ? { ...state, antrean } : state,
    list.filter(buka).map((l) => l.id), kenal.filter((id) => !tutup.has(id) || dipegang.has(id)));
  const ingat = [...new Set([...ditutup, ...state.antrean.filter((id) => tutupLain.has(id))])].filter((id) => tutupLain.has(id) && !dipegang.has(id));
  return { ...r, ditutup: ingat, berubah: r.state !== state };
}
