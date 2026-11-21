/* Penyaring Ingatan: kredensial, nomor kartu, dan data kesehatan tidak pernah disimpan. */

const POLA = [
  {
    jenis: 'kartu',
    pola: /\b(?:\d[ -]?){13,19}\b/,
    alasan: 'Nomor kartu atau rekening tidak disimpan di Ingatan.',
  },
  {
    jenis: 'kartu',
    pola: /\b(?:norek|no\.? ?rekening|rekening|akun bank)\b[^\n]{0,20}\d[\d -]{7,17}\b/i,
    alasan: 'Nomor kartu atau rekening tidak disimpan di Ingatan.',
  },
  {
    jenis: 'kredensial',
    pola: /\b(cvv|cvc|kode keamanan kartu)\b[^\n]{0,16}\d{3,4}\b/i,
    alasan: 'Data kartu (termasuk CVV) tidak disimpan di Ingatan.',
  },
  {
    jenis: 'kredensial',
    pola: /\b(kata sandi|password|passcode|sandi(nya)?|otp|kode otp|kode verifikasi|pin|api ?key|secret|token akses|token)\b[^\n]{0,12}[:=]?\s*[A-Za-z0-9!@#$%^&*_-]{3,}/i,
    alasan: 'Kata sandi dan kode rahasia tidak disimpan di Ingatan.',
  },
  {
    jenis: 'kesehatan',
    pola: /\b(diagnosis|didiagnosis|penyakit|depresi|gangguan kecemasan|bipolar|obat resep|rumah sakit jiwa|kesehatan mental|hiv|diabetes|kanker|asma|sesak napas|terapi psikolog)\b/i,
    alasan: 'Data kesehatan bersifat pribadi dan tidak disimpan di Ingatan.',
  },
];

export function saringSensitif(teks) {
  const isi = String(teks ?? '');
  for (const aturan of POLA) {
    if (aturan.pola.test(isi)) {
      return { boleh: false, jenis: aturan.jenis, alasan: aturan.alasan };
    }
  }
  return { boleh: true, jenis: null, alasan: null };
}

function jenisDuga(teks) {
  const t = teks.toLowerCase();
  if (/(ingin|lolos|target|menang|finalis|juara|mimpi)/.test(t)) return 'tujuan';
  if (/(pilih|memilih|memutuskan|topik|sudah kuputuskan)/.test(t)) return 'keputusan';
  if (/(suka|lebih|fokus|nyaman|cocok|prefer|cara belajar)/.test(t)) return 'preferensi';
  return 'fakta';
}

let urut = 0;

export function usulIngatan(teks, jenis) {
  const isi = String(teks ?? '').trim();
  if (isi.length < 8) return null;
  if (!saringSensitif(isi).boleh) return null;
  urut += 1;
  return {
    id: `m-${Date.now().toString(36)}-${urut}`,
    jenis: jenis || jenisDuga(isi),
    teks: isi,
    disematkan: false,
    dibuat: new Date().toISOString(),
    sumber: 'chat',
  };
}

/* Kandidat dari percakapan: hanya kalimat orang pertama yang layak diingat. */
export function usulDariPercakapan(pesan = []) {
  const hasil = [];
  for (const p of pesan) {
    if (p.peran !== 'pengguna') continue;
    for (const kalimat of String(p.teks || '').split(/(?<=[.!?])\s+/)) {
      const bersih = kalimat.trim();
      if (bersih.length < 12 || bersih.length > 200) continue;
      if (!/^(aku|saya|gue|gua|topikku|targetku)\b/i.test(bersih)) continue;
      const usul = usulIngatan(bersih);
      if (usul && !hasil.some((x) => x.teks === usul.teks)) hasil.push(usul);
    }
  }
  return hasil;
}
