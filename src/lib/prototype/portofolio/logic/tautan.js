/* Tautan baca-saja untuk orang tua: buat, periksa, cabut, teks bagikan. Fungsi murni. */

export const MASA_BERLAKU_HARI = 30;

export const BAGIAN = [
  { id: 'lomba', label: 'Lomba dan kemajuan', keterangan: 'Nama lomba, tenggat, dan persentase kemajuan.' },
  { id: 'laporan', label: 'Laporan bulanan', keterangan: 'Ringkasan aktivitas dan rencana bulan depan.' },
  { id: 'sertifikat', label: 'Galeri sertifikat', keterangan: 'Sertifikat yang sudah masuk Galeri.' },
];

/* Bagian yang tidak pernah boleh masuk tautan orang tua. */
export const TERLARANG = ['chat', 'ingatan', 'apiKey', 'profil'];

const HARI_MS = 24 * 60 * 60 * 1000;

/* Token demo: deterministik dari nama + waktu, cukup untuk prototipe (bukan kriptografis). */
function tokenDari(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(0, 7).toUpperCase();
}

export function buatTautan({ nama = 'Raka', bagian = ['lomba', 'laporan'], sekarang = Date.now(), hari = MASA_BERLAKU_HARI } = {}) {
  const dipakai = [...new Set(bagian)].filter((b) => BAGIAN.some((x) => x.id === b) && !TERLARANG.includes(b));
  const token = tokenDari(`${nama}|${sekarang}`);
  return {
    token,
    url: `https://ata.sobatambis.id/o/${token}`,
    dibuat: new Date(sekarang).toISOString(),
    kedaluwarsa: new Date(sekarang + hari * HARI_MS).toISOString(),
    bagian: dipakai.length ? dipakai : ['lomba'],
    dicabut: false,
  };
}

export function periksaTautan(tautan, sekarang = Date.now()) {
  if (!tautan || !tautan.token) return { valid: false, alasan: 'Tautan tidak ditemukan.' };
  if (tautan.dicabut) return { valid: false, alasan: 'Tautan ini sudah dicabut oleh siswa.' };
  const lewat = Date.parse(tautan.kedaluwarsa);
  if (Number.isFinite(lewat) && sekarang > lewat) {
    return { valid: false, alasan: 'Tautan sudah kedaluwarsa. Minta tautan baru ke siswa.' };
  }
  return { valid: true, alasan: null };
}

export function cabut(tautan, sekarang = Date.now()) {
  return { ...tautan, dicabut: true, dicabutPada: new Date(sekarang).toISOString() };
}

export function bolehLihat(tautan, bagian) {
  if (!periksaTautan(tautan).valid) return false;
  if (TERLARANG.includes(bagian)) return false;
  return (tautan.bagian || []).includes(bagian);
}

export function teksBagikan(tautan, nama = 'Raka') {
  const bagian = (tautan.bagian || []).map((b) => BAGIAN.find((x) => x.id === b)?.label).filter(Boolean);
  return (
    `Halo, ini tautan portofolio ${nama} di Ata (baca saja, tanpa akun):\n${tautan.url}\n\n` +
    `Yang bisa dilihat: ${bagian.join(', ')}.\n` +
    `Tautan berlaku sampai ${new Date(tautan.kedaluwarsa).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. ` +
    `Chat dan Ingatan Ata tidak pernah ikut. Bisa dicabut kapan saja oleh ${nama}.`
  );
}
