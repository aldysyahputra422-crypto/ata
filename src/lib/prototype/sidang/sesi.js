import { BATAS_DETIK } from './logic/waktu.js';
/* Sidang Juri: pertanyaan, jawaban, ringkasan, riwayat. Fungsi murni; tanpa AI di belakangnya, jadi pertanyaan dan alasan
   dibangun dari karakter juri dan kriteria juknis. Dibuat KETAT seperti panel lomba sungguhan:
   - jawaban lemah (tanpa bukti) memicu DESAKAN dari juri yang sama, maksimal sekali per juri;
   - skor 1–5 dengan rubrik terbuka (lihat RUBRIK) dan batas atas: klaim tanpa angka/sumber tidak bisa lebih dari 2. */
const PER_JURI = 2;
const RIWAYAT_KEY = 'ata-demo-riwayat-sidang';

function pertanyaanKriteria(juri, k) {
  const n = k.nama.toLowerCase();
  const sudut = {
    'karya-tulis': `${k.nama} berbobot ${k.bobot}%. Tunjukkan bukti terkuatmu untuk ${n}: angka atau sumbernya, dan keterbatasannya.`,
    bisnis: `Untuk ${n}, sebutkan satu angka yang bisa saya verifikasi, dari mana angka itu, dan apa yang terjadi kalau angka itu meleset 50%.`,
    poster: `Untuk ${n}, keputusan visual mana yang kamu ambil dengan sengaja, dan apa buktinya bahwa itu bekerja pada orang lain?`,
    video: `Untuk ${n}, adegan mana yang membuktikan pesanmu, dan bagaimana kamu tahu penonton menangkapnya?`,
    olimpiade: `Untuk ${n}, langkah mana yang akan dipotong korektor, dan bagaimana kamu menutup celah itu?`,
    pidato: `Untuk ${n}, argumen mana yang paling mudah dibantah lawan, dan apa jawabanmu?`,
    umum: `Untuk ${n}, beri satu contoh nyata yang bisa diperiksa, bukan contoh rekaan.`
  };
  return sudut[juri.fokus.find((f) => sudut[f]) || 'umum'];
}

/* "Prof. Hartono", "Bayu": title plus first name, or first name alone */
export const panggilan = (j) => { const w = j.nama.split(' '); return /\.$/.test(w[0]) ? w.slice(0, 2).join(' ') : w[0]; };

export function buatSesi(panel, juknis, lomba = '') {
  const kriteria = juknis.kriteria.slice().sort((a, b) => b.bobot - a.bobot);
  const tanyaJawab = [];
  for (let r = 0; r < PER_JURI; r++) {
    panel.juri.forEach((j, i) => {
      if (r === 0) {
        tanyaJawab.push({ juriId: j.id, tanya: j.ciriPertanyaan, jawab: null,
          alasan: `${panggilan(j)} adalah ${j.peran.toLowerCase()}. Yang dia tegakkan: ${j.standar || j.gaya.toLowerCase()}. ${j.gaya}.` });
      } else {
        const k = kriteria[i % kriteria.length];
        tanyaJawab.push({ juriId: j.id, tanya: pertanyaanKriteria(j, k), jawab: null, kriteria: k.nama,
          alasan: `Juknis memberi bobot ${k.bobot}% untuk ${k.nama}. Juri sungguhan mengejar kriteria berbobot besar dan menuntut bukti yang bisa diperiksa, jadi jawabanmu di sini paling berpengaruh.` });
      }
    });
  }
  return { id: 's-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), lomba, panel, juknis,
    giliran: 0, tanyaJawab, status: 'berjalan', mulai: Date.now() };
}

/* detik: detik yang dipakai siswa (null bila tidak diketahui).
   Jawaban lemah (skor ≤ 2) → juri yang sama langsung mendesak sekali dengan pertanyaan lanjutannya. */
export function jawab(sesi, teks, detik = null) {
  if (sesi.status === 'selesai') return sesi;
  const kini = sesi.tanyaJawab[sesi.giliran];
  let tanyaJawab = sesi.tanyaJawab.map((t, i) => (i === sesi.giliran ? { ...t, jawab: String(teks), detik: detik == null ? null : Math.round(detik) } : t));
  const juri = sesi.panel.juri.find((j) => j.id === kini.juriId);
  const sudahDidesak = tanyaJawab.some((t) => t.juriId === kini.juriId && t.desakan);
  if (!kini.desakan && !sudahDidesak && juri?.desakan && nilai(teks) <= 2) {
    const d = { juriId: juri.id, tanya: juri.desakan, jawab: null, desakan: true, kriteria: kini.kriteria,
      alasan: `Jawabanmu sebelumnya belum memuat bukti yang bisa diperiksa (angka, sumber, atau alasan). Juri sungguhan tidak berhenti di situ: ${panggilan(juri)} menekan sekali lagi.` };
    tanyaJawab = [...tanyaJawab.slice(0, sesi.giliran + 1), d, ...tanyaJawab.slice(sesi.giliran + 1)];
  }
  const giliran = sesi.giliran + 1;
  return { ...sesi, tanyaJawab, giliran, status: giliran >= tanyaJawab.length ? 'selesai' : 'berjalan' };
}

/* Rubrik simulasi (tanpa AI, diberi label simulasi di UI). Ketat dan terbuka:
   1 dasar; +1 ada angka; +1 ada sumber/metode; +1 ada penalaran; +1 mengakui keterbatasan.
   Batas: < 40 huruf → 1; tanpa angka DAN tanpa sumber → maks 2; ≥ 2 kata mengambang → −1.
   Panjang saja TIDAK menambah nilai. 5 hanya bila angka, sumber, penalaran, dan keterbatasan hadir bersamaan. */
export const RUBRIK = [
  'Angka atau ukuran yang bisa diperiksa',
  'Sumber, metode, atau cara memperoleh bukti',
  'Penalaran (karena, sehingga, maka)',
  'Mengakui keterbatasan, risiko, atau sisi lemah',
  'Jawaban < 40 huruf maksimal 1; tanpa angka dan tanpa sumber maksimal 2; kata mengambang mengurangi 1'
];
/* akar kata tanpa batas di depan: imbuhan Indonesia (me-wawancara-i, di-uji, peng-amat-an) tetap cocok */
const RE_SUMBER = /(data|sumber|survei|wawancara|responden|percobaan|uji\b|diuji|menguji|eksperimen|jurnal|referensi|\bBPS\b|laporan|observasi|amati|kuesioner|sampel|literatur|kutip|pemasok|penawaran)/i;
const RE_NALAR = /\b(karena|sebab|sehingga|maka|oleh karena|akibatnya|artinya|berarti)\b/i;
const RE_BATAS = /\b(keterbatasan|kelemahan|risiko|namun|tetapi|meski|kekurangan|belum|kecuali)/i; /* tanpa batas belakang: -nya, -an */
const RE_MENGAMBANG = /\b(mungkin|kayaknya|sepertinya|pokoknya|bagus|keren|banget|insya ?allah|kira-kira|semacam)\b/gi;
export function nilai(teks) {
  const t = String(teks || '').trim();
  if (t.length < 40) return 1;
  const angka = /\d/.test(t), sumber = RE_SUMBER.test(t);
  let s = 1 + (angka ? 1 : 0) + (sumber ? 1 : 0) + (RE_NALAR.test(t) ? 1 : 0) + (RE_BATAS.test(t) ? 1 : 0);
  if (!angka && !sumber) s = Math.min(s, 2);
  if ((t.match(RE_MENGAMBANG) || []).length >= 2) s -= 1;
  return Math.max(1, Math.min(5, s));
}
/* predikat terhadap standar: < 3 belum standar nasional; 3 standar nasional; ≥ 4 kompetitif; 5 setara internasional */
export function predikat(rata) {
  if (rata >= 4.75) return 'Setara standar internasional';
  if (rata >= 4) return 'Kompetitif di tingkat nasional';
  if (rata >= 3) return 'Memenuhi standar nasional';
  return 'Belum memenuhi standar nasional';
}

export function ringkas(sesi) {
  const perJuri = sesi.panel.juri.map((j) => {
    const milik = sesi.tanyaJawab.filter((t) => t.juriId === j.id);
    const rata = milik.reduce((a, t) => a + nilai(t.jawab), 0) / Math.max(1, milik.length);
    const skor = {};
    sesi.juknis.kriteria.forEach((k) => {
      const khusus = milik.find((t) => t.kriteria === k.nama);   /* the question this judge asked about k, if any */
      skor[k.nama] = Math.max(1, Math.min(5, Math.round(khusus ? nilai(khusus.jawab) : rata)));
    });
    return { id: j.id, alasan: milik.map((t) => t.alasan), skor };
  });
  const lemah = sesi.juknis.kriteria.map((k) => ({ k, v: perJuri.reduce((a, p) => a + p.skor[k.nama], 0) / perJuri.length })).sort((a, b) => a.v - b.v)[0];
  const dijawab = sesi.tanyaJawab.filter((t) => t.jawab != null);
  const tanpaBukti = dijawab.filter((t) => nilai(t.jawab) <= 2).length;
  const didesak = sesi.tanyaJawab.filter((t) => t.desakan).length;
  const rataSemua = perJuri.reduce((a, p) => a + Object.values(p.skor).reduce((x, y) => x + y, 0) / Math.max(1, Object.keys(p.skor).length), 0) / Math.max(1, perJuri.length);
  const catatan = `${predikat(rataSemua)} (rata-rata ${rataSemua.toFixed(1)} dari 5). Perkuat ${lemah.k.nama} dulu: nilai rata-ratanya paling rendah di panel ini. `
    + (tanpaBukti ? `${tanpaBukti} jawaban belum memuat bukti yang bisa diperiksa${didesak ? ` dan ${didesak} kali juri harus mendesak` : ''}. Pakai pola klaim, bukti (angka atau sumber), penalaran, lalu akui keterbatasannya.` : 'Setiap jawaban sudah memuat bukti. Uji lagi dengan panel lain untuk sudut berbeda.');
  const durasi = sesi.tanyaJawab.map((t) => t.detik).filter((d) => d != null);
  const lewatWaktu = durasi.filter((d) => d > BATAS_DETIK).length;
  const rataDetik = durasi.length ? Math.round(durasi.reduce((a, d) => a + d, 0) / durasi.length) : null;
  return { perJuri, catatan, lewatWaktu, rataDetik, rata: Math.round(rataSemua * 10) / 10, predikat: predikat(rataSemua), didesak };
}

function baca(store) {
  if (!store) return [];
  try { return JSON.parse(store.getItem(RIWAYAT_KEY) || '[]'); } catch (e) { return []; }
}

export function simpanRiwayat(sesi, store) {
  if (!store) return;
  const simpan = { ...sesi, status: sesi.status === 'selesai' ? 'selesai' : 'belum-selesai' };
  try {
    const list = baca(store).filter((s) => s.id !== sesi.id);
    list.unshift(simpan);
    store.setItem(RIWAYAT_KEY, JSON.stringify(list.slice(0, 20)));
  } catch (e) { /* storage full or blocked: history is a convenience */ }
}

export function muatRiwayat(store) { return baca(store); }
