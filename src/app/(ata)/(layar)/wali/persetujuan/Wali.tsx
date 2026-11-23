"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../_layar/Ikon";
import { jawabWali, KATEGORI_IZIN, lihatTautanWali, tanggal, tarikWali, type TautanWali } from "../../../_layar/akun";

type Muatan =
  | { status: "memuat" }
  | { status: "kosong" }
  | { status: "tidak-berlaku" }
  | { status: "galat"; pesan: string }
  | { status: "siap"; token: string; t: TautanWali }
  | { status: "disetujui"; tautanCabut: string }
  | { status: "ditolak" }
  | { status: "dicabut" };

const TOKEN = /^#[tc]=([A-Za-z0-9_-]{43})$/;

/** Guardian-facing confirmation and withdrawal (FR-AUTH-07). Uses the prototype's onboarding markup and classes. */
export function Wali() {
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [nama, setNama] = useState("");
  const [benar, setBenar] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);
  const judul = useRef<HTMLHeadingElement>(null);

  const muat = useCallback(async () => {
    const token = TOKEN.exec(window.location.hash)?.[1];
    if (!token) return setMuatan({ status: "kosong" });
    setMuatan({ status: "memuat" });
    const r = await lihatTautanWali(token);
    if (r.ok) return setMuatan({ status: "siap", token, t: r.data });
    setMuatan(r.status === 404 || r.status === 422 ? { status: "tidak-berlaku" } : { status: "galat", pesan: r.pesan });
  }, []);
  useEffect(() => {
    void muat();
    // a link pasted into a tab that already shows this page changes only the fragment
    window.addEventListener("hashchange", muat);
    return () => window.removeEventListener("hashchange", muat);
  }, [muat]);

  const akhiri = (m: Muatan) => {
    // the used token leaves the address bar and history entry
    window.history.replaceState(null, "", window.location.pathname);
    setMuatan(m);
    requestAnimationFrame(() => judul.current?.focus());
  };

  const jalankan = async <T,>(aksi: () => Promise<{ ok: true; data: T } | { ok: false; pesan: string; status?: number }>, selesai: (data: T) => Muatan) => {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    setGalat(null);
    const r = await aksi();
    kunci.current = false;
    setSibuk(false);
    if (r.ok) return akhiri(selesai(r.data));
    if (r.status === 404) return akhiri({ status: "tidak-berlaku" });
    setGalat(r.pesan);
  };

  if (muatan.status === "memuat") {
    return <div className="onboard"><p className="small muted" role="status">Memeriksa tautan…</p></div>;
  }
  if (muatan.status === "galat") {
    return (
      <div className="onboard">
        <div className="error" role="alert">
          <Ikon nama="alert" />
          <div><strong>Tautan belum bisa diperiksa.</strong><p>{muatan.pesan}</p></div>
        </div>
        <button type="button" className="btn" onClick={muat}>Coba lagi</button>
      </div>
    );
  }
  if (muatan.status === "kosong" || muatan.status === "tidak-berlaku") {
    return (
      <div className="onboard">
        <h1 ref={judul} tabIndex={-1}>{muatan.status === "kosong" ? "Buka tautan dari email" : "Tautan tidak berlaku"}</h1>
        <p className="lede">
          {muatan.status === "kosong"
            ? "Halaman ini untuk orang tua/wali. Buka tautan lengkap yang dikirim Ata ke email Anda."
            : "Tautan ini sudah dipakai, kedaluwarsa, atau dibatalkan. Tidak ada yang berubah. Minta anak Anda mengirim permintaan baru dari aplikasi Ata."}
        </p>
      </div>
    );
  }
  if (muatan.status === "disetujui") {
    return (
      <div className="onboard">
        <h1 ref={judul} tabIndex={-1}>Persetujuan tercatat</h1>
        <p className="lede">Terima kasih. Anak Anda sekarang bisa memilih sendiri kategori data yang boleh dibaca fitur AI Ata.</p>
        <div className="card">
          <h2>Simpan tautan pencabutan</h2>
          <p className="small">Tautan ini hanya ditampilkan sekali. Dengan membukanya, Anda bisa mencabut persetujuan kapan saja tanpa akun.</p>
          <div className="field">
            <label htmlFor="tautanCabut">Tautan pencabutan</label>
            <input className="input" id="tautanCabut" readOnly value={muatan.tautanCabut} onFocus={(e) => e.target.select()} />
          </div>
        </div>
      </div>
    );
  }
  if (muatan.status === "ditolak" || muatan.status === "dicabut") {
    return (
      <div className="onboard">
        <h1 ref={judul} tabIndex={-1}>{muatan.status === "ditolak" ? "Permintaan ditolak" : "Persetujuan dicabut"}</h1>
        <p className="lede">
          {muatan.status === "ditolak"
            ? "Tidak ada data anak Anda yang diproses fitur AI Ata. Tautan ini tidak bisa dipakai lagi."
            : "Semua izin AI di akun anak Anda sudah dimatikan. Fitur AI Ata tidak lagi memproses datanya."}
        </p>
      </div>
    );
  }

  const { token, t } = muatan;
  const anak = t.student_name ?? "Anak Anda";
  const cakupan = (
    <ul className="small">
      {KATEGORI_IZIN.filter((k) => t.scope.includes(k.id)).map((k) => <li key={k.id}><strong>{k.nama}:</strong> {k.isi}</li>)}
    </ul>
  );

  if (t.kind === "withdraw") {
    return (
      <div className="onboard">
        <span className="eyebrow">Untuk orang tua/wali</span>
        <h1 ref={judul} tabIndex={-1}>Cabut persetujuan untuk {anak}?</h1>
        <p className="lede">Anda menyetujui pemrosesan AI atas data {anak}{t.verified_at ? ` pada ${tanggal(t.verified_at)}` : ""}. Jika dicabut, semua izin AI di akunnya langsung mati.</p>
        <span className="galat" role="alert" hidden={!galat}>{galat}</span>
        <div className="btn-row">
          <button type="button" className="btn btn--bahaya" id="cabut" disabled={sibuk} onClick={() => void jalankan(() => tarikWali(token), () => ({ status: "dicabut" }))}>{sibuk ? "Mencabut…" : "Cabut persetujuan"}</button>
        </div>
      </div>
    );
  }

  const setuju = () => {
    if (nama.trim().length < 2) {
      setGalat("Ketik nama lengkap Anda.");
      return document.getElementById("namaWali")?.focus();
    }
    if (!benar) {
      setGalat("Centang pernyataan bahwa Anda orang tua/wali.");
      return document.getElementById("sayaWali")?.focus();
    }
    void jalankan(
      () => jawabWali(token, { approve: true, verifier_name: nama.trim(), is_guardian: true }),
      (d) => (d.status === "verified" ? { status: "disetujui", tautanCabut: `${window.location.origin}${window.location.pathname}#c=${d.withdraw_token}` } : { status: "ditolak" }),
    );
  };

  return (
    <form className="onboard" noValidate onSubmit={(e) => { e.preventDefault(); setuju(); }}>
      <span className="eyebrow">Untuk orang tua/wali</span>
      <h1 ref={judul} tabIndex={-1}>Persetujuan untuk {anak}</h1>
      <p className="lede">{anak} mendaftar di Ata, aplikasi pendamping lomba pelajar, dan mencantumkan {t.guardian_name ?? "Anda"} sebagai orang tua/wali. Karena usianya di bawah 18 tahun, Ata memerlukan persetujuan Anda.</p>
      <div className="card">
        <h2>Yang Anda setujui</h2>
        <p className="small">Fitur AI Ata boleh memproses kategori data berikut milik {anak}, hanya untuk kategori yang ia nyalakan sendiri:</p>
        {cakupan}
        <p className="small muted">Tanpa persetujuan Anda, tidak ada data yang diproses AI. Anda bisa mencabutnya kapan saja. Versi persetujuan: {t.version}.</p>
      </div>
      <div className="field">
        <label htmlFor="namaWali">Nama lengkap Anda</label>
        <input className="input" id="namaWali" maxLength={80} autoComplete="name" value={nama} aria-describedby="galatWali" onChange={(e) => { setGalat(null); setNama(e.target.value); }} />
      </div>
      <label className="small" htmlFor="sayaWali">
        <input type="checkbox" id="sayaWali" checked={benar} onChange={(e) => { setGalat(null); setBenar(e.target.checked); }} />{" "}
        Saya orang tua/wali sah dari {anak} dan menyetujui pemrosesan di atas.
      </label>
      <span className="galat" id="galatWali" role="alert" hidden={!galat}>{galat}</span>
      <div className="btn-row">
        <button type="submit" className="btn btn--primary" id="setuju" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Saya setuju"}</button>
        <button type="button" className="btn btn--ghost" id="tolak" disabled={sibuk} onClick={() => void jalankan(() => jawabWali(token, { approve: false }), () => ({ status: "ditolak" }))}>Tolak</button>
      </div>
    </form>
  );
}
