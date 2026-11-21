/* Paket keanggotaan: batas Slot, fitur terkunci. Pro hanya diberikan SERVER (kode redeem atau pembayaran terverifikasi). */

import { PAKET } from '../data/paket.js';

export function batasSlot(paketId = 'gratis') {
  return (PAKET[paketId] || PAKET.gratis).batasSlot;
}

export function bisaTambahSlot(paketId = 'gratis', jumlahSekarang = 0) {
  const batas = batasSlot(paketId);
  return { boleh: jumlahSekarang < batas, batas, sisa: Math.max(0, batas - jumlahSekarang) };
}

export function fiturTerkunci(paketId = 'gratis') {
  return (PAKET[paketId] || PAKET.gratis).fitur.filter((f) => !f.ada).map((f) => f.label);
}

export function labelPaket(paketId = 'gratis') {
  return (PAKET[paketId] || PAKET.gratis).nama;
}
