"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ikon } from "../../_layar/Ikon";
import { Sheet } from "../../_layar/Lapisan";
import { bacaAkun } from "../../_layar/akun";
import { TAB, useDemo } from "../Cangkang";
import { ATURAN_XP, XP, aturStatus, bacaHariIni, dengar, dengarHari, prioritas, resetDemo, type DataHariIni, type Paket, type StatusTugas, type Tugas } from "./data";
// prototype modules, copied verbatim (mascot, folder tilt)
import { buatMaskot, reaksiSemua } from "@/lib/prototype/shared/maskot.js";
import { pasangCondong } from "@/lib/prototype/shared/gerak.js";

const IKON_SARAN: Record<string, string> = { telat: "alert", dekat: "clock", peta: "route", mulai: "flag", nyata: "trophy" };
const STATUS_LABEL: Record<StatusTugas, string> = { belum: "Belum dimulai", dikerjakan: "Sedang dikerjakan", selesai: "Selesai" };
const KELOMPOK = [
  { id: "telat", judul: "Terlambat", cocok: (n: number) => n < 0 },
  { id: "segera", judul: "Hari ini & besok", cocok: (n: number) => n >= 0 && n <= 1 },
  { id: "minggu", judul: "Minggu ini", cocok: (n: number) => n >= 2 && n <= 7 },
  { id: "nanti", judul: "Nanti", cocok: (n: number) => n > 7 },
];
const TEMA = [
  { id: "sistem", label: "Sistem" },
  { id: "terang", label: "Terang" },
  { id: "gelap", label: "Gelap" },
] as const;
type Tema = (typeof TEMA)[number]["id"];

const hariIndo = () => new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const tanggalPendek = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const hitungMundur = (n: number) => (n < 0 ? `telat ${-n} hari` : n === 0 ? "hari ini" : n === 1 ? "besok" : `${n} hari lagi`);
const hrefTab = (id: string) => TAB.find((t) => t.id === id)?.href ?? "/hari-ini";

type Muatan = { status: "memuat" } | { status: "galat" } | { status: "siap"; data: DataHariIni };

/** Port of the prototype's app/ui/hari-ini.js: same markup and classes. Slot limit and name come from /api/v1/me. */
export function HariIni() {
  const router = useRouter();
  const demo = useDemo();
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [akun, setAkun] = useState<{ batas?: number; nama?: string; paket?: Paket }>({});
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [tema, setTema] = useState<Tema>("sistem");
  const tempatMaskot = useRef<HTMLImageElement>(null);
  const akar = useRef<HTMLDivElement>(null);

  const batas = akun.batas;
  const paket = akun.paket;
  const muat = useCallback(() => {
    try {
      setMuatan({ status: "siap", data: bacaHariIni(batas, paket) });
    } catch {
      setMuatan({ status: "galat" });
    }
  }, [batas, paket]);

  useEffect(() => {
    muat();
    const lepas = [dengar(muat), dengarHari(muat)];
    return () => lepas.forEach((f) => f());
  }, [muat]);

  // Plan and name come from the server only; a failed call keeps the device's own limit.
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTema(t === "dark" ? "gelap" : t === "light" ? "terang" : "sistem");
    void bacaAkun().then((r) => {
      if (!r.ok) return;
      const { plan, slot_limits, user } = r.data;
      setAkun({
        batas: plan.features.activeSlots?.limit ?? slot_limits[plan.plan === "pro" ? "pro" : "free"],
        nama: user?.display_name?.trim().split(/\s+/)[0] || undefined,
        paket: plan.plan === "pro" ? "pro" : "gratis",
      });
    });
  }, []);

  const siap = muatan.status === "siap";
  useEffect(() => {
    if (!siap || !tempatMaskot.current) return;
    const maskot = buatMaskot({ ukuran: 64 });
    tempatMaskot.current.after(maskot.el);
    return () => maskot.lepas();
  }, [siap]);

  const jumlahSlot = siap ? muatan.data.slot.length : 0;
  useEffect(() => {
    akar.current?.querySelectorAll<HTMLElement>(".folder-ata:not(.folder-ata--kosong)").forEach((f) => pasangCondong(f, { maks: 6 }));
  }, [jumlahSlot]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (muatan.status === "memuat") {
    return <p className="small muted" role="status">Memuat Slot dan tugasmu…</p>;
  }
  if (muatan.status === "galat") {
    return (
      <div className="tugas-kosong" role="alert">
        <p><strong>Data di perangkat ini tidak bisa dibaca.</strong> Coba lagi, atau muat ulang halaman.</p>
        <button type="button" className="btn btn--kecil" onClick={muat}>Coba lagi</button>
      </div>
    );
  }

  const { data } = muatan;
  const { hariIni, tugas, slot, saran, progres } = data;
  const batasSlot = batas ?? data.batasLokal;
  const sisa = (t: Tugas) => Math.round((Date.parse(`${t.tenggat}T00:00:00Z`) - Date.parse(`${hariIni}T00:00:00Z`)) / 864e5);
  const belum = tugas.filter((t) => !t.selesai).sort((a, b) => a.tenggat.localeCompare(b.tenggat));
  const selesai = tugas.filter((t) => t.selesai).length;
  const selesaiHariIni = tugas.filter((t) => t.selesai && t.selesaiPada === hariIni).length;
  const dekat = slot.slice().sort((a, b) => (a.c.sisaHari ?? Infinity) - (b.c.sisaHari ?? Infinity))[0];
  const keTab = (id: string) => router.push(hrefTab(id));

  const ubah = (id: string, status: StatusTugas) => {
    const r = aturStatus(id, status);
    if (r.ditolak) return setToast(r.ditolak === "belum-disetujui" ? "Setujui Peta Jalan dulu di tab Lomba." : "Tugas tidak ditemukan.");
    if (r.baruSelesai) {
      setToast(`Selesai. +${r.xp} XP`);
      reaksiSemua("tugas-selesai");
    } else if (status === "dikerjakan") setToast("Ditandai sedang dikerjakan");
    muat();
  };

  const gantiTema = (t: Tema) => {
    setTema(t);
    const d = document.documentElement.dataset;
    if (t === "gelap") d.theme = "dark";
    else if (t === "terang") d.theme = "light";
    else delete d.theme;
  };

  return (
    <div ref={akar} style={{ display: "contents" }}>
      <div className="kepala-apl">
        {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
        <img ref={tempatMaskot} className="kepala-apl__logo" src="/prototype/assets/logo.svg" alt="Sobat Ambis" height={24} />
        <button type="button" className="ikon-apl" id="bukaDemo" aria-label="Pengaturan tampilan" onClick={() => setPanel(true)}>
          <Ikon nama="sparkle" />
        </button>
      </div>
      <div className="judul-layar">
        <h1>Hari Ini</h1>
        <p className="hari">{hariIndo()}{data.contoh ? <> <span className="label-demo">DATA DEMO</span></> : null}</p>
      </div>

      <div className="hari-grid">
        <div className="hari-kolom hari-kolom--kiri">
          <section className="sapaan fx-rise" style={{ "--i": 0 } as React.CSSProperties} aria-label="Sapaan">
            {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
            <img src="/prototype/assets/melambai.svg" alt="Ata melambai" />
            <div>
              <h2>Selamat pagi, {akun.nama ?? data.namaDemo}</h2>
              <p>
                {dekat ? <><strong>{dekat.nama}</strong>: {dekat.c.label.toLowerCase()}.</> : "Belum ada Slot aktif."}{" "}
                {data.telat ? `${data.telat} tugas lewat tenggat.` : "Tidak ada yang lewat tenggat."}
              </p>
            </div>
          </section>

          <div className="angka-baris fx-rise" role="list" style={{ "--i": 1 } as React.CSSProperties} aria-label="Ringkasan hari ini">
            <div className="angka-kotak" role="listitem"><b>{selesai}/{tugas.length}</b><span>Tugas selesai</span></div>
            <div className="angka-kotak" role="listitem"><b>{progres.streak}</b><span>Hari berturut</span></div>
            <div className="angka-kotak" role="listitem"><b>{slot.length}</b><span>Slot aktif</span></div>
          </div>

          <section className="slot-kartu fx-rise" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="judulSlot">
            <div className="card__kepala">
              <h2 id="judulSlot">Slot lomba</h2>
              <button type="button" className="linkbtn" onClick={() => keTab("lomba")}>Kelola</button>
            </div>
            {data.lebih ? (
              <p className="slot-lebih">
                <Ikon nama="alert" />
                <span><strong>{data.lebih.ringkas}</strong> {data.lebih.rinci} <Link href="/lomba#slot">{data.lebih.arahan}</Link>.</span>
              </p>
            ) : null}
            <div className="daftar-slot">
              {slot.length ? null : <p className="small muted">Belum ada Slot aktif. Pilih lomba di tab Lomba.</p>}
              {slot.map((s) => (
                <Link
                  key={s.id}
                  className="slot-baris folder-ata"
                  href="/lomba#slot"
                >
                  <span className="folder-ata__belakang" style={s.gambar ? { backgroundImage: `url('/prototype/${s.gambar}')` } : undefined} />
                  <span className="folder-ata__kertas" aria-hidden="true">
                    <span className="folder-ata__kertas-label">{s.kertas.judul}</span>
                    <span className="folder-ata__kertas-isi">{s.kertas.isi}</span>
                    <span className={`folder-ata__kertas-meta${s.kertas.telat ? " is-telat" : ""}`}>{s.kertas.meta}</span>
                  </span>
                  <span className="folder-ata__depan">
                    <span className="folder-ata__teks">
                      <strong>{s.nama}</strong>
                      <span className="folder-ata__meta">{`${s.c.label} · ${s.disetujui ? `${s.c.selesai}/${s.c.wajib} langkah` : "Peta belum disetujui"}`}</span>
                    </span>
                    <span className="folder-ata__aksi" aria-hidden="true"><Ikon nama="right" /></span>
                  </span>
                  <span className="folder-ata__progres" style={{ "--p": `${s.c.persen}%` } as React.CSSProperties} aria-hidden="true" />
                </Link>
              ))}
              {slot.length && slot.length < batasSlot ? (
                <Link className="folder-ata folder-ata--kosong" href={hrefTab("lomba")}>
                  <span className="folder-ata__belakang" />
                  <span className="folder-ata__depan">
                    <span className="folder-ata__teks">
                      <strong>Slot kosong</strong>
                      <span className="folder-ata__meta">{batasSlot - slot.length} tersisa · pilih dari Radar</span>
                    </span>
                    <span className="folder-ata__aksi folder-ata__aksi--tambah" aria-hidden="true"><Ikon nama="plus" /></span>
                  </span>
                </Link>
              ) : null}
            </div>
          </section>
        </div>

        <div className="hari-kolom hari-kolom--kanan">
          <section className="card langkah fx-rise" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="judulLangkah">
            <div className="card__kepala"><h2 id="judulLangkah">Langkah berikutnya</h2><span className="pill">dari datamu</span></div>
            {saran.length ? (
              <ol className="langkah__daftar">
                {saran.map((x, i) => {
                  const pr = (x.prioritas || "Sedang").toLowerCase();
                  const status = x.status ?? "belum";
                  return (
                    <li key={x.id} className={`langkah__butir langkah__butir--${x.jenis} fx-rise`} style={{ "--i": 3 + i } as React.CSSProperties}>
                      <Ikon nama={IKON_SARAN[x.jenis] || "sparkle"} className="langkah__ikon" />
                      <span className="langkah__teks">
                        <strong>{x.judul}</strong>
                        <span className="langkah__alasan"><b>Kenapa:</b> {x.alasan}</span>
                        <span className="langkah__meta">
                          <span className={`prioritas prioritas--${pr}`}>Prioritas {pr}</span>
                          {x.tugasId ? <span className={`status-tugas status-tugas--${status}`}>{STATUS_LABEL[status]}</span> : null}
                        </span>
                      </span>
                      <span className="langkah__tombol">
                        {x.tugasId && status !== "dikerjakan" ? (
                          <button type="button" className="btn btn--kecil" onClick={() => ubah(x.tugasId as string, "dikerjakan")}><Ikon nama="play" />Mulai</button>
                        ) : null}
                        {x.tugasId ? (
                          <button type="button" className="btn btn--kecil btn--primary" onClick={() => ubah(x.tugasId as string, "selesai")}><Ikon nama="check" />Selesai</button>
                        ) : (
                          <button type="button" className="btn btn--kecil langkah__aksi" onClick={() => keTab(x.aksi.tab)}>{x.label}</button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="small muted">Tidak ada yang mendesak hari ini. Semua tugas masih sesuai jadwal.</p>
            )}
            <p className="langkah__catatan">Disusun dari Slot, Peta Jalan, dan tenggatmu dengan aturan tetap (bukan tebakan AI). Estimasi waktu belum ditampilkan karena belum ada data durasi pengerjaanmu.</p>
          </section>

          <section className="card tugas-kartu fx-rise" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="judulTugas">
            <div className="card__kepala"><h2 id="judulTugas">Tugas terdekat</h2><span className="pill num">{belum.length} tersisa</span></div>
            <div className="xp-baris" role="group" aria-label="Perkembanganmu">
              <span className="xp-baris__level"><b className="num">Level {progres.level}</b><span className="num">{progres.xp} XP</span></span>
              <span className="xp-baris__bar" role="progressbar" aria-label={`Menuju level ${progres.level + 1}`} aria-valuemin={0} aria-valuemax={XP.PER_LEVEL} aria-valuenow={progres.xpLevel}><i style={{ width: `${progres.xpLevel}%` }} /></span>
              <span className="xp-baris__streak"><Ikon nama="flame" /><b className="num">{progres.streak}</b> hari beruntun</span>
            </div>
            {belum.length ? (
              KELOMPOK.map((k) => {
                const isi = belum.filter((t) => k.cocok(sisa(t)));
                if (!isi.length) return null;
                return (
                  <div key={k.id} className={`tugas-grup tugas-grup--${k.id}`}>
                    <h3>{k.judul}</h3>
                    <ul className="tugas-daftar">
                      {isi.slice(0, 4).map((t) => {
                        const n = sisa(t);
                        const pr = prioritas(t, hariIni);
                        const dikerjakan = t.status === "dikerjakan";
                        return (
                          <li key={t.id} className={`tugas-item tugas-item--${t.status}`}>
                            <button type="button" className="tugas-cek" aria-label={`Tandai selesai: ${t.judul}`} onClick={() => ubah(t.id, "selesai")}><Ikon nama="check" /></button>
                            <span className="tugas-item__teks">
                              <strong>{t.judul}</strong>
                              <span className="tugas-item__meta">
                                <span className={`tenggat${n < 0 ? " tenggat--telat" : ""}`}>{tanggalPendek(t.tenggat)} · {hitungMundur(n)}</span>
                                <span className={`prioritas prioritas--${pr.tingkat}`}>{pr.label}</span>
                                <span className="muted">{t.slotNama}</span>
                              </span>
                            </span>
                            <button
                              type="button"
                              className="btn btn--kecil tugas-item__status"
                              aria-label={`${dikerjakan ? "Dikerjakan, tandai belum dimulai" : "Mulai mengerjakan"}: ${t.judul}`}
                              onClick={() => ubah(t.id, dikerjakan ? "belum" : "dikerjakan")}
                            >
                              {dikerjakan ? "Dikerjakan" : "Mulai"}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
            ) : (
              <div className="tugas-kosong">
                {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
                <img src="/prototype/assets/jempol.svg" alt="" width={64} height={64} />
                <p>
                  <strong>Tidak ada tugas terbuka.</strong>{" "}
                  {tugas.length ? "Semua langkah Peta Jalan yang disetujui sudah selesai." : "Setujui Peta Jalan di tab Lomba supaya langkahnya muncul di sini."}
                </p>
              </div>
            )}
            {selesaiHariIni ? <p className="tugas-selesai-hari"><Ikon nama="check" />{selesaiHariIni} selesai hari ini</p> : null}
            <div className="tugas-kaki">
              <button type="button" className="btn btn--kecil" onClick={() => keTab("progres")}>Buka Progres</button>
              <details className="xp-aturan">
                <summary>Cara XP dihitung</summary>
                <ul>{(ATURAN_XP as string[]).map((a) => <li key={a}>{a}</li>)}</ul>
                <ul className="pencapaian">
                  {progres.pencapaian.map((p) => (
                    <li key={p.nama} className={p.dapat ? "is-dapat" : ""}>
                      <Ikon nama={p.dapat ? "check" : "minus"} />
                      <span><b>{p.nama}</b> · {p.syarat}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </section>

          <button type="button" className="btn btn--primary btn--block fx-tekan tanya-pintu" onClick={() => keTab("tanya")}><Ikon nama="chat" />Tanya Ata soal rencanamu</button>
        </div>
      </div>

      {toast ? <div className="toast" role="status">{toast}</div> : null}

      {panel ? (
        <Sheet judul="Pengaturan tampilan" onTutup={() => setPanel(false)}>
          <div className="demo-baris">
            <span>Tema</span>
            <div className="seg seg--mini" role="radiogroup" aria-label="Tema">
              {TEMA.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={tema === t.id} onClick={() => gantiTema(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>
          {demo ? (
            <button
              type="button"
              className="btn btn--block"
              onClick={() => {
                resetDemo();
                muat();
                setPanel(false);
              }}
            >
              Reset data demo
            </button>
          ) : null}
          <button type="button" className="btn btn--primary btn--block" onClick={() => setPanel(false)}>Tutup</button>
        </Sheet>
      ) : null}
    </div>
  );
}
