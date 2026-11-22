"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ikon } from "../_layar/Ikon";
import { Sheet, Toast } from "../_layar/Lapisan";
import { bacaAkun, ekspor, hapusAkun, keluar, sesiLokal, simpanSesiLokal, tanggal, type Akun, type Hasil } from "../_layar/akun";

// Google's brand guidelines require the official coloured "G" on sign-in buttons.
const G = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8H1.3v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8z" />
  </svg>
);

/** Port of the prototype's masuk/ui/masuk.js: same markup and classes, account data from /api/v1/me. */
export function Masuk({ galatOAuth }: { galatOAuth: boolean }) {
  const router = useRouter();
  const [akun, setAkun] = useState<Hasil<Akun> | null>(null);
  const [lokal, setLokal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  const muat = useCallback(async () => {
    setAkun(null);
    setAkun(await bacaAkun());
  }, []);
  useEffect(() => {
    setLokal(sesiLokal());
    void muat();
  }, [muat]);
  const tutupToast = useCallback(() => setToast(null), []);

  if (!akun) {
    return (
      <div className="masuk">
        <p className="small muted" role="status">Memeriksa akun di server…</p>
      </div>
    );
  }

  if (akun.ok && akun.data.signed_in && akun.data.user) {
    const { user, plan } = akun.data;
    const pro = plan.plan === "pro";
    const unduh = async () => {
      const r = await ekspor();
      if (!r.ok) return setToast(r.pesan);
      const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" }));
      const el = Object.assign(document.createElement("a"), { href: url, download: "akun-ata.json" });
      document.body.append(el);
      el.click();
      el.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return (
      <div className="masuk">
        <div className="masuk__lambang">
          {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, official mascot SVG */}
          <img src="/prototype/assets/jempol.svg" alt="" width={120} height={120} />
        </div>
        <h1>Halo, {user.display_name ?? user.email}</h1>
        <div className="card">
          <dl className="rincian">
            <div><dt>Akun Google</dt><dd>{user.email}</dd></div>
            <div><dt>Paket</dt><dd>{pro ? "Pro" : "Gratis"}{pro && plan.ends_at ? ` sampai ${tanggal(plan.ends_at)}` : ""}</dd></div>
          </dl>
        </div>
        <div className="btn-row">
          <Link className="btn btn--primary" id="lanjut" href="/progres">Buka Progres</Link>
          <Link className="btn" id="kePaket" href="/paket">Paket &amp; kode Sobat Ambis</Link>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" id="unduh" onClick={unduh}>Unduh data akun</button>
          <button
            type="button"
            className="btn btn--ghost"
            id="keluar"
            onClick={async () => {
              const r = await keluar();
              if (!r.ok) return setToast(r.pesan);
              setToast("Kamu sudah keluar.");
              await muat();
            }}
          >
            Keluar
          </button>
          <button type="button" className="btn btn--ghost" id="hapus" onClick={() => setKonfirmasiHapus(true)}>Hapus akun</button>
        </div>
        {konfirmasiHapus ? (
          <Sheet judul="Hapus akun?" onTutup={() => setKonfirmasiHapus(false)}>
            <p>Akun, langganan, riwayat kode, dan kuota AI di server dihapus permanen. Data di perangkat ini tidak ikut terhapus.</p>
            <div className="btn-row">
              <button type="button" className="btn" data-batal onClick={() => setKonfirmasiHapus(false)}>Batal</button>
              <button
                type="button"
                className="btn btn--primary"
                id="yaHapus"
                onClick={async () => {
                  const r = await hapusAkun();
                  setKonfirmasiHapus(false);
                  if (!r.ok) return setToast(r.pesan);
                  setToast("Akun dihapus.");
                  await muat();
                }}
              >
                Hapus akun
              </button>
            </div>
          </Sheet>
        ) : null}
        <Toast teks={toast} onSelesai={tutupToast} />
      </div>
    );
  }

  const google = akun.ok && akun.data.config.google;
  return (
    <div className="masuk">
      <div className="masuk__lambang">
        {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, official mascot SVG */}
        <img src="/prototype/assets/melambai.svg" alt="" width={140} height={140} />
      </div>
      <h1>Masuk ke Ata</h1>
      <p className="lede">Satu tombol untuk daftar maupun masuk. Akun baru dibuat otomatis, akun lama langsung terbuka.</p>
      {galatOAuth ? (
        <div className="error" role="alert">
          <Ikon nama="alert" />
          <div>
            <strong>Belum berhasil masuk.</strong>
            <p>Gagal masuk dengan Google. Coba lagi.</p>
          </div>
        </div>
      ) : null}
      {google ? (
        <a className="btn btn--block btn--google" href="/api/v1/auth/google/start">{G}<span>Lanjutkan dengan Google</span></a>
      ) : (
        <>
          <button type="button" className="btn btn--block btn--google" disabled aria-describedby="infoGoogle">{G}<span>Lanjutkan dengan Google</span></button>
          <p className="small" id="infoGoogle">
            {akun.ok ? "Masuk dengan Google belum dikonfigurasi di server ini." : akun.pesan}
          </p>
          {akun.ok ? null : <button type="button" className="btn btn--block" id="ulang" onClick={muat}>Coba lagi</button>}
        </>
      )}
      <div className="pemisah"><span>atau</span></div>
      {lokal ? <p className="small">Kamu sedang memakai Ata <strong>tanpa akun</strong>. Data tersimpan di perangkat ini saja.</p> : null}
      <button
        type="button"
        className="btn btn--block"
        id="lokal"
        onClick={() => {
          simpanSesiLokal(true);
          router.push("/hari-ini");
        }}
      >
        {lokal ? "Lanjutkan tanpa akun" : "Pakai tanpa akun dulu"}
      </button>
      <p className="small">Tanpa akun: semua fitur dasar jalan dan data tersimpan di perangkat ini. Kode Sobat Ambis dan langganan butuh akun. Kami tidak pernah meminta kata sandi Google.</p>
      <Toast teks={toast} onSelesai={tutupToast} />
    </div>
  );
}
