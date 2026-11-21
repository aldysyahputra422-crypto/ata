/* SATU-SATUNYA sumber batas paket (entitlement) di prototipe. Komponen lain membaca dari sini, tidak menulis angka sendiri.
   Status paket (gratis/pro) selalu dari SERVER; berkas ini hanya memetakan paket -> batas fitur.
   Nilai Gratis = USULAN, belum final (lihat docs/blueprint/16-entitlement-dan-migrasi.md §1, K-23):
   PO merekomendasikan Gratis 1 Slot aktif; prototipe tetap 3 sampai matriks entitlement disetujui. Pro = 3 (K-03, final). */
export const HAK = Object.freeze({
  gratis: Object.freeze({ slotAktif: 3, status: 'usulan' }),
  pro: Object.freeze({ slotAktif: 3, status: 'final' }),
});

export const PAKET_DIKENAL = Object.keys(HAK);
export const hakPaket = (paket) => HAK[paket] || HAK.gratis;
export const batasSlotPaket = (paket) => hakPaket(paket).slotAktif;
