"use client";

import "./persetujuan-wali.css";
import { useRef, useState } from "react";
import { Ikon } from "./Ikon";
import { cabutPersetujuan, mintaPersetujuan, tanggal, type Persetujuan } from "./akun";

const jam = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const LALU: Partial<Record<Persetujuan["status"], string>> = {
  expired: "Tautan sebelumnya sudah kedaluwarsa tanpa jawaban.",
  declined: "Wali menolak permintaan sebelumnya.",
};

/**
 * Guardian consent of an account under 18 (FR-AUTH-07): ask, wait, withdraw. Shared by Kenalan and Profil.
 * Nothing here grants consent: the guardian answers on their own page, from the link sent to their inbox.
 */
export function PersetujuanWali({ p, kecil, onUbah, onKeluar }: {
  p: Persetujuan;
  /** Profil uses the small buttons of its cards */
  kecil?: boolean;
  /** the consent changed on the server: read it again */
  onUbah: () => Promise<void> | void;
  onKeluar: () => void;
}) {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState<{ bidang?: string; pesan: string } | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [yakin, setYakin] = useState(false);
  const kunci = useRef(false);
  const btn = kecil ? "btn btn--kecil" : "btn";

  const jalankan = async (aksi: () => Promise<{ ok: true } | { ok: false; pesan: string; status?: number; bidang?: string }>) => {
    if (kunci.current) return;
    kunci.current = true;
    setSibuk(true);
    setGalat(null);
    const r = await aksi();
    if (r.ok) await onUbah();
    kunci.current = false;
    setSibuk(false);
    setYakin(false);
    if (r.ok) return;
    if (r.status === 401) return onKeluar();
    setGalat({ bidang: r.bidang, pesan: r.pesan });
    if (r.bidang) document.getElementById("w-" + r.bidang)?.focus();
  };

  const kirim = () => {
    if (nama.trim().length < 2) {
      setGalat({ bidang: "guardian_name", pesan: "Isi nama orang tua atau walimu." });
      return document.getElementById("w-guardian_name")?.focus();
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setGalat({ bidang: "guardian_email", pesan: "Isi alamat email orang tua atau walimu." });
      return document.getElementById("w-guardian_email")?.focus();
    }
    void jalankan(() => mintaPersetujuan(nama.trim(), email.trim()));
  };

  const pesanGalat = <p className="galat" id="galatWali" role="alert">{galat?.pesan ?? ""}</p>;

  if (p.status === "verified") {
    return (
      <div className="wali" data-status="verified">
        <dl className="rincian">
          <div><dt>Status</dt><dd>Disetujui wali</dd></div>
          <div><dt>Wali</dt><dd>{p.guardian_name} ({p.contact_masked})</dd></div>
          {p.verified_at ? <div><dt>Disetujui</dt><dd>{tanggal(p.verified_at)}</dd></div> : null}
          <div><dt>Versi persetujuan</dt><dd>{p.version}</dd></div>
        </dl>
        <p className="small muted">Persetujuan mencakup semua kategori di daftar izin. Kamu tetap yang menyalakan tiap kategori. Kamu atau walimu bisa mencabutnya kapan saja; saat dicabut, semua izin AI langsung mati.</p>
        {pesanGalat}
        <div className="btn-row">
          {yakin ? (
            <>
              <button type="button" className={btn + " btn--bahaya"} id="yaCabutWali" disabled={sibuk} onClick={() => void jalankan(cabutPersetujuan)}>{sibuk ? "Mencabut…" : "Ya, cabut persetujuan"}</button>
              <button type="button" className={btn + " btn--ghost"} disabled={sibuk} onClick={() => setYakin(false)}>Batal</button>
            </>
          ) : (
            <button type="button" className={btn} id="cabutWali" onClick={() => setYakin(true)}>Cabut persetujuan</button>
          )}
        </div>
      </div>
    );
  }

  if (p.status === "pending") {
    return (
      <div className="wali" data-status="pending">
        <p className="small" role="status">
          Menunggu jawaban <strong>{p.guardian_name}</strong> di {p.contact_masked}.
          {p.expires_at ? ` Tautan di emailnya berlaku sampai ${jam(p.expires_at)} dan hanya bisa dipakai sekali.` : ""}
        </p>
        <p className="small muted">Persetujuan hanya bisa diberikan walimu lewat tautan itu. Selama belum disetujui, izin AI tetap mati.</p>
        {pesanGalat}
        <div className="btn-row">
          <button type="button" className={btn + " btn--primary"} id="periksaWali" disabled={sibuk} onClick={() => void jalankan(async () => ({ ok: true }))}>{sibuk ? "Memeriksa…" : "Periksa lagi"}</button>
          <button type="button" className={btn + " btn--ghost"} id="batalWali" disabled={sibuk} onClick={() => void jalankan(cabutPersetujuan)}>Batalkan permintaan</button>
        </div>
      </div>
    );
  }

  return (
    <form className="wali" data-status={p.status} noValidate onSubmit={(e) => { e.preventDefault(); kirim(); }}>
      {LALU[p.status] ? <p className="small" role="status">{LALU[p.status]}</p> : null}
      {p.status === "revoked" ? <p className="small" role="status">Persetujuan dicabut{p.revoked_by === "guardian" ? " oleh wali" : ""}. Semua izin AI mati.</p> : null}
      {p.delivery_available ? null : (
        <div className="error" id="waliBelumTersambung" role="alert">
          <Ikon nama="alert" />
          <div>
            <strong>Email ke wali belum tersambung</strong>
            <p>Versi ini belum bisa mengirim email ke orang tua/wali, jadi persetujuan belum bisa diminta. Mencentang kotak atau mengisi nama saja tidak dianggap persetujuan. Sampai walimu benar-benar menyetujui, izin AI tetap mati.</p>
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="w-guardian_name">Nama orang tua/wali</label>
        <input className="input" id="w-guardian_name" maxLength={80} autoComplete="off" value={nama} disabled={!p.delivery_available} aria-invalid={galat?.bidang === "guardian_name" ? true : undefined} aria-describedby="galatWali" onChange={(e) => { setGalat(null); setNama(e.target.value); }} />
      </div>
      <div className="field">
        <label htmlFor="w-guardian_email">Email orang tua/wali</label>
        <input className="input" id="w-guardian_email" type="email" inputMode="email" maxLength={254} autoComplete="off" value={email} disabled={!p.delivery_available} aria-invalid={galat?.bidang === "guardian_email" ? true : undefined} aria-describedby="galatWali hintWali" onChange={(e) => { setGalat(null); setEmail(e.target.value); }} />
        <span className="hint" id="hintWali">Ata mengirim tautan sekali pakai ke alamat ini. Walimu yang membuka dan menyetujuinya, bukan kamu.</span>
      </div>
      {pesanGalat}
      <div className="btn-row">
        <button type="submit" className={btn + " btn--primary"} id="kirimWali" disabled={sibuk || !p.delivery_available}>{sibuk ? "Mengirim…" : "Kirim permintaan ke wali"}</button>
      </div>
    </form>
  );
}
