"use client";

import { useEffect, useState } from "react";
import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/lomba/lomba.css";
import "@/styles/prototype/shared/tarik.css";
import "./lomba-apl.css";
import { bacaAkun } from "../../_layar/akun";
import {
  bacaCatatan,
  bacaServer,
  buatPenyinkron,
  gabung,
  tulisCatatan,
  type Lokal,
} from "./sinkron";

type Tahap = "memuat" | "siap" | "galat";
type Akun = "memeriksa" | "lokal" | "akun" | "terputus";

const lokalDari = (state: Lokal): Lokal => ({
  deck: state.deck,
  unggahan: state.unggahan,
  peta: state.peta,
});

/**
 * Lomba (Radar, Tersimpan, Detail, Slot, Peta Jalan). The prototype's own vanilla modules render into #screen, so markup,
 * classes and interactions are the prototype's. This component only hosts them and mirrors the data to the account.
 */
export function Lomba() {
  const [tahap, setTahap] = useState<Tahap>("memuat");
  const [akun, setAkun] = useState<Akun>("memeriksa");
  const [coba, setCoba] = useState(0);

  useEffect(() => {
    let batal = false;
    let lepas = () => {};
    void (async () => {
      try {
        // The prototype modules read localStorage while loading, so they are imported in the browser only.
        const [{ pasangLomba }, st, bersama, logika, katalog] =
          await Promise.all([
            import("@/lib/prototype/lomba/pasang.js"),
            import("@/lib/prototype/lomba/state.js"),
            import("@/lib/prototype/shared/bersama.js"),
            import("@/lib/prototype/shared/logic/bersama.js"),
            import("@/lib/prototype/lomba/data/lomba.js"),
          ]);
        if (batal) return;
        const state = st.state as Lokal;
        const terpasang = pasangLomba();
        setTahap("siap");
        let penyinkron: ReturnType<typeof buatPenyinkron> | null = null;
        let tersambung = false;
        const ubah = () => {
          if (tersambung) penyinkron?.nanti();
        };
        const kejadian = ["pointerup", "keyup", "change", "submit"] as const;
        kejadian.forEach((k) => document.addEventListener(k, ubah, true));
        const pergi = () => {
          if (tersambung) void penyinkron?.sekarang();
        };
        window.addEventListener("pagehide", pergi);
        lepas = () => {
          kejadian.forEach((k) => document.removeEventListener(k, ubah, true));
          window.removeEventListener("pagehide", pergi);
          penyinkron?.henti();
          terpasang.lepas();
        };

        const me = await bacaAkun();
        if (batal) return;
        if (!me.ok) return setAkun("terputus");
        // The plan always follows the server; Slots above its limit are kept (aturPaket never removes any).
        const paket =
          me.data.signed_in && me.data.plan.plan === "pro" ? "pro" : "gratis";
        // The limit shown and enforced on screen is the server's, not the table built into the prototype.
        const batasLama = bersama.batasKini();
        bersama.aturBatasServer(
          me.data.signed_in
            ? (me.data.plan.features.activeSlots?.limit ??
                me.data.slot_limits[paket === "pro" ? "pro" : "free"])
            : null,
        );
        if (
          bersama.bacaBersama().paket !== paket ||
          bersama.batasKini() !== batasLama
        ) {
          if (bersama.bacaBersama().paket !== paket)
            bersama.ubahBersama((b: unknown) => logika.aturPaket(b, paket));
          st.sinkronDariBersama();
          terpasang.ctx.render();
        }
        if (!me.data.signed_in || !me.data.user) return setAkun("lokal");

        const akunId = me.data.user.id;
        // Device data last synced with another account belongs to that account: it must not be shown to this one or
        // copied into it, so the device starts again from the sample data before this account's rows are laid over it.
        const catatan = bacaCatatan();
        if (catatan && catatan.akun !== akunId) {
          st.reset();
          terpasang.ctx.render();
        }
        const dasarAwal = catatan?.akun === akunId ? catatan.dasar : {};
        const sinkron = buatPenyinkron(
          () => lokalDari(state),
          (pesan) => terpasang.ctx.toast(pesan, undefined, 5000),
          undefined,
          dasarAwal,
          (dasar) => tulisCatatan({ akun: akunId, dasar }),
        );
        penyinkron = sinkron;
        const ids = new Set(
          (katalog.LOMBA as { id: string }[]).map((l) => l.id),
        );
        // Reads the account and lays its rows over the device. Nothing is sent before this succeeds.
        const tarik = async () => {
          tersambung = false;
          const server = await bacaServer();
          if (batal) return;
          if (server.status !== "ok")
            return setAkun(server.status === "keluar" ? "lokal" : "terputus");
          // read again each time: "Reset data demo" clears it so the account's rows win over the sample data
          const dasar = bacaCatatan();
          const hasil = gabung(
            lokalDari(state),
            server.items,
            (id) => ids.has(id),
            dasar?.akun === akunId ? dasar.dasar : {},
          );
          if (hasil.dipakai.length) {
            state.unggahan = hasil.lokal.unggahan;
            const kartu = Object.fromEntries(
              hasil.lokal.unggahan.map((u) => [u.id, u]),
            );
            // written to the shared store first: it keeps every Slot, also above the plan limit
            bersama.ubahBersama((b: { kartu: object; peta: object }) => ({
              ...b,
              slot: hasil.lokal.deck.slot,
              kartu: { ...b.kartu, ...kartu },
              peta: { ...b.peta, ...hasil.lokal.peta },
            }));
            state.deck = { ...state.deck, ...hasil.lokal.deck };
            st.sinkronDariBersama();
            st.simpan();
            terpasang.ctx.render();
          }
          sinkron.catat(hasil.dipakai);
          tersambung = true;
          setAkun("akun");
          // first sign-in: what the device already holds goes to the account; a Slot over the limit stays on the device
          void sinkron.sekarang();
        };
        // Another tab rewrote the device store (for example "Reset data demo"): that must never remove account rows,
        // so the account is read again before anything else is sent.
        const tabLain = (ev: StorageEvent) => {
          if (ev.key === "ata-bersama" || ev.key === null) void tarik();
        };
        window.addEventListener("storage", tabLain);
        const lepasLama = lepas;
        lepas = () => {
          window.removeEventListener("storage", tabLain);
          lepasLama();
        };
        await tarik();
      } catch {
        if (!batal) setTahap("galat");
      }
    })();
    return () => {
      batal = true;
      lepas();
    };
  }, [coba]);

  return (
    <div className="views" id="views" data-akun={akun}>
      {akun !== "akun" && (
        <div className="demo-banner">
          {akun === "terputus"
            ? "Akun tidak bisa dihubungi. Perubahan disimpan di perangkat ini."
            : "Versi Demo, data contoh"}
        </div>
      )}
      {tahap === "galat" ? (
        <div className="view">
          <div className="empty" role="alert">
            {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
            <img
              src="/prototype/assets/panik.svg"
              alt=""
              width={120}
              height={120}
            />
            <h2>Lomba belum bisa dibuka</h2>
            <p>Ada yang gagal dimuat. Datamu di perangkat ini tidak berubah.</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setTahap("memuat");
                setCoba((n) => n + 1);
              }}
            >
              Coba lagi
            </button>
          </div>
        </div>
      ) : (
        // filled by the prototype modules; React never re-renders its children
        <div
          id="screen"
          suppressHydrationWarning
          dangerouslySetInnerHTML={SKELETON}
        />
      )}
    </div>
  );
}

// Loading state from the prototype's lomba.html. One constant object: React rewrites innerHTML whenever this prop
// changes identity, which would wipe what the prototype modules rendered.
const SKELETON = {
  __html:
    '<div class="view loading" aria-label="Memuat"><div class="skeleton skeleton--title"></div><div class="skeleton skeleton--card"></div><div class="skeleton skeleton--card"></div></div>',
};
