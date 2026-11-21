/* Context pack: pilih ingatan lalu pangkas sesuai anggaran token (PRD FR-CCH-02, FR-MEM-03). */

export const ANGGARAN_TOKEN = 6000;
export const BATAS_INGATAN = 12;

/* Urutan pemangkasan: yang paling tidak penting dibuang dulu.
   Persona + aturan Ata tidak pernah dibuang. */
export const URUTAN_PANGKAS = ['pesan', 'ringkasan', 'lomba', 'ingatan', 'progres', 'tugas', 'profil'];

export const PERSONA =
  'Kamu Ata, asisten lomba untuk pelajar Indonesia, bagian dari Sobat Ambis.\n' +
  'Gaya: Bahasa Indonesia santai tapi rapi, spesifik, tidak menggurui.\n' +
  'Aturan: jangan mengarang aturan, tanggal, atau biaya lomba; kalau tidak ada di konteks, bilang tidak tahu dan minta panduan resmi. ' +
  'Bantu ide dan kritik, jangan menulis karya utuh. Ingatkan aturan penggunaan AI dan sitasi. Beri langkah kecil hari ini. ' +
  'Kalau pengguna kewalahan, kecilkan target.';

export function perkiraanToken(teks = '') {
  return Math.ceil(String(teks).trim().length / 4);
}

const waktu = (m) => Date.parse(m?.dibuat || '') || 0;

export function pilihIngatan(list = [], batas = BATAS_INGATAN) {
  const aman = (list || []).filter((m) => m && typeof m.teks === 'string' && m.teks.trim());
  const semat = aman.filter((m) => m.disematkan).sort((a, b) => waktu(b) - waktu(a));
  const biasa = aman.filter((m) => !m.disematkan).sort((a, b) => waktu(b) - waktu(a));
  return [...semat, ...biasa].slice(0, batas);
}

function bagianProfil(profil) {
  if (!profil) return '';
  const isi = [
    `${profil.nama}, ${profil.jenjang}, ${profil.sekolah}.`,
    profil.minat && `Minat: ${profil.minat}.`,
    profil.kekuatan && `Kekuatan: ${profil.kekuatan}.`,
    profil.hambatan && `Hambatan: ${profil.hambatan}.`,
    profil.waktu && `Waktu belajar: ${profil.waktu}.`,
    profil.perangkat && `Perangkat: ${profil.perangkat}.`,
  ].filter(Boolean);
  return `Profil:\n${isi.join('\n')}`;
}

function bagianSlot(slot) {
  if (!slot) return '';
  const isi = [
    `Slot aktif: ${slot.judul} (${slot.jenis}).`,
    `Tenggat: ${slot.tenggat}. Biaya: ${slot.biaya}.`,
    slot.juknis ? `Juknis terlampir: ${slot.ringkasJuknis || 'ada, ringkasan belum dibuat'}.` : 'Juknis belum diunggah.',
  ];
  return isi.join('\n');
}

function bagianTugas(tugas) {
  if (!tugas?.length) return '';
  const isi = tugas.filter((t) => !t.selesai).map((t) => `- ${t.judul} (tenggat ${t.tenggat})`);
  if (!isi.length) return '';
  return `Tugas tujuh hari ke depan:\n${isi.join('\n')}`;
}

function bagianIngatan(ingatan) {
  if (!ingatan.length) return '';
  return `Ingatan relevan:\n${ingatan.map((m) => `- [${m.jenis}] ${m.teks}`).join('\n')}`;
}

function bagianProgres(p) {
  if (!p) return '';
  const isi = [
    `Level ${p.level}, ${p.xp} XP, streak ${p.streak} hari (dihitung dari langkah yang benar-benar selesai).`,
    `Langkah selesai: ${p.selesai}${p.terlambat ? `; terlambat terbuka: ${p.terlambat}` : ''}.`,
    ...(p.slot || []).map((s) => `- ${s.nama}: ${s.selesai}/${s.wajib} langkah${s.disetujui ? '' : ' (Peta Jalan belum disetujui)'}${s.tenggat ? `, tenggat ${s.tenggat}` : ''}`)
  ];
  return `Progres:\n${isi.join('\n')}`;
}

/* lomba dari katalog yang relevan dengan PERTANYAAN (bukan seluruh katalog): kata kunci + minat + tenggat.
   Hanya lomba nyata yang masih buka; setiap baris membawa sumbernya. Maks `batas`. */
const KATA_TENGGAT = /\b(deadline|tenggat|dekat|terdekat|segera|cepat|minggu ini|kapan)\b/i;
const KATA_LOMBA = /\b(lomba|kompetisi|olimpiade|esai|essay|karya tulis|bisnis|business|poster|video|daftar|ikut|cocok|rekomendasi)\b/i;
export function lombaRelevan(katalog = [], pertanyaan = '', minat = [], batas = 5) {
  const q = String(pertanyaan || '').toLowerCase();
  if (!KATA_LOMBA.test(q) && !KATA_TENGGAT.test(q)) return [];
  const kata = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const buka = katalog.filter((l) => l.nyata && (l.hariLagi == null || l.hariLagi >= 0));
  const skor = (l) => {
    const teks = `${l.nama} ${l.kategori} ${(l.syarat || []).join(' ')} ${l.penyelenggara}`.toLowerCase();
    let n = kata.filter((w) => teks.includes(w)).length * 3;
    if (minat.includes(l.kategori)) n += 2;
    if (KATA_TENGGAT.test(q) && Number.isFinite(l.hariLagi)) n += Math.max(0, 10 - l.hariLagi);
    return n;
  };
  return buka.map((l) => ({ l, n: skor(l) })).sort((a, b) => b.n - a.n || (a.l.hariLagi ?? 999) - (b.l.hariLagi ?? 999)).slice(0, batas).map((x) => x.l);
}

function bagianLomba(list) {
  if (!list?.length) return '';
  const rp = (b) => (b === 0 ? 'gratis' : b == null ? 'biaya belum tertulis' : `Rp${b.toLocaleString('id-ID')}`);
  return `Lomba dari katalog Ata yang relevan (sumber: poster resmi; data yang tidak tertulis di poster = belum tersedia):\n${list.map((l) =>
    `- ${l.nama} | ${l.penyelenggara} | ${l.kategori} | tenggat ${l.tenggatIso || 'belum tertulis'}${Number.isFinite(l.hariLagi) ? ` (${l.hariLagi} hari lagi)` : ''} | ${rp(l.biaya)} | peserta: ${(l.tingkat || []).join('/') || 'belum tertulis'} | ${(l.syarat || []).slice(0, 3).join('; ')} | ${l.sumber}`).join('\n')}`;
}

function bagianPesan(pesan) {
  if (!pesan?.length) return '';
  return `Percakapan terakhir:\n${pesan.map((p) => `${p.peran}: ${p.teks}`).join('\n')}`;
}

/**
 * @returns {{teks:string, token:number, anggaran:number, bagian:object, dibuang:string[],
 *            ingatan:object[], barisPakai:string}}
 */
export function paketKonteks({
  profil = null,
  slot = null,
  tugas = [],
  ingatan = [],
  ringkasan = '',
  pesan = [],
  progres = null,
  lomba = [],
  persona = true,
  anggaran = ANGGARAN_TOKEN,
  batasIngatan = BATAS_INGATAN,
} = {}) {
  const dipakai = pilihIngatan(ingatan, batasIngatan);
  const bagian = {
    persona: persona ? PERSONA : '',
    profil: bagianProfil(profil),
    slot: bagianSlot(slot),
    tugas: bagianTugas(tugas),
    ingatan: bagianIngatan(dipakai),
    progres: bagianProgres(progres),
    lomba: bagianLomba(lomba),
    ringkasan: ringkasan ? `Ringkasan percakapan sebelumnya: ${ringkasan}` : '',
    pesan: bagianPesan(pesan),
  };

  const aktif = { ...bagian };
  let token = Object.values(aktif).reduce((n, t) => n + (t ? perkiraanToken(t) : 0), 0);
  const dibuang = [];
  for (const kunci of URUTAN_PANGKAS) {
    if (token <= anggaran) break;
    if (!aktif[kunci]) continue;
    dibuang.push(kunci);
    token -= perkiraanToken(aktif[kunci]);
    aktif[kunci] = '';
  }

  const teks = ['persona', 'profil', 'slot', 'tugas', 'progres', 'ingatan', 'lomba', 'ringkasan', 'pesan']
    .map((k) => aktif[k])
    .filter(Boolean)
    .join('\n\n');

  /* yang benar-benar masuk prompt saja yang boleh disebut di baris "Ata pakai" */
  const dipakaiAkhir = dibuang.includes('ingatan') ? [] : dipakai;
  const pakai = [];
  if (bagian.profil && !dibuang.includes('profil')) pakai.push('profil');
  if (slot && !dibuang.includes('slot')) pakai.push(`Slot ${slot.judul}`);
  if (dipakaiAkhir.length) pakai.push(`${dipakaiAkhir.length} ingatan`);
  if (bagian.progres && !dibuang.includes('progres')) pakai.push('progres');
  if (lomba.length && !dibuang.includes('lomba')) pakai.push(`${lomba.length} lomba relevan`);

  return {
    teks,
    token,
    anggaran,
    bagian: aktif,
    dibuang,
    ingatan: dipakaiAkhir,
    barisPakai: pakai.length ? `Ata pakai: ${pakai.join(', ')}` : 'Ata pakai: aturan Ata saja',
  };
}
