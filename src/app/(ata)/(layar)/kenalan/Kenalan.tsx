"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ikon } from "../../_layar/Ikon";
import { bacaAkun, bacaProfil, selesaikanOnboarding, simpanProfil, TAHUN_LAHIR_MIN, tahunLahirMaks } from "../../_layar/akun";
import { dariProfil, periksa, SEMUA, ubahLangkah, type Jawaban } from "../../_layar/profil";
import { MINAT, TARGET } from "@/lib/prototype/masuk/data/onboarding.js";
import { kenalPersen, MINAT_MAKS } from "@/lib/prototype/masuk/logic/onboarding.js";

type Muatan =
  | { status: "memuat" }
  | { status: "galat"; pesan: string }
  | { status: "keluar" }
  | { status: "siap" };

/** Port of the prototype's masuk/ui/onboarding.js: same markup and classes; every answer is saved to the account. */
export function Kenalan() {
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [d, setD] = useState<Jawaban>({ nama: "", jenjang: "", tahunLahir: "", sekolah: "", minat: [], target: [], jam: "" });
  const [i, setI] = useState(0);
  const [selesai, setSelesai] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  // a second tap while a save is in flight must not send a second request
  const kunci = useRef(false);
  const judul = useRef<HTMLHeadingElement>(null);

  const muat = useCallback(async () => {
    setMuatan({ status: "memuat" });
    const akun = await bacaAkun();
    if (!akun.ok) return setMuatan({ status: "galat", pesan: akun.pesan });
    if (!akun.data.signed_in) return setMuatan({ status: "keluar" });
    const profil = await bacaProfil();
    if (!profil.ok) return setMuatan(profil.status === 401 ? { status: "keluar" } : { status: "galat", pesan: profil.pesan });
    const p = profil.data.profile;
    const awal = dariProfil(p);
    setD(awal);
    setSelesai(p.onboarding_done);
    // resume at the first required answer that is still missing
    const kosong = SEMUA.findIndex((l) => l.wajib && periksa(l, awal));
    setI(kosong < 0 ? 0 : kosong);
    setMuatan({ status: "siap" });
  }, []);
  useEffect(() => { void muat(); }, [muat]);

  const langkahKe = (n: number) => {
    setGalat(null);
    setI(n);
    requestAnimationFrame(() => judul.current?.focus());
  };

  if (muatan.status === "memuat") {
    return <div className="onboard"><p className="small muted" role="status">Memuat profilmu dari server…</p></div>;
  }
  if (muatan.status === "galat") {
    return (
      <div className="onboard">
        <div className="error" role="alert">
          <Ikon nama="alert" />
          <div><strong>Profil belum bisa dimuat.</strong><p>{muatan.pesan}</p></div>
        </div>
        <button type="button" className="btn" onClick={muat}>Coba lagi</button>
      </div>
    );
  }
  if (muatan.status === "keluar") {
    return (
      <div className="onboard">
        <h1>Masuk dulu untuk kenalan</h1>
        <p className="lede">Jawabanmu disimpan di akun, jadi kamu perlu masuk dengan Google lebih dulu.</p>
        <div className="btn-row">
          <Link className="btn btn--primary" href="/">Masuk</Link>
          <Link className="btn btn--ghost" href="/hari-ini">Pakai tanpa akun</Link>
        </div>
      </div>
    );
  }

  if (selesai) {
    return (
      <div className="onboard">
        <div className="onboard__selesai">
          {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, official mascot SVG */}
          <img src="/prototype/assets/jempol.svg" alt="Ata mengacungkan jempol" width={150} height={150} />
          <h1 ref={judul} tabIndex={-1}>Selesai, {d.nama}</h1>
          <p className="lede">Aku sudah kenal kamu {kenalPersen(d)}%. Profil tersimpan di akunmu dan bisa kamu ubah kapan saja di tab Profil.</p>
        </div>
        <div className="card">
          <h2>Kode Sobat Ambis</h2>
          <p className="small">Punya kode dari program Sobat Ambis? Tukarkan di halaman Paket. Boleh dilewati.</p>
          <Link className="btn" href="/paket">Buka Paket</Link>
        </div>
        <div className="btn-row">
          <Link className="btn btn--primary" id="mulai" href="/hari-ini">Mulai pakai Ata</Link>
          <button type="button" className="btn btn--ghost" id="ulangOnboard" onClick={() => { setSelesai(false); langkahKe(0); }}>Ubah jawaban</button>
        </div>
      </div>
    );
  }

  const total = SEMUA.length;
  const l = SEMUA[i];
  const akhir = i === total - 1;

  const lanjut = async (lewati: boolean) => {
    if (kunci.current) return;
    if (!lewati) {
      const salah = periksa(l, d);
      if (salah) {
        setGalat(salah);
        document.getElementById("jawab")?.focus();
        return;
      }
    }
    kunci.current = true;
    setSibuk(true);
    setGalat(null);
    const simpan = lewati ? null : await simpanProfil(ubahLangkah(l.kunci, d));
    const tutup = simpan && !simpan.ok ? simpan : akhir ? await selesaikanOnboarding() : null;
    kunci.current = false;
    setSibuk(false);
    if (tutup && !tutup.ok) return setGalat(tutup.pesan);
    if (akhir) {
      setSelesai(true);
      requestAnimationFrame(() => judul.current?.focus());
    } else langkahKe(i + 1);
  };

  const pilihChip = (o: string) => {
    const k = l.kunci as "minat" | "target";
    const kini = d[k];
    if (!kini.includes(o) && k === "minat" && kini.length >= MINAT_MAKS) return setGalat("Maksimal lima minat. Lepas satu dulu.");
    setGalat(null);
    setD({ ...d, [k]: kini.includes(o) ? kini.filter((x) => x !== o) : [...kini, o] });
  };

  const opsiChip = l.kunci === "minat" ? (MINAT as string[]) : l.kunci === "target" ? (TARGET as string[]) : l.opsi ?? [];
  const nilai = d[l.kunci as keyof Jawaban];

  return (
    <div className="onboard">
      <div className="onboard__atas">
        <span className="eyebrow">Langkah {i + 1} dari {total}</span>
        <span className="pill">Ata kenal kamu {kenalPersen(d)}%</span>
      </div>
      <div className="onboard__bar" role="img" aria-label={`Langkah ${i + 1} dari ${total}`}>
        <span style={{ width: `${Math.round(((i + 1) / total) * 100)}%` }} />
      </div>

      <h1 ref={judul} tabIndex={-1}>{l.judul}</h1>
      <p className="lede">{l.tanya}</p>

      <div className="field">
        {l.jenis === "teks" || l.jenis === "tahun" ? (
          <>
            <label className="sr-only" htmlFor="jawab">{l.judul}</label>
            <input
              className="input"
              id="jawab"
              key={l.id}
              {...(l.jenis === "tahun" ? { type: "number", inputMode: "numeric", min: TAHUN_LAHIR_MIN, max: tahunLahirMaks() } : { maxLength: l.kunci === "nama" ? 30 : 120 })}
              autoComplete={l.kunci === "nama" ? "nickname" : l.kunci === "sekolah" ? "organization" : "off"}
              value={String(nilai ?? "")}
              placeholder={l.contoh ?? ""}
              aria-describedby="galatLangkah"
              aria-invalid={galat ? true : undefined}
              onChange={(e) => setD({ ...d, [l.kunci]: l.jenis === "tahun" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") void lanjut(false); }}
            />
          </>
        ) : l.jenis === "pilihan" ? (
          <div className="pilih" id="pilih" role="radiogroup" aria-label={l.judul}>
            {(l.opsi ?? []).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={nilai === o} className="pilih__butir" onClick={() => { setGalat(null); setD({ ...d, [l.kunci]: o }); }}>{o}</button>
            ))}
          </div>
        ) : (
          <>
            <div className="pilih pilih--multi" id="pilih" role="group" aria-label={l.judul}>
              {opsiChip.map((o) => (
                <button key={o} type="button" className="pilih__butir" aria-pressed={(nilai as string[]).includes(o)} onClick={() => pilihChip(o)}>{o}</button>
              ))}
            </div>
            {l.kunci === "minat" ? <p className="small muted" id="hitungMinat">{d.minat.length} dari {MINAT_MAKS} dipilih.</p> : null}
          </>
        )}
        <span className="galat" id="galatLangkah" role="alert" hidden={!galat}>{galat}</span>
      </div>

      <p className="small muted">{l.wajib ? "Wajib diisi." : "Boleh dilewati."} Jawaban disimpan di akunmu saat kamu menekan Lanjut.</p>

      <div className="btn-row">
        <button type="button" className="btn" id="kembali" disabled={i === 0 || sibuk} onClick={() => langkahKe(i - 1)}>Kembali</button>
        {l.wajib ? null : <button type="button" className="btn btn--ghost" id="lewati" disabled={sibuk} onClick={() => void lanjut(true)}>Lewati</button>}
        <button type="button" className="btn btn--primary" id="lanjut" disabled={sibuk} onClick={() => void lanjut(false)}>
          {sibuk ? "Menyimpan…" : akhir ? "Selesai" : "Lanjut"}
        </button>
      </div>
    </div>
  );
}
