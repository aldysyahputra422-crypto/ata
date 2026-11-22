/* Disalin dari prototipe masuk/data/paket.js. Satu-satunya perbedaan: daftar BELUM (hasil audit build produksi). */
/* Paket keanggotaan. Harga resmi & status Pro berasal dari SERVER (/api/akun); di sini hanya isi fitur.
   `tersedia` = fitur itu bisa dipakai dari layar sampai selesai DI BUILD INI (hasil audit, bukan rencana atau blueprint).
   Fitur yang belum bisa dipakai tetap dicantumkan, dengan penanda "Belum tersedia". */
import { batasSlotPaket } from '../../shared/logic/hak.js';

/* id fitur yang belum bisa dipakai dari layar di build ini */
/* Production differs from the prototype repository on this line only: Lomba, Hari Ini, Progres, Tanya Ata and Sidang
   are not migrated yet (docs/MIGRASI-UI.md). Remove an id when its screen works end to end here. */
const BELUM = new Set(['radar-peta', 'progres', 'tanya', 'resep', 'juri-latihan', 'juri-panel', 'konteks-analitik']);
/* teks butir Slot; angkanya selalu dari konfigurasi hak (prototipe: hak.js, produksi: server) */
export const labelSlot = (paket, batas) => (paket === 'pro'
  ? `${batas.pro} Slot lomba aktif (Gratis: ${batas.gratis})`
  : `${batas.gratis} Slot lomba aktif; arsip & riwayat tetap bisa dibuka`);
const BATAS = { gratis: batasSlotPaket('gratis'), pro: batasSlotPaket('pro') };
const f = (id, label) => ({ id, label, ada: true, tersedia: !BELUM.has(id) });

export const PAKET = {
  gratis: {
    id: 'gratis',
    nama: 'Gratis',
    ringkas: 'Semua dasar untuk mulai ikut lomba.',
    batasSlot: batasSlotPaket('gratis'),
    fitur: [
      f('slot', labelSlot('gratis', BATAS)),
      f('radar-peta', 'Radar lomba nyata dan Peta Jalan'),
      f('progres', 'Tugas, XP, streak, dan Data Progres'),
      f('tanya', 'Tanya Ata dengan API key milikmu (BYOK)'),
      f('resep', 'Salin prompt (Resep) ke aplikasi AI pilihanmu, tanpa key'),
      f('juri-latihan', 'Sidang Juri latihan'),
    ],
  },
  pro: {
    id: 'pro',
    nama: 'Pro',
    ringkas: 'Kedalaman platform Ata. Tidak termasuk biaya AI: AI dan pencarian memakai key milikmu.',
    batasSlot: batasSlotPaket('pro'),
    fitur: [
      f('slot', labelSlot('pro', BATAS)),
      f('gratis', 'Semua fitur Gratis'),
      f('juri-panel', 'Sidang Juri multi-persona dan Red Team'),
      f('konteks-analitik', 'Konteks personal penuh dan analitik progres'),
    ],
    /* catatan jujur: bukan fitur, ditampilkan sebagai keterangan */
    catatan: [
      'Pro tidak termasuk biaya AI atau pencarian. Keduanya memakai API key milikmu, atau prompt yang kamu salin ke aplikasi AI pilihanmu.',
    ],
  },
};
