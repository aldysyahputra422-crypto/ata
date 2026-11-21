/* Pencarian dan saringan daftar Lomba (Tersimpan). Murni: daftar id + fungsi cari(id) dari pemanggil. */

/* huruf kecil, tanpa diakritik, spasi dirapikan */
export const normal = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/* cocok bila SEMUA kata kueri ada di nama, penyelenggara, cakupan, atau nama kategori */
export function cocokKueri(l, kueri, namaKategori = {}) {
  const kata = normal(kueri).split(' ').filter(Boolean);
  if (!kata.length) return true;
  if (!l) return false;
  const teks = normal([l.nama, l.penyelenggara, l.cakupan, namaKategori[l.kategori] || l.kategori].join(' '));
  return kata.every((k) => teks.includes(k));
}

export function saringLomba(ids, cari, { kueri = '', kategori = 'semua', namaKategori = {} } = {}) {
  return (ids || []).filter((id) => {
    const l = cari(id);
    if (!l) return false;
    if (kategori !== 'semua' && l.kategori !== kategori) return false;
    return cocokKueri(l, kueri, namaKategori);
  });
}

/* kategori yang benar-benar ada di daftar, urut sesuai urutan kunci namaKategori */
export function kategoriDi(ids, cari, namaKategori) {
  const ada = new Set((ids || []).map((id) => cari(id)?.kategori).filter(Boolean));
  return Object.keys(namaKategori).filter((k) => ada.has(k));
}
