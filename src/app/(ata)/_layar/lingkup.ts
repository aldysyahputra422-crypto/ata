// Which data this device's stores hold: the device's own ("lokal": demo and signed-out use) or one account's copy.
// The two never mix. Signing in sets the device data aside and starts the account's copy empty, so sample data is
// never sent to an account; signing out drops the account's copy and brings the device data back.
import { KUNCI_BERSAMA, awalBersama } from "@/lib/prototype/shared/logic/bersama.js";

export const KUNCI_LINGKUP = "ata-lingkup";
const KUNCI_LOMBA = "ata-demo-lomba";
const KUNCI_CATATAN = "ata-lomba-sinkron";
const KUNCI = [KUNCI_BERSAMA, KUNCI_LOMBA, KUNCI_CATATAN];
const sisih = (k: string) => "ata-lokal:" + k;
const LOKAL = "lokal";

/** "lokal" or the account id the stores belong to. Throws when storage is blocked. */
function kini(): string {
  const penanda = localStorage.getItem(KUNCI_LINGKUP);
  if (penanda) return penanda;
  // a device synced by the previous version: its stores already hold that account's rows
  try {
    const c = JSON.parse(localStorage.getItem(KUNCI_CATATAN) ?? "null") as { akun?: unknown } | null;
    if (typeof c?.akun === "string" && c.akun) return c.akun;
  } catch {
    /* unreadable note: device data */
  }
  return LOKAL;
}

export function lingkupKini(): string | null {
  try {
    return kini();
  } catch {
    return null;
  }
}

/**
 * Makes the stores belong to the account (or to the device when null). "ganti": the stores were swapped and the page
 * must reload before any module reads them; "gagal": storage is blocked, so account data must not be mixed in.
 */
export function pakaiLingkup(akunId: string | null): "tetap" | "ganti" | "gagal" {
  const tujuan = akunId ?? LOKAL;
  try {
    const asal = kini();
    if (asal === tujuan) {
      localStorage.setItem(KUNCI_LINGKUP, tujuan);
      return "tetap";
    }
    if (asal === LOKAL) {
      for (const k of KUNCI) {
        const v = localStorage.getItem(k);
        if (v === null) localStorage.removeItem(sisih(k));
        else localStorage.setItem(sisih(k), v);
      }
    }
    if (tujuan === LOKAL) {
      for (const k of KUNCI) {
        const v = localStorage.getItem(sisih(k));
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
        localStorage.removeItem(sisih(k));
      }
    } else {
      // an account starts with nothing on the device: its Slots and Peta Jalan come from the server only
      localStorage.setItem(KUNCI_BERSAMA, JSON.stringify({ ...awalBersama(), slot: [] }));
      localStorage.setItem(KUNCI_LOMBA, JSON.stringify({
        v: 3, deck: { antrean: [], tersimpan: [], dilewati: [], slot: [], riwayat: [] }, dipilih: "", unggahHariIni: 0, unggahan: [], cariTambahan: false, dilihat: [],
      }));
      localStorage.removeItem(KUNCI_CATATAN);
    }
    localStorage.setItem(KUNCI_LINGKUP, tujuan);
    return "ganti";
  } catch {
    return "gagal";
  }
}
