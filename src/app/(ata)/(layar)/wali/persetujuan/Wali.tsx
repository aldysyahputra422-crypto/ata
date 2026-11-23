"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ikon } from "../../../_layar/Ikon";
import { jawabWali, KATEGORI_IZIN, lihatTautanWali, tanggal, tanggalLahir, tarikWali, type TautanWali } from "../../../_layar/akun";

type Muatan =
  | { status: "memuat" }
  | { status: "kosong" }
  | { status: "tidak-berlaku" }
  | { status: "galat"; pesan: string }
  | { status: "siap"; token: string; t: TautanWali }
  | { status: "disetujui"; tautanCabut: string }
  | { status: "ditolak"; hapus?: boolean; koreksi?: boolean }
  | { status: "dikoreksi" }
  | { status: "dicabut" };

const TOKEN = /^#[tc]=([A-Za-z0-9_-]{43})$/;

/** Guardian-facing confirmation and withdrawal (FR-AUTH-07). Uses the prototype's onboarding markup and classes. */
export function Wali() {
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [nama, setNama] = useState("");
  const [benar, setBenar] = useState(false);
  const [menolak, setMenolak] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const kunci = useRef(false);
  const judul = useRef<HTMLHeadingElement>(null);

  const muat = useCallback(async () => {
    const token = TOKEN.exec(window.location.hash)?.[1];
    // every link starts from a clean answer: nothing typed or ticked for one link carries over to the next
    setNama(""); setBenar(false); setMenolak(false); setHapus(false); setGalat(null);
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
  if (muatan.status === "dikoreksi") {
    return (
      <div className="onboard">
        <h1 ref={judul} tabIndex={-1}>Tanggal lahir dikoreksi</h1>
        <p className="lede">Terima kasih. Tanggal lahir di akun itu sudah diperbarui sesuai konfirmasi Anda, dan konfirmasi ini tercatat. Tautan ini tidak bisa dipakai lagi.</p>
      </div>
    );
  }
  if (muatan.status === "ditolak" || muatan.status === "dicabut") {
    return (
      <div className="onboard">
        <h1 ref={judul} tabIndex={-1}>{muatan.status === "ditolak" ? "Permintaan ditolak" : "Persetujuan dicabut"}</h1>
        <p className="lede">
          {muatan.status === "dicabut"
            ? "Semua izin AI di akun anak Anda sudah dimatikan. Fitur AI Ata tidak lagi memproses datanya."
            : muatan.koreksi
              ? "Tanggal lahir di akun itu tidak diubah. Tautan ini tidak bisa dipakai lagi."
              : "Tidak ada data anak Anda yang diproses fitur AI Ata, dan akunnya tidak bisa melanjutkan tanpa persetujuan. Tautan ini tidak bisa dipakai lagi."}
        </p>
        {muatan.status === "ditolak" && !muatan.koreksi ? (
          <p className="small" id="infoHapus">
            {muatan.hapus
              ? "Permintaan Anda untuk menghapus akun dan data anak Anda tercatat. Penghapusan dijadwalkan tujuh hari dari sekarang dan anak Anda diberi tahu di aplikasi. Bila sebelum itu Anda menyetujui permintaan baru darinya, penghapusan dibatalkan."
              : "Data akun anak Anda tidak dihapus otomatis. Ia bisa menghapus akunnya sendiri dari halaman Profil kapan saja."}
          </p>
        ) : null}
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

  const pernyataan = (
    <>
      <p className="small muted" id="batasVerifikasi">
        Tautan ini hanya menunjukkan bahwa Anda dapat membuka email yang dituju. Ata tidak memeriksa identitas Anda atau hubungan hukum Anda dengan {anak}.
        Karena itu Ata meminta pernyataan Anda sendiri di bawah ini, dan mencatat nama yang Anda ketik bersama waktu dan cara konfirmasi.
      </p>
      <div className="field">
        <label htmlFor="namaWali">Nama lengkap Anda</label>
        <input className="input" id="namaWali" maxLength={80} autoComplete="name" value={nama} aria-describedby="galatWali" onChange={(e) => { setGalat(null); setNama(e.target.value); }} />
      </div>
    </>
  );
  const periksaPernyataan = () => {
    if (nama.trim().length < 2) {
      setGalat("Ketik nama lengkap Anda.");
      document.getElementById("namaWali")?.focus();
      return false;
    }
    if (!benar) {
      setGalat("Centang pernyataan bahwa Anda orang tua/wali.");
      document.getElementById("sayaWali")?.focus();
      return false;
    }
    return true;
  };

  if (t.kind === "correction") {
    const lahir = t.birth_date ? tanggalLahir(t.birth_date) : "tanggal yang diajukan";
    return (
      <form className="onboard" noValidate onSubmit={(e) => {
        e.preventDefault();
        if (periksaPernyataan()) void jalankan(() => jawabWali(token, { approve: true, verifier_name: nama.trim(), is_guardian: true }), (d) => (d.status === "corrected" ? { status: "dikoreksi" } : { status: "ditolak", koreksi: true }));
      }}>
        <span className="eyebrow">Untuk orang tua/wali</span>
        <h1 ref={judul} tabIndex={-1}>Konfirmasi tanggal lahir {anak}</h1>
        <p className="lede">{anak} memakai Ata dan mencantumkan {t.guardian_name ?? "Anda"} sebagai orang tua/wali. Ia meminta tanggal lahir di akunnya dikoreksi menjadi <strong>{lahir}</strong>.</p>
        <div className="card">
          <h2>Yang Anda konfirmasi</h2>
          <p className="small">Dengan tanggal itu, akun {anak} berstatus dewasa (18 tahun atau lebih) dan tidak lagi memerlukan persetujuan orang tua/wali. Ata hanya mengubahnya bila Anda mengonfirmasi bahwa tanggal itu benar.</p>
          <p className="small muted">Jika tanggalnya salah atau Anda tidak mengenal {anak}, pilih Tolak. Tidak ada yang berubah tanpa konfirmasi Anda.</p>
        </div>
        {pernyataan}
        <label className="small" htmlFor="sayaWali">
          <input type="checkbox" id="sayaWali" checked={benar} onChange={(e) => { setGalat(null); setBenar(e.target.checked); }} />{" "}
          Saya menyatakan bahwa saya orang tua/wali dari {anak} dan bahwa tanggal lahirnya yang benar adalah {lahir}.
        </label>
        <span className="galat" id="galatWali" role="alert" hidden={!galat}>{galat}</span>
        <div className="btn-row">
          <button type="submit" className="btn btn--primary" id="setuju" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Tanggal itu benar"}</button>
          <button type="button" className="btn btn--ghost" id="tolak" disabled={sibuk} onClick={() => void jalankan(() => jawabWali(token, { approve: false }), () => ({ status: "ditolak", koreksi: true }))}>Tolak</button>
        </div>
      </form>
    );
  }

  if (menolak) {
    return (
      <div className="onboard" id="konfirmasiTolak">
        <span className="eyebrow">Untuk orang tua/wali</span>
        <h1 ref={judul} tabIndex={-1}>Tolak permintaan {anak}?</h1>
        <p className="lede">Jika ditolak, fitur AI Ata tidak memproses data {anak}, semua izin AI di akunnya mati, dan ia tidak bisa melanjutkan tanpa persetujuan.</p>
        <label className="small" htmlFor="hapusData">
          <input type="checkbox" id="hapusData" checked={hapus} onChange={(e) => setHapus(e.target.checked)} />{" "}
          Saya juga meminta akun {anak} beserta seluruh datanya di Ata dihapus.
        </label>
        <p className="small muted">Penghapusan tidak langsung: dijadwalkan tujuh hari dari sekarang, {anak} diberi tahu di aplikasi, dan dibatalkan bila Anda menyetujui permintaan baru sebelum itu. Tanpa centang ini, tidak ada data yang dihapus otomatis.</p>
        <span className="galat" role="alert" hidden={!galat}>{galat}</span>
        <div className="btn-row">
          <button type="button" className="btn btn--bahaya" id="yaTolak" disabled={sibuk} onClick={() => void jalankan(() => jawabWali(token, { approve: false, request_deletion: hapus }), (d) => ({ status: "ditolak", hapus: d.status === "declined" && d.deletion_requested === true }))}>{sibuk ? "Menyimpan…" : "Ya, tolak"}</button>
          <button type="button" className="btn btn--ghost" disabled={sibuk} onClick={() => { setGalat(null); setMenolak(false); }}>Kembali</button>
        </div>
      </div>
    );
  }

  const setuju = () => {
    if (!periksaPernyataan()) return;
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
      {pernyataan}
      <label className="small" htmlFor="sayaWali">
        <input type="checkbox" id="sayaWali" checked={benar} onChange={(e) => { setGalat(null); setBenar(e.target.checked); }} />{" "}
        Saya menyatakan bahwa saya orang tua/wali dari {anak} dan menyetujui pemrosesan di atas.
      </label>
      <span className="galat" id="galatWali" role="alert" hidden={!galat}>{galat}</span>
      <div className="btn-row">
        <button type="submit" className="btn btn--primary" id="setuju" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Saya setuju"}</button>
        <button type="button" className="btn btn--ghost" id="tolak" disabled={sibuk} onClick={() => { setGalat(null); setMenolak(true); requestAnimationFrame(() => judul.current?.focus()); }}>Tolak</button>
      </div>
    </form>
  );
}
