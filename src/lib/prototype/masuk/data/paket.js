/* Paket keanggotaan. Harga resmi & status Pro berasal dari SERVER (/api/akun); di sini hanya isi fitur.
   Hanya fitur yang benar-benar ada dan dijaga backend/aplikasi yang dicantumkan. */
import { batasSlotPaket } from '../../shared/logic/hak.js';

export const PAKET = {
  gratis: {
    id: 'gratis',
    nama: 'Gratis',
    ringkas: 'Semua dasar untuk mulai ikut lomba.',
    batasSlot: batasSlotPaket('gratis'),
    fitur: [
      { label: 'Radar lomba nyata dan Peta Jalan', ada: true },
      { label: `${batasSlotPaket('gratis')} Slot lomba aktif; arsip & riwayat tetap bisa dibuka`, ada: true },
      { label: 'Tugas, XP, streak, dan Data Progres', ada: true },
      { label: 'Tanya Ata dengan API key milikmu (BYOK)', ada: true },
      { label: 'Salin prompt (Resep) ke aplikasi AI pilihanmu, tanpa key', ada: true },
      { label: 'Sidang Juri latihan', ada: true },
    ],
  },
  pro: {
    id: 'pro',
    nama: 'Pro',
    ringkas: 'Kedalaman platform Ata. Tidak termasuk biaya AI: AI dan pencarian memakai key milikmu.',
    batasSlot: batasSlotPaket('pro'),
    fitur: [
      { label: 'Semua fitur Gratis', ada: true },
    ],
    /* catatan jujur: bukan fitur, ditampilkan sebagai keterangan */
    catatan: [
      'Pro tidak termasuk biaya AI atau pencarian. Keduanya memakai API key milikmu, atau prompt yang kamu salin ke aplikasi AI pilihanmu.',
      'Fitur khusus Pro (juri multi-persona, Red Team, konteks personal penuh, analitik progres) sedang dibangun dan belum tersedia di prototipe ini.',
    ],
  },
};
