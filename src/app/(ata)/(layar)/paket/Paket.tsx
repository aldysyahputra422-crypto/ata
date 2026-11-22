"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { price } from "@/lib/billing/price";
import { rupiah } from "@/lib/billing/price";
// prototype plan copy; the Slot numbers shown come from the server (/api/v1/me), the copy only supplies the wording
import { PAKET, labelSlot } from "@/lib/prototype/masuk/data/paket.js";
import { icon } from "@/lib/prototype/shared/ds.js";
import { Ikon } from "../../_layar/Ikon";
import { Toast } from "../../_layar/Lapisan";
import { bacaAkun, slotPerangkat, slotTerpakai, tanggal, tukarKode, type Akun, type Hasil } from "../../_layar/akun";

type Fitur = { id: string; label: string; ada: boolean; tersedia: boolean };
const SUMBER: Record<string, string> = { redeem: "kode Sobat Ambis", payment: "langganan berbayar", partner: "akses khusus", grant: "akses khusus" };

const Ada = ({ ada }: { ada: boolean }) =>
  ada ? (
    <span className="cek-ada" role="img" aria-label="termasuk" dangerouslySetInnerHTML={{ __html: icon("check") }} />
  ) : (
    <span className="cek-tidak" role="img" aria-label="belum tersedia" dangerouslySetInnerHTML={{ __html: icon("minus") }} />
  );
const DaftarFitur = ({ fitur }: { fitur: Fitur[] }) => (
  <ul className="paket__fitur">
    {fitur.map((f) => (
      <li key={f.id}>
        <Ada ada={f.ada && f.tersedia} />
        <span>{f.tersedia ? f.label : `${f.label} `}{f.tersedia ? null : <span className="belum">Belum tersedia</span>}</span>
      </li>
    ))}
  </ul>
);
const Aktif = () => (
  <span className="status status--ok"><Ikon nama="check" />Aktif</span>
);

/** Port of the prototype's masuk/ui/paket.js. Pro only ever comes from the server (redeem); nothing activates in the browser. */
export function Paket({ harga: h }: { harga: ReturnType<typeof price> }) {
  const [akun, setAkun] = useState<Hasil<Akun> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [infoBayar, setInfoBayar] = useState<string | null>(null);

  // number of active Slots; null while it is being read, "gagal" when the server could not say
  const [terpakai, setTerpakai] = useState<number | "gagal" | null>(null);

  const muatSlot = useCallback(async (masuk: boolean) => {
    setTerpakai(null);
    // signed in: the account's rows on the server; signed out: this device only, there is no account to ask
    setTerpakai(masuk ? await slotTerpakai() : slotPerangkat());
  }, []);
  const muat = useCallback(async () => {
    const hasil = await bacaAkun();
    setAkun(hasil);
    if (hasil.ok) await muatSlot(hasil.data.signed_in && !!hasil.data.user);
  }, [muatSlot]);
  useEffect(() => void muat(), [muat]);
  const tutupToast = useCallback(() => setToast(null), []);

  if (!akun) {
    return (
      <div className="paket">
        <p className="small muted" role="status">Memuat status paket dari server…</p>
      </div>
    );
  }
  if (!akun.ok) {
    return (
      <div className="paket">
        <div className="error" role="alert">
          <Ikon nama="alert" />
          <div><strong>Status paket tidak bisa dimuat.</strong><p>{akun.pesan}</p></div>
        </div>
        <button type="button" className="btn" id="ulang" onClick={() => { setAkun(null); void muat(); }}>Coba lagi</button>
      </div>
    );
  }

  const d = akun.data;
  const masuk = d.signed_in && !!d.user;
  const pk = d.plan;
  const pro = pk.plan === "pro";
  // K-23: the active-Slot limit is the server's entitlement.
  const batasPaket = { gratis: d.slot_limits.free, pro: d.slot_limits.pro };
  const batas = pk.features.activeSlots?.limit ?? batasPaket[pro ? "pro" : "gratis"];
  const fitur = (paket: "gratis" | "pro"): Fitur[] =>
    PAKET[paket].fitur.map((f: Fitur) => (f.id === "slot" ? { ...f, label: labelSlot(paket, batasPaket) } : f));

  const tukar = async () => {
    if (!kode.trim()) return setGalat("Masukkan kode dulu.");
    setSibuk(true);
    const r = await tukarKode(kode);
    setSibuk(false);
    if (!r.ok) return setGalat(r.pesan);
    setGalat(null);
    setKode("");
    setToast(`Pro aktif selama ${r.data.days} hari.`);
    await muat();
  };
  const bayar = () => {
    if (!masuk) return setToast("Masuk dengan Google dulu untuk berlangganan.");
    setInfoBayar("Pembayaran belum diaktifkan di server ini.");
  };

  return (
    <div className="paket">
      <header className="kepala">
        <div>
          <p className="eyebrow">Keanggotaan</p>
          <h1>Paket</h1>
          <p className="lede">
            {masuk ? <>Akun {d.user?.email} · paket <strong>{pro ? "Pro" : "Gratis"}</strong></> : "Belum masuk: kamu memakai paket Gratis di perangkat ini"}
            .{" "}
            <span id="slotTerpakai" role="status">
              {terpakai === null ? (
                "Menghitung Slot terpakai…"
              ) : terpakai === "gagal" ? (
                <>Jumlah Slot terpakai tidak bisa dimuat dari server. Batas paketmu {batas} Slot.</>
              ) : (
                <>Slot terpakai {terpakai} dari {batas}.{terpakai > batas ? " Jumlahnya di atas batas paketmu: Slot lama tetap tersimpan, Slot baru bisa diaktifkan setelah kamu melepas sampai di bawah batas." : null}</>
              )}
            </span>
          </p>
          {terpakai === "gagal" ? (
            <button type="button" className="btn" id="ulangSlot" onClick={() => void muatSlot(masuk)}>Muat ulang jumlah Slot</button>
          ) : null}
        </div>
      </header>
      {pro ? (
        <div className="banner banner--ok">
          <Ikon nama="check" />
          <p>Pro aktif dari {pk.sources.map((s) => SUMBER[s] ?? s).join(" dan ")}{pk.ends_at ? ` sampai ${tanggal(pk.ends_at)}` : ""}.</p>
        </div>
      ) : pk.status === "expired" ? (
        <div className="banner"><Ikon nama="alert" /><p>Akses Pro-mu sudah berakhir. Data dan Slot-mu tetap tersimpan.</p></div>
      ) : null}

      <div className="paket__banding">
        <article className={`card paket__kartu ${pro ? "" : "paket__kartu--aktif"}`}>
          <div className="paket__kepala"><h2>Gratis</h2>{pro ? null : <Aktif />}</div>
          <p className="paket__harga num">Rp0</p>
          <p className="small">{PAKET.gratis.ringkas}</p>
          <DaftarFitur fitur={fitur("gratis")} />
        </article>
        <article className={`card paket__kartu ${pro ? "paket__kartu--aktif" : ""}`}>
          <div className="paket__kepala"><h2>Pro</h2>{pro ? <Aktif /> : null}</div>
          <p className="paket__harga num">{rupiah(h.monthly.amount)}<span className="small"> / bulan</span></p>
          <p className="small">
            atau <b className="num">{rupiah(h.yearly.amount)}</b> / tahun (setara {rupiah(h.yearly.perMonth)} / bulan, hemat {rupiah(h.yearly.saved)} atau {h.yearly.discountPercent}% dari {rupiah(h.yearly.normal)})
          </p>
          <DaftarFitur fitur={fitur("pro")} />
          {(PAKET.pro.catatan ?? []).map((c: string) => (
            <p className="small" key={c}>{c}</p>
          ))}
          {pro ? null : (
            <>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" data-bayar="bulanan" onClick={bayar}>Bulanan {rupiah(h.monthly.amount)}</button>
                <button type="button" className="btn" data-bayar="tahunan" onClick={bayar}>Tahunan {rupiah(h.yearly.amount)}</button>
              </div>
              <p className="small" id="infoBayar" role="status">{infoBayar ?? "Pembayaran belum diaktifkan di server ini."}</p>
            </>
          )}
        </article>
      </div>

      <section className="card">
        <h2>Kode Sobat Ambis</h2>
        <p className="small">Siswa program Sobat Ambis mendapat kode untuk akses Pro. Kode diperiksa server: masa berlaku, kuota, dan satu kode per akun.</p>
        {masuk ? (
          <>
            <div className="field">
              <label htmlFor="kodeRedeem">Kode redeem</label>
              <input
                className="input"
                id="kodeRedeem"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="SA-XXXX-XXXX-XXXX"
                aria-describedby="galatRedeem"
                aria-invalid={galat ? true : undefined}
                maxLength={64}
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void tukar(); }}
              />
              <span className="galat" id="galatRedeem" role="alert" hidden={!galat}>{galat}</span>
            </div>
            <button type="button" className="btn btn--primary" id="tukar" disabled={sibuk} onClick={tukar}>Tukarkan kode</button>
          </>
        ) : (
          <>
            <p className="small"><strong>Masuk dengan Google dulu</strong> supaya kode tercatat di akunmu, bukan di perangkat.</p>
            <Link className="btn" id="keMasuk" href="/">Ke halaman Masuk</Link>
          </>
        )}
      </section>
      <Toast teks={toast} onSelesai={tutupToast} />
    </div>
  );
}
