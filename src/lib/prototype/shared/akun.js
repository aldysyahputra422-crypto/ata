/* App adapter for the prototype's shared/akun.js search calls (NOT a verbatim copy).
   The app has no search backend and no stored search key yet, so only Mode B is offered:
   ready-made queries the user opens in their own search engine (port of strategi_cari in the prototype's akun.py).
   Nothing is requested from any provider and no key ever leaves the form. */
const BELUM = 'Menghubungkan key pencarian belum tersedia di versi ini. Pakai kata kunci di bawah, lalu tambahkan lombanya lewat "Tambah lomba".';

export function strategiCari(kueri) {
  const q = String(kueri ?? '').split(/\s+/).filter(Boolean).join(' ').slice(0, 120) || 'lomba pelajar';
  const tahun = new Date().getFullYear();
  return [`${q} ${tahun} pendaftaran`, `${q} juknis pdf`, `${q} site:ac.id`, `${q} site:go.id`, `"${q}" deadline pendaftaran`]
    .map((teks) => ({ teks, url: 'https://www.google.com/search?' + new URLSearchParams({ q: teks }).toString() }));
}

export const temukanLomba = async (q) => ({ ok: true, data: { mode: 'B', hasil: [], disaring: {}, kueri: strategiCari(q) } });
export const statusCari = async () => ({ ok: true, data: { terhubung: false } });
export const simpanCari = async () => ({ ok: false, status: 501, galat: { kode: 'belum-tersedia', pesan: BELUM } });
export const putusCari = async () => ({ ok: true, data: { terhubung: false } });
