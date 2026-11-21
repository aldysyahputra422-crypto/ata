/* SATU-SATUNYA sumber batas paket (entitlement) di prototipe. Komponen lain membaca dari sini, tidak menulis angka sendiri.
   Status paket (gratis/pro) selalu dari SERVER; berkas ini hanya memetakan paket -> batas fitur.
   K-23 disetujui PO (R0.2-0): Gratis 1 Slot aktif (final), Pro 3 (K-03, final). Salinan produksi ini berbeda dari repo
   prototipe hanya karena keputusan ini, sampai hak.js di repo prototipe diperbarui. Batas lain tetap usulan (src/lib/entitlements/config.ts). */
export const HAK = Object.freeze({
  gratis: Object.freeze({ slotAktif: 1, status: 'final' }),
  pro: Object.freeze({ slotAktif: 3, status: 'final' }),
});

export const PAKET_DIKENAL = Object.keys(HAK);
export const hakPaket = (paket) => HAK[paket] || HAK.gratis;
export const batasSlotPaket = (paket) => hakPaket(paket).slotAktif;
