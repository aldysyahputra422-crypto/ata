"use client";

import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/masuk/masuk.css";
import "./progres-apl.css";
import { useEffect, useRef, useState } from "react";
import { Ikon } from "../../_layar/Ikon";
import { heatmap } from "@/lib/prototype/masuk/logic/progres.js";
import { reaksiSemua } from "@/lib/prototype/shared/maskot.js";
import { ATURAN_XP, XP, aturStatus, aturStatusAkun, sisaTugas, type Tugas } from "../hari-ini/data";
import { useDataHari } from "../hari-ini/pakaiData";

const LINGKAR = 2 * Math.PI * 32;
// prototype sections whose data has no server storage yet: no numbers are shown for them
const BELUM_ADA = [
  { judul: "Timer fokus", isi: "Sesi fokus belum disimpan, jadi menit fokus belum dihitung." },
  { judul: "Kesiapan submit", isi: "Daftar cek sebelum submit belum disimpan." },
  { judul: "Check-in mingguan", isi: "Jawaban check-in belum disimpan." },
];
type Kolom = { tanggal: string; jumlah: number; masaDepan: boolean }[];

/**
 * Port of the prototype's masuk/ui/progres.js: same markup and classes. Signed in, every number is the account's
 * (/api/v1/progress): nothing is recomputed here. Signed out, the device's data.
 */
export function Progres() {
  const { muatan, sumber, akun, muat } = useDataHari();
  const [toast, setToast] = useState<string | null>(null);
  // tasks with a save in flight: a second click on the same task is ignored until the first one is answered
  const [sibuk, setSibuk] = useState<string[]>([]);
  const antre = useRef(new Set<string>());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (muatan.status === "memuat") {
    return <p className="small muted" role="status">Memuat progresmu…</p>;
  }
  if (muatan.status === "galat") {
    return (
      <div className="progres">
        <div className="card" role="alert">
          <p><strong>{sumber === "lokal" ? "Data di perangkat ini tidak bisa dibaca." : "Progres akunmu belum bisa dimuat."}</strong> Coba lagi, atau muat ulang halaman.</p>
          <button type="button" className="btn" onClick={sumber === "terputus" ? () => window.location.reload() : muat}>Coba lagi</button>
        </div>
      </div>
    );
  }

  const { data } = muatan;
  const { hariIni, tugas, slot, progres } = data;
  const selesai = tugas.filter((t) => t.selesai).length;
  const lewat = (t: Tugas) => !t.selesai && sisaTugas(t, hariIni) < 0;
  const telat = tugas.filter(lewat);
  const h = (heatmap as (a: object, o: object) => unknown)(data.aktivitas, { minggu: 12, hariIni }) as { kolom: Kolom[]; total: number };
  const nama = sumber === "akun" ? akun.nama ?? "kamu" : data.namaDemo;

  const ubah = async (t: Tugas) => {
    if (antre.current.has(t.id)) return;
    const status = t.selesai ? "belum" : "selesai";
    antre.current.add(t.id);
    setSibuk([...antre.current]);
    const r = sumber === "akun" ? await aturStatusAkun(t.id, status, progres.xp) : aturStatus(t.id, status);
    antre.current.delete(t.id);
    setSibuk([...antre.current]);
    if (r.ditolak) {
      setToast(r.ditolak === "belum-disetujui" ? "Setujui Peta Jalan dulu di tab Lomba." : r.ditolak === "gagal" ? "Belum tersimpan ke akun. Coba lagi." : "Tugas tidak ditemukan.");
      if (r.ditolak !== "gagal") muat();
      return;
    }
    if (r.baruSelesai) {
      setToast(`Selesai. +${r.xp} XP`);
      reaksiSemua("tugas-selesai");
    }
    muat();
  };

  return (
    <div className="progres">
      <header className="kepala">
        <div>
          <p className="eyebrow">Progres{data.contoh ? <> <span className="label-demo">DATA DEMO</span></> : null}</p>
          <h1>Halo {nama}</h1>
          <p className="lede">{selesai} dari {tugas.length} tugas selesai · {progres.streak} hari berturut-turut.</p>
          {sumber === "lokal" ? <p className="small muted">Belum masuk: ini data di perangkat ini, bukan data akun.</p> : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
        <img src="/prototype/assets/lompat.svg" alt="" width={78} height={78} />
      </header>

      {telat.length ? (
        <div className="banner banner--warn"><Ikon nama="alert" /><p>{telat.length} tugas lewat tenggat: {telat.map((t) => t.judul).join(", ")}.</p></div>
      ) : null}

      <div className="xp-baris" role="group" aria-label="Perkembanganmu">
        <span className="xp-baris__level"><b className="num">Level {progres.level}</b><span className="num">{progres.xp} XP</span></span>
        <span className="xp-baris__bar" role="progressbar" aria-label={`Menuju level ${progres.level + 1}`} aria-valuemin={0} aria-valuemax={XP.PER_LEVEL} aria-valuenow={progres.xpLevel}><i style={{ width: `${progres.xpLevel}%` }} /></span>
        <span className="xp-baris__streak"><Ikon nama="flame" /><b className="num">{progres.streak}</b> hari beruntun</span>
      </div>

      <section className="cincin-baris" aria-label="Kemajuan per Slot">
        {slot.length ? null : <div className="card"><p className="small muted">Belum ada Slot aktif. Pilih lomba di tab Lomba, lalu setujui Peta Jalannya.</p></div>}
        {slot.map((s) => (
          <div className="card cincin" key={s.id}>
            <div className="ring" role="img" aria-label={`${s.nama}: ${s.c.persen} persen, ${s.c.label}`}>
              <svg viewBox="0 0 76 76">
                <circle className="ring__track" cx="38" cy="38" r="32" fill="none" strokeWidth="8" />
                <circle className="ring__bar" cx="38" cy="38" r="32" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={LINGKAR.toFixed(1)} strokeDashoffset={(LINGKAR * (1 - s.c.persen / 100)).toFixed(1)} />
              </svg>
              <b>{s.c.persen}%</b>
            </div>
            <div className="cincin__isi">
              {/* h2, not the prototype's h3: the page has no h2 above it (axe heading-order) */}
              <h2>{s.nama}</h2>
              <p className={`small ${s.c.lewat ? "lewat" : "muted"}`}>{s.c.label}</p>
              <p className="small muted">{s.disetujui ? `${s.c.selesai} dari ${s.c.wajib} langkah Peta Jalan` : "Peta Jalan menunggu disetujui di Lomba"}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card__kepala"><h2>Tugas terdekat</h2><span className="pill">{selesai}/{tugas.length}</span></div>
        {tugas.length ? null : <p className="small muted">Belum ada tugas. Tugas muncul setelah Peta Jalan sebuah Slot disetujui di tab Lomba.</p>}
        <ul className="tugas">
          {tugas.map((t) => (
            <li key={t.id} className={`tugas__butir ${t.selesai ? "tugas__butir--selesai" : ""}`}>
              <label>
                <input type="checkbox" data-tugas={t.id} checked={t.selesai} disabled={sibuk.includes(t.id)} onChange={() => void ubah(t)} />
                <span className="tugas__teks">{t.judul}<span className="tugas__slot small muted">{t.slotNama}</span></span>
              </label>
              <span className={`pill num ${lewat(t) ? "pill--telat" : ""}`}>{t.tenggat.slice(8)}/{t.tenggat.slice(5, 7)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="card__kepala"><h2>Aktivitas 12 minggu</h2><span className="pill num">{h.total} aktivitas</span></div>
        {h.total ? null : <p className="small muted">Belum ada tugas yang selesai dalam dua belas minggu terakhir.</p>}
        <div className="heatmap" role="img" aria-label={`Heatmap aktivitas ${h.total} dalam dua belas minggu`}>
          {h.kolom.map((k) => (
            <div className="heatmap__kolom" key={k[0].tanggal}>
              {k.map((s) => (
                // `level` is the prototype's own attribute; its CSS selects on it
                <span key={s.tanggal} className={`heatmap__sel ${s.masaDepan ? "heatmap__sel--depan" : ""}`} data-n={s.jumlah} title={`${s.tanggal}: ${s.jumlah} aktivitas`} {...{ level: Math.min(3, s.jumlah) }} />
              ))}
            </div>
          ))}
        </div>
        <details className="heatmap__tabel">
          <summary className="small muted">Lihat sebagai tabel</summary>
          <table className="tabel-sederhana">
            <caption className="sr-only">Jumlah aktivitas per hari, dua belas minggu terakhir</caption>
            <thead><tr><th scope="col">Minggu</th><th scope="col">Total aktivitas</th></tr></thead>
            <tbody>
              {h.kolom.map((k, i) => (
                <tr key={k[0].tanggal}><td>Minggu {i + 1} (mulai {k[0].tanggal})</td><td>{k.reduce((n, s) => n + s.jumlah, 0)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="card">
        <div className="card__kepala"><h2>Pencapaian</h2><span className="pill num">{progres.pencapaian.filter((p) => p.dapat).length}/{progres.pencapaian.length}</span></div>
        {progres.pencapaian.length ? null : <p className="small muted">Belum ada pencapaian.</p>}
        <ul className="pencapaian">
          {progres.pencapaian.map((p) => (
            <li key={p.nama} className={p.dapat ? "is-dapat" : ""}>
              <Ikon nama={p.dapat ? "check" : "minus"} />
              <span><b>{p.nama}</b> · {p.syarat}</span>
            </li>
          ))}
        </ul>
        <details className="xp-aturan">
          <summary>Cara XP dihitung</summary>
          <ul>{(ATURAN_XP as string[]).map((a) => <li key={a}>{a}</li>)}</ul>
        </details>
      </section>

      {BELUM_ADA.map((b) => (
        <section className="card" key={b.judul}>
          <div className="card__kepala"><h2>{b.judul}</h2><span className="pill">Belum tersedia</span></div>
          <p className="small muted">{b.isi}</p>
        </section>
      ))}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
