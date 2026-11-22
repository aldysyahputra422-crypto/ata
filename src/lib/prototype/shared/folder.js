/* Kertas di dalam folder Slot: BUKAN dekorasi kosong. Isinya langkah Peta Jalan berikutnya yang belum selesai
   (atau status Peta Jalan bila belum disetujui / sudah tuntas). Dipakai Hari Ini dan Lomba → Slot. */
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tgl = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '');

/* langkah: [{nama, tanggal, selesai}], disetujui: boolean, hariIni: 'YYYY-MM-DD' */
const lokal = () => { const k = new Date(); return `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, '0')}-${String(k.getDate()).padStart(2, '0')}`; };
export function isiKertas(langkah = [], disetujui = false, hariIni = lokal()) {
  if (!langkah.length) return { judul: 'Peta Jalan', isi: 'Belum ada langkah', meta: 'Buka Lomba untuk menyusunnya', telat: false };
  if (!disetujui) return { judul: 'Peta Jalan', isi: 'Usulan belum disetujui', meta: `${langkah.length} langkah menunggu`, telat: false };
  const berikut = langkah.find((s) => !s.selesai);
  if (!berikut) return { judul: 'Peta Jalan', isi: 'Semua langkah selesai', meta: `${langkah.length}/${langkah.length}`, telat: false };
  const telat = !!berikut.tanggal && berikut.tanggal < hariIni;
  return { judul: 'Langkah berikutnya', isi: berikut.nama, meta: telat ? `Lewat tenggat · ${tgl(berikut.tanggal)}` : tgl(berikut.tanggal), telat };
}

export function kertasHtml(k) {
  return `<span class="folder-ata__kertas" aria-hidden="true">
    <span class="folder-ata__kertas-label">${esc(k.judul)}</span>
    <span class="folder-ata__kertas-isi">${esc(k.isi)}</span>
    <span class="folder-ata__kertas-meta${k.telat ? ' is-telat' : ''}">${esc(k.meta)}</span>
  </span>`;
}
