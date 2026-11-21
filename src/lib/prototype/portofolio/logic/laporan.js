/* Laporan Bulanan: susun data jadi dokumen siap cetak. Fungsi murni, tanpa DOM. */

export const BAGIAN_LAPORAN = [
  { id: 'aktivitas', label: 'Aktivitas harian', keterangan: 'Daftar kegiatan dan durasinya.' },
  { id: 'lomba', label: 'Lomba yang diikuti', keterangan: 'Tenggat, kemajuan, dan langkah berikutnya.' },
  { id: 'catatan', label: 'Catatan mentor', keterangan: 'Hanya jika siswa membagikannya.' },
  { id: 'rencana', label: 'Rencana bulan depan', keterangan: 'Tiga langkah yang sudah disusun siswa.' },
];

export const BATAS_PESAN = 280;

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function validasiPesan(teks) {
  const isi = String(teks ?? '');
  if (isi.length > BATAS_PESAN) {
    return { ok: false, sisa: 0, galat: `Pesan ${isi.length} karakter, batasnya ${BATAS_PESAN}.` };
  }
  return { ok: true, sisa: BATAS_PESAN - isi.length, galat: null };
}

export function bulanLabel(periode) {
  const [tahun, bulan] = String(periode).split('-').map(Number);
  if (!tahun || !bulan || bulan < 1 || bulan > 12) return String(periode);
  return `${BULAN_ID[bulan - 1]} ${tahun}`;
}

function hash(teks) {
  let h = 2166136261;
  for (let i = 0; i < String(teks).length; i += 1) {
    h ^= String(teks).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
}

/** Deterministis: periode + nama yang sama selalu menghasilkan kode yang sama. */
export function kodeVerifikasi(periode, nama = 'Raka') {
  return `ATA-${periode}-${hash(`${periode}|${nama}`)}`;
}

export function namaBerkas(nama, periode) {
  const bersih = String(nama || 'Siswa').replace(/[^A-Za-z0-9]+/g, '').slice(0, 20) || 'Siswa';
  return `Laporan-Ata_${bersih}_${periode}.pdf`;
}

const tanggalIndo = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function ringkasAktivitas(aktivitas = []) {
  const hari = new Set(aktivitas.map((a) => a.tanggal));
  const menit = aktivitas.reduce((n, a) => n + (Number(a.menit) || 0), 0);
  const selesai = aktivitas.filter((a) => a.hasil === 'Selesai').length;
  return {
    hariAktif: hari.size,
    jamFokus: Math.round((menit / 60) * 10) / 10,
    tugasSelesai: selesai,
    totalTugas: aktivitas.length,
  };
}

export function statusKata(konsistensi) {
  if (konsistensi >= 80) return 'Sesuai rencana';
  if (konsistensi >= 55) return 'Cukup sesuai';
  return 'Perlu perhatian';
}

/**
 * Hanya bidang yang diizinkan yang disalin. Chat, Ingatan, dan API key tidak pernah ikut.
 * @param {{profil:object, periode:string, aktivitas?:Array, lomba?:Array, catatan?:object|null,
 *          rencana?:string[], bagian?:string[], pesan?:string, hariRencana?:number}} data
 */
export function bangunLaporan(data = {}) {
  const {
    profil = {},
    periode = '2026-11',
    aktivitas = [],
    lomba = [],
    catatan = null,
    rencana = [],
    bagian = BAGIAN_LAPORAN.map((b) => b.id),
    pesan = '',
    hariRencana = 22,
    terbit = null,
  } = data;

  const bulanIni = aktivitas.filter((a) => String(a.tanggal || '').startsWith(periode));
  const angka = ringkasAktivitas(bulanIni);
  const konsistensi = hariRencana > 0 ? Math.min(100, Math.round((angka.hariAktif / hariRencana) * 100)) : 0;
  const aktif = BAGIAN_LAPORAN.map((b) => b.id).filter((id) => bagian.includes(id));

  const hasil = {
    judul: `Laporan Bulanan — ${bulanLabel(periode)}`,
    periode,
    periodeLabel: bulanLabel(periode),
    terbit: terbit || new Date().toISOString().slice(0, 10),
    nama: String(profil.nama || 'Siswa'),
    jenjang: String(profil.jenjang || ''),
    sekolah: String(profil.sekolah || ''),
    ringkasan: {
      ...angka,
      konsistensi,
      status: statusKata(konsistensi),
      kalimat:
        bulanIni.length === 0
          ? 'Bulan ini lebih tenang; rencana bulan depan ada di bawah.'
          : `${angka.hariAktif} hari aktif, ${angka.jamFokus.toLocaleString('id-ID')} jam belajar tercatat.`,
    },
    pesan: String(pesan || '').slice(0, BATAS_PESAN),
    kode: kodeVerifikasi(periode, profil.nama || 'Siswa'),
    bagian: aktif,
    aktivitas: aktif.includes('aktivitas')
      ? bulanIni.map((a) => ({
          tanggal: a.tanggal,
          tanggalLabel: tanggalIndo(a.tanggal),
          judul: String(a.judul || ''),
          lomba: String(a.lomba || ''),
          menit: Number(a.menit) || 0,
          hasil: String(a.hasil || ''),
        }))
      : [],
    lomba: aktif.includes('lomba')
      ? lomba.map((l) => ({
          nama: String(l.nama || ''),
          penting: String(l.penting || ''),
          pentingLabel: l.penting ? tanggalIndo(l.penting) : '',
          kemajuan: Number(l.kemajuan) || 0,
          status: String(l.status || ''),
          langkah: String(l.langkah || ''),
        }))
      : [],
    catatan:
      aktif.includes('catatan') && catatan?.ada
        ? { penulis: String(catatan.penulis || ''), teks: String(catatan.teks || '') }
        : null,
    rencana: aktif.includes('rencana') ? rencana.map((r) => String(r)) : [],
  };

  return hasil;
}
