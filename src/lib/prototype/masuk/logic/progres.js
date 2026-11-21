/* Progres: cincin, heatmap 12 minggu, streak, kesiapan submit. Fungsi murni. */

const HARI = 24 * 60 * 60 * 1000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

export function selisihHari(tenggat, hariIni) {
  const a = Date.parse(`${String(tenggat).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(hariIni).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / HARI);
}

export function cincin({ wajib = 0, selesai = 0, tenggat, hariIni } = {}) {
  const total = Math.max(0, Number(wajib) || 0);
  const jadi = Math.min(Math.max(0, Number(selesai) || 0), total);
  const persen = total === 0 ? 0 : Math.round((jadi / total) * 100);
  const sisaHari = tenggat && hariIni ? selisihHari(tenggat, hariIni) : null;
  const label =
    sisaHari === null
      ? 'Tanpa tenggat'
      : sisaHari < 0
        ? `Lewat tenggat ${Math.abs(sisaHari)} hari`
        : sisaHari === 0
          ? 'Tenggat hari ini'
          : `${sisaHari} hari lagi`;
  return { persen, sisaHari, label, lewat: sisaHari !== null && sisaHari < 0, selesai: jadi, wajib: total };
}

/** 12 minggu terakhir, tiap minggu 7 hari, berakhir pada hariIni (Senin sebagai awal minggu). */
export function heatmap(aktivitas = {}, { minggu = 12, hariIni } = {}) {
  const akhir = hariIni ? new Date(`${String(hariIni).slice(0, 10)}T00:00:00Z`) : new Date();
  const geser = (akhir.getUTCDay() + 6) % 7; /* Senin = 0 */
  const akhirMinggu = new Date(akhir.getTime() - geser * HARI);

  const kolom = [];
  let total = 0;
  let max = 0;

  for (let w = minggu - 1; w >= 0; w -= 1) {
    const sel = [];
    for (let d = 0; d < 7; d += 1) {
      const tanggal = new Date(akhirMinggu.getTime() - (w * 7 - d) * HARI);
      const kunci = iso(tanggal);
      const jumlah = Number(aktivitas[kunci] || 0);
      total += jumlah;
      if (jumlah > max) max = jumlah;
      sel.push({ tanggal: kunci, jumlah, masaDepan: tanggal > akhir });
    }
    kolom.push(sel);
  }

  return { kolom, total, max, mulai: kolom[0]?.[0]?.tanggal || '', akhir: iso(akhir) };
}

/**
 * Streak hari aktif. Satu hari kosong per minggu tidak memutus (PRD FR-PRG-08).
 */
export function streak(aktivitas = {}, { hariIni, maks = 365 } = {}) {
  const akhir = hariIni ? new Date(`${String(hariIni).slice(0, 10)}T00:00:00Z`) : new Date();
  let hitung = 0;
  let liburTerpakai = 0;

  for (let i = 0; i < maks; i += 1) {
    const t = iso(new Date(akhir.getTime() - i * HARI));
    const ada = Number(aktivitas[t] || 0) > 0;
    if (ada) {
      hitung += 1;
      continue;
    }
    /* hari kosong: boleh satu per blok tujuh hari */
    const batas = Math.floor(hitung / 7) + 1;
    if (liburTerpakai < batas) {
      liburTerpakai += 1;
      continue;
    }
    break;
  }

  return hitung;
}

export function kesiapanSubmit(checklist = []) {
  const total = checklist.reduce((n, c) => n + (Number(c.bobot) || 0), 0);
  const skor = checklist.reduce((n, c) => n + (c.selesai ? Number(c.bobot) || 0 : 0), 0);
  const persen = total === 0 ? 0 : Math.round((skor / total) * 100);
  const kurang = checklist.filter((c) => !c.selesai).map((c) => c.label);
  const label =
    persen === 100 ? 'Siap submit' : persen >= 70 ? 'Hampir siap' : persen >= 40 ? 'Masih ada yang kurang' : 'Belum siap';
  return { skor, total, persen, kurang, label };
}

export function tugasTelat(tugas = [], hariIni) {
  return tugas.filter((t) => !t.selesai && selisihHari(t.tenggat, hariIni) < 0);
}
