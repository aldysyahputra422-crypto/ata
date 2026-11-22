/* SATU-SATUNYA sumber batas paket (entitlement) di prototipe. Komponen lain membaca dari sini, tidak menulis angka sendiri.
   Status paket (gratis/pro) selalu dari SERVER; berkas ini hanya memetakan paket -> batas fitur.
   K-23 disetujui PO: Gratis 1 Slot aktif (final), Pro 3 (K-03, final). Batas lain di matriks entitlement tetap usulan
   (docs/blueprint/16-entitlement-dan-migrasi.md §2). Slot di atas batas tidak pernah dibuang: pengguna memilih yang aktif. */
export const HAK = Object.freeze({
  gratis: Object.freeze({ slotAktif: 1, status: 'final' }),
  pro: Object.freeze({ slotAktif: 3, status: 'final' }),
});

export const PAKET_DIKENAL = Object.keys(HAK);
export const hakPaket = (paket) => HAK[paket] || HAK.gratis;
export const batasSlotPaket = (paket) => hakPaket(paket).slotAktif;
