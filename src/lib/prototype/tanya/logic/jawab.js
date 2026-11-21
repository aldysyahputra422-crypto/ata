/* Penjawab demo: tanpa panggilan AI sungguhan. Aturan yang diuji ada di tests/jawab.test.mjs. */

export const BATAS_TEMPEL = 12000;

export function periksaTempel(teks) {
  const isi = String(teks ?? '');
  const panjang = isi.length;
  if (panjang <= BATAS_TEMPEL) {
    return { ok: true, teks: isi, panjang, batas: BATAS_TEMPEL, galat: null };
  }
  const lebih = (panjang - BATAS_TEMPEL).toLocaleString('id-ID');
  return {
    ok: false,
    teks: isi,
    panjang,
    batas: BATAS_TEMPEL,
    galat: `Teksmu ${panjang.toLocaleString('id-ID')} karakter, batasnya 12.000. Potong ${lebih} karakter dulu — teksmu tidak hilang, masih ada di kotak ini.`,
  };
}

const TANYA_ATURAN =
  /(batas|maksimal|minimal|jumlah\s+(halaman|kata|lembar)|halaman|format|font|margin|biaya|harga|tanggal|deadline|tenggat|ketentuan|syarat|ukuran|kapan|berapa)/i;
const MENTOK = /(mentok|bingung|kewalahan|berat|stuck|putus asa|ketinggalan)/i;
const REVIEW = /(review|nilai|kritik|cek ide|masukan)/i;
const JURI = /(simulasi juri|tanya juri|pertanyaan juri|latihan presentasi)/i;
const PECAH = /(pecah|bagi tugas|langkah kecil|mulai dari mana)/i;

function sumberDari(konteks) {
  const pakai = ['profil'];
  if (konteks.slot) pakai.push(`Slot ${konteks.slot.judul}`);
  const n = konteks.ingatan?.length || 0;
  if (n) pakai.push(`${n} ingatan`);
  return `Ata pakai: ${pakai.join(', ')}`;
}

function catatanIntegritas(konteks) {
  if (!konteks.slot || konteks.sudahIntegritas) return null;
  const kebijakan = konteks.slot.aiPolicy;
  if (kebijakan === 'forbidden') {
    return 'Lomba ini melarang penggunaan AI. Pakai aku untuk bertanya dan menyusun rencana saja, lalu tulis karyamu sendiri.';
  }
  if (kebijakan === 'disclose') {
    return 'Lomba ini meminta keterbukaan soal AI. Sebelum mengumpulkan, cek aturan penggunaan AI dan cara sitasi di juknis resminya.';
  }
  return 'Aturan penggunaan AI di lomba ini belum jelas. Cek juknis resmi dan cara sitasi sebelum memakai hasil AI di karyamu.';
}

export function jawabDemo(pesan, konteks = {}) {
  const isi = String(pesan ?? '').trim();
  const nama = konteks.profil?.nama || 'kamu';
  const slot = konteks.slot || null;
  const sumber = sumberDari(konteks);
  const integritas = catatanIntegritas(konteks);
  const dasar = { sumber, integritas, pahamAturan: false, kartu: null };

  if (TANYA_ATURAN.test(isi)) {
    if (slot?.juknis && slot.ringkasJuknis) {
      return {
        ...dasar,
        pahamAturan: true,
        teks: `Dari juknis yang kamu lampirkan: ${slot.ringkasJuknis}\n\nAku pakai itu sebagai acuan. Kalau ada bagian yang belum jelas, sebut pasal atau bagiannya, jangan menebak dari lomba lain.`,
      };
    }
    return {
      ...dasar,
      teks:
        'Aku belum tahu aturan itu, dan aku tidak mau menebak angka atau tanggalnya. ' +
        'Tempel juknis resminya di sini, atau kirim tautannya — setelah itu aku bisa menunjukkan bagian yang mengatur hal itu. ' +
        'Sementara menunggu, kerjakan bagian isi dulu: topik, kerangka, dan daftar rujukan. Format menyusul setelah juknis ada.',
    };
  }

  if (MENTOK.test(isi)) {
    return {
      ...dasar,
      teks:
        `Oke, ${nama}. Kita kecilkan targetnya, bukan menambah tugas. ` +
        `Ambil satu langkah sepuluh menit saja hari ini, lalu berhenti. Kalau sudah selesai, kabari aku dan kita tambah satu langkah lagi.`,
      kartu: {
        judul: 'Satu langkah kecil',
        butir: [{ teks: `Buka catatanmu, tulis satu kalimat tentang ${slot?.topik || 'topikmu'}`, menit: 10 }],
        aksi: '+ ke Peta Jalan',
      },
    };
  }

  if (JURI.test(isi)) {
    return {
      ...dasar,
      teks:
        'Untuk simulasi juri, buka Sidang Juri di prototipe: di sana kamu bisa memilih tiga sampai lima juri AI dari juknis dan berlatih tanya-jawab. ' +
        'Di sini kita siapkan dulu tiga pertanyaan tersulit: apa bukti terkuatmu, apa kelemahan metode, dan mengapa topik ini penting sekarang.',
      kartu: null,
    };
  }

  if (REVIEW.test(isi)) {
    return {
      ...dasar,
      teks:
        `Aku review dari tiga sisi, ${nama}: masalah yang kamu angkat, bukti yang kamu punya, dan kejelasan langkah berikutnya. ` +
        'Tulis idemu dalam tiga kalimat, lalu aku tandai bagian yang masih kabur. Aku tidak akan menuliskan karyamu, hanya menunjukkan bagian yang perlu kamu perbaiki.',
    };
  }

  if (PECAH.test(isi)) {
    return {
      ...dasar,
      teks:
        `Kita pecah jadi langkah yang muat di ${konteks.profil?.waktu || 'waktu belajarmu'}. ` +
        'Urutannya: kumpulkan bahan, susun kerangka, tulis satu bagian, lalu minta kritik. Kerjakan satu per satu, jangan sekaligus.',
      kartu: {
        judul: 'Langkah hari ini',
        butir: [
          { teks: 'Kumpulkan tiga bahan atau rujukan', menit: 20 },
          { teks: 'Susun kerangka lima butir', menit: 25 },
          { teks: 'Tulis satu bagian terpendek', menit: 25 },
        ],
        aksi: '+ ke Peta Jalanku',
      },
    };
  }

  return {
    ...dasar,
    teks:
      `Halo ${nama}. Aku lihat kamu sedang mengerjakan ${slot?.judul || 'lombamu'}` +
      `${konteks.ingatan?.length ? `, dan aku masih ingat ${konteks.ingatan.length} hal yang pernah kamu ceritakan` : ''}. ` +
      'Mulai dari satu langkah kecil hari ini: tulis satu paragraf tentang masalah yang ingin kamu angkat. ' +
      'Kalau sudah, tempel di sini dan aku beri catatan.',
    kartu: {
      judul: 'Langkah hari ini',
      butir: [
        { teks: `Tulis satu paragraf masalah untuk ${slot?.topik || 'topikmu'}`, menit: 25 },
        { teks: 'Cari dua rujukan yang bisa dibuka', menit: 20 },
        { teks: 'Catat satu pertanyaan untuk mentor', menit: 10 },
      ],
      aksi: '+ ke Peta Jalan',
    },
  };
}
