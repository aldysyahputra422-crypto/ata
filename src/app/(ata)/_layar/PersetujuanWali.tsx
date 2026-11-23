"use client";

import "./persetujuan-wali.css";
import { useRef, useState } from "react";
import { Ikon } from "./Ikon";
import {
  batalKoreksiLahir, cabutPersetujuan, mintaKoreksiLahir, mintaPersetujuan, periksaTanggalLahir, tanggal, tanggalLahir,
  TANGGAL_LAHIR_MIN, tanggalLahirMaks, type Hasil, type Persetujuan,
} from "./akun";

const jam = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const LALU: Partial<Record<Persetujuan["status"], string>> = {
  expired: "Tautan sebelumnya sudah kedaluwarsa tanpa jawaban.",
  declined: "Walimu menolak permintaan sebelumnya. Fitur AI tidak memproses datamu dan semua izin AI mati. Kamu boleh mengirim permintaan baru, atau menghapus akun dan datamu dari halaman Profil.",
};
/** What the emailed link can and cannot show. Said wherever the link is mentioned. */
const BATAS = "Tautan itu hanya membuktikan bahwa pemilik alamat email tersebut membukanya. Ata tidak memeriksa identitas atau hubungan hukumnya denganmu; itu pernyataan walimu sendiri saat menjawab.";
const BELUM_DIKONFIGURASI = (
  <div className="error" id="waliBelumTersambung" role="alert">
    <Ikon nama="alert" />
    <div>
      <strong>Email ke wali belum dikonfigurasi</strong>
      <p>Layanan pengirim email belum dikonfigurasi di versi ini, jadi permintaan belum bisa dikirim dan tidak ada email yang dianggap terkirim. Mencentang kotak atau mengisi nama saja tidak dianggap persetujuan. Sampai walimu benar-benar menyetujui, akunmu berstatus menunggu dan izin AI tetap mati.</p>
    </div>
  </div>
);

/**
 * Birth date correction from under 18 to adult. The account cannot make that change itself: the parent/guardian
 * confirms it from a link sent to their inbox. Other corrections are made in the profile form.
 */
function KoreksiLahir({ p, btn, jalankan, sibuk }: {
  p: Persetujuan;
  btn: string;
  jalankan: (aksi: () => Promise<Hasil<unknown>>, awalan?: string) => Promise<void>;
  sibuk: boolean;
}) {
  const [buka, setBuka] = useState(false);
  const [lahir, setLahir] = useState("");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [salah, setSalah] = useState<{ bidang: string; pesan: string } | null>(null);

  if (p.correction) {
    return (
      <div className="wali" id="koreksiLahir" data-status="pending">
        <p className="small" role="status">
          Koreksi tanggal lahir menjadi <strong>{p.correction.birth_date ? tanggalLahir(p.correction.birth_date) : "tanggal baru"}</strong> menunggu
          konfirmasi {p.correction.guardian_name} di {p.correction.contact_masked}.
          {p.correction.expires_at ? ` Tautannya berlaku sampai ${jam(p.correction.expires_at)}.` : ""} Tanggal lahirmu belum berubah.
        </p>
        <div className="btn-row">
          <button type="button" className={btn + " btn--ghost"} id="batalKoreksi" disabled={sibuk} onClick={() => void jalankan(batalKoreksiLahir)}>Batalkan koreksi</button>
        </div>
      </div>
    );
  }
  if (!buka) {
    return (
      <div className="btn-row">
        <button type="button" className={btn + " btn--ghost"} id="bukaKoreksi" aria-expanded="false" onClick={() => setBuka(true)}>Tanggal lahirku salah</button>
      </div>
    );
  }
  const kirim = () => {
    const galatLahir = periksaTanggalLahir(lahir);
    const bidang = galatLahir ? "birth_date" : nama.trim().length < 2 ? "guardian_name" : !/^\S+@\S+\.\S+$/.test(email.trim()) ? "guardian_email" : null;
    if (bidang) {
      setSalah({ bidang, pesan: galatLahir ?? (bidang === "guardian_name" ? "Isi nama orang tua atau walimu." : "Isi alamat email orang tua atau walimu.") });
      return document.getElementById("k-" + bidang)?.focus();
    }
    setSalah(null);
    void jalankan(() => mintaKoreksiLahir(lahir, nama.trim(), email.trim()), "k-");
  };
  const mati = p.delivery === "not_configured" || p.corrections_left < 1;
  return (
    <form className="wali" id="koreksiLahir" noValidate onSubmit={(e) => { e.preventDefault(); kirim(); }}>
      <p className="small">
        Kalau tanggal lahir yang benar membuatmu berusia 18 tahun atau lebih, perubahan itu tidak bisa kamu lakukan sendiri: orang tua/walimu
        mengonfirmasinya lewat tautan sekali pakai di emailnya. Koreksi yang tetap di bawah 18 tahun cukup diubah di formulir profil.
        Sisa koreksi: {p.corrections_left}.
      </p>
      {p.corrections_left < 1 ? <p className="small" role="status">Batas koreksi sudah habis. Hubungi tim Ata untuk memperbaikinya.</p> : null}
      <div className="field">
        <label htmlFor="k-birth_date">Tanggal lahir yang benar</label>
        <input className="input" id="k-birth_date" type="date" autoComplete="bday" min={TANGGAL_LAHIR_MIN} max={tanggalLahirMaks()} value={lahir} disabled={mati} aria-invalid={salah?.bidang === "birth_date" ? true : undefined} aria-describedby="galatKoreksi" onChange={(e) => { setSalah(null); setLahir(e.target.value); }} />
      </div>
      <div className="field">
        <label htmlFor="k-guardian_name">Nama orang tua/wali</label>
        <input className="input" id="k-guardian_name" maxLength={80} autoComplete="off" value={nama} disabled={mati} aria-invalid={salah?.bidang === "guardian_name" ? true : undefined} aria-describedby="galatKoreksi" onChange={(e) => { setSalah(null); setNama(e.target.value); }} />
      </div>
      <div className="field">
        <label htmlFor="k-guardian_email">Email orang tua/wali</label>
        <input className="input" id="k-guardian_email" type="email" inputMode="email" maxLength={254} autoComplete="off" value={email} disabled={mati} aria-invalid={salah?.bidang === "guardian_email" ? true : undefined} aria-describedby="galatKoreksi hintKoreksi" onChange={(e) => { setSalah(null); setEmail(e.target.value); }} />
        <span className="hint" id="hintKoreksi">Bila walimu sudah tercatat di akun ini, pakai alamat email yang sama. {BATAS}</span>
      </div>
      <p className="galat" id="galatKoreksi" role="alert">{salah?.pesan ?? ""}</p>
      <div className="btn-row">
        <button type="submit" className={btn + " btn--primary"} id="kirimKoreksi" disabled={sibuk || mati}>{sibuk ? "Mengirim…" : "Minta konfirmasi wali"}</button>
        <button type="button" className={btn + " btn--ghost"} disabled={sibuk} onClick={() => setBuka(false)}>Tutup</button>
      </div>
    </form>
  );
}

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

  const jalankan = async (aksi: () => Promise<Hasil<unknown>>, awalan = "w-") => {
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
    if (r.bidang) document.getElementById(awalan + r.bidang)?.focus();
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

  const hapusDiminta = p.deletion_due_at ? (
    <div className="error" id="hapusDiminta" role="alert">
      <Ikon nama="alert" />
      <div>
        <strong>Walimu meminta akun ini dihapus</strong>
        <p>Akun dan seluruh datamu dijadwalkan dihapus setelah {tanggal(p.deletion_due_at)}. Unduh datamu dari halaman Profil bila perlu. Permintaan baru hanya bisa dikirim ke email wali yang sama; bila walimu berubah pikiran dan menyetujuinya sebelum tanggal itu, penghapusan dibatalkan.</p>
      </div>
    </div>
  ) : null;

  if (p.status === "verified") {
    return (
      <div className="wali" data-status="verified">
        <dl className="rincian">
          <div><dt>Status</dt><dd>Disetujui wali</dd></div>
          <div><dt>Wali</dt><dd>{p.guardian_name} ({p.contact_masked})</dd></div>
          {p.verified_at ? <div><dt>Disetujui</dt><dd>{tanggal(p.verified_at)}</dd></div> : null}
          <div><dt>Versi persetujuan</dt><dd>{p.version}</dd></div>
          <div><dt>Cara verifikasi</dt><dd>Tautan sekali pakai ke email wali</dd></div>
        </dl>
        <p className="small muted">Persetujuan mencakup semua kategori di daftar izin. Kamu tetap yang menyalakan tiap kategori. Kamu atau walimu bisa mencabutnya kapan saja; saat dicabut, semua izin AI langsung mati.</p>
        <p className="small muted">{BATAS}</p>
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
        <KoreksiLahir p={p} btn={btn} jalankan={jalankan} sibuk={sibuk} />
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
        {hapusDiminta}
        <p className="small muted">Persetujuan hanya bisa diberikan walimu lewat tautan itu. Selama belum disetujui, akunmu berstatus menunggu dan izin AI tetap mati. {BATAS}</p>
        {pesanGalat}
        <div className="btn-row">
          <button type="button" className={btn + " btn--primary"} id="periksaWali" disabled={sibuk} onClick={() => void jalankan(async () => ({ ok: true, data: null }))}>{sibuk ? "Memeriksa…" : "Periksa lagi"}</button>
          <button type="button" className={btn + " btn--ghost"} id="batalWali" disabled={sibuk} onClick={() => void jalankan(cabutPersetujuan)}>Batalkan permintaan</button>
        </div>
        <KoreksiLahir p={p} btn={btn} jalankan={jalankan} sibuk={sibuk} />
      </div>
    );
  }

  return (
    <div className="wali" data-status={p.status}>
    <form className="wali" noValidate onSubmit={(e) => { e.preventDefault(); kirim(); }}>
      {LALU[p.status] ? <p className="small" role="status">{LALU[p.status]}</p> : null}
      {hapusDiminta}
      {p.status === "revoked" ? <p className="small" role="status">Persetujuan dicabut{p.revoked_by === "guardian" ? " oleh wali" : ""}. Semua izin AI mati.</p> : null}
      {p.delivery === "configured" ? null : BELUM_DIKONFIGURASI}
      <div className="field">
        <label htmlFor="w-guardian_name">Nama orang tua/wali</label>
        <input className="input" id="w-guardian_name" maxLength={80} autoComplete="off" value={nama} disabled={p.delivery !== "configured"} aria-invalid={galat?.bidang === "guardian_name" ? true : undefined} aria-describedby="galatWali" onChange={(e) => { setGalat(null); setNama(e.target.value); }} />
      </div>
      <div className="field">
        <label htmlFor="w-guardian_email">Email orang tua/wali</label>
        <input className="input" id="w-guardian_email" type="email" inputMode="email" maxLength={254} autoComplete="off" value={email} disabled={p.delivery !== "configured"} aria-invalid={galat?.bidang === "guardian_email" ? true : undefined} aria-describedby="galatWali hintWali" onChange={(e) => { setGalat(null); setEmail(e.target.value); }} />
        <span className="hint" id="hintWali">Ata mengirim tautan sekali pakai ke alamat ini. Walimu yang membuka dan menyetujuinya, bukan kamu. {BATAS}</span>
      </div>
      {pesanGalat}
      <div className="btn-row">
        <button type="submit" className={btn + " btn--primary"} id="kirimWali" disabled={sibuk || p.delivery !== "configured"}>{sibuk ? "Mengirim…" : "Kirim permintaan ke wali"}</button>
      </div>
    </form>
    <KoreksiLahir p={p} btn={btn} jalankan={jalankan} sibuk={sibuk} />
    </div>
  );
}
