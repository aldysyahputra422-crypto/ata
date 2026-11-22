// Account sync for Lomba (K-03, K-23). The prototype keeps everything on the device; signed in, the same data is
// mirrored to /api/v1/user-competitions. The database decides whether a new Slot fits the plan (409 limit_reached).
// Rules: device data is never deleted by a sync, a rejected Slot stays on the device, and nothing is sent unless
// the first read from the server succeeded.
// Step status (done/doing) is not part of the roadmap row: it goes to /api/v1/tasks, where the server stamps the
// completion day and derives XP. The account's status always comes back from the server with the roadmap.
export type BarisServer = {
  competition_key: string;
  source: "catalog" | "manual" | "search";
  state: "saved" | "skipped" | "slot" | "released";
  card: Record<string, unknown> | null;
  roadmap: Record<string, unknown> | null;
};
export type Deck = {
  antrean: string[];
  tersimpan: string[];
  dilewati: string[];
  slot: string[];
};
export type Lokal = {
  deck: Deck;
  unggahan: { id: string }[];
  peta: Record<string, Record<string, unknown>>;
};
export type Baris = Pick<BarisServer, "source" | "state"> & {
  card?: Record<string, unknown>;
  roadmap?: Record<string, unknown>;
};

export type StatusServer = "todo" | "doing" | "done";
type LangkahPeta = Record<string, unknown>;
const langkahPeta = (roadmap?: Record<string, unknown> | null): LangkahPeta[] =>
  Array.isArray(roadmap?.langkah) ? (roadmap.langkah as LangkahPeta[]).filter((s) => !!s && typeof s === "object") : [];
function tanpaStatus(langkah: LangkahPeta): LangkahPeta {
  const s = { ...langkah };
  delete s.selesai;
  delete s.status;
  delete s.selesaiPada;
  return s;
}
/** The roadmap as a plan: without the status fields, which are not sent with the row. */
function rencana(roadmap: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(roadmap.langkah)) return roadmap;
  return { ...roadmap, langkah: (roadmap.langkah as unknown[]).map((s) => (s && typeof s === "object" ? tanpaStatus(s as LangkahPeta) : s)) };
}
/** The device's plan with the account's step status laid over it. */
function denganStatus(lokal: Record<string, unknown> | undefined, server: Record<string, unknown> | null) {
  if (!lokal || !Array.isArray(lokal.langkah)) return lokal;
  const milik = new Map(langkahPeta(server).map((s) => [String(s.id), s]));
  return {
    ...lokal,
    langkah: langkahPeta(lokal).map((langkah) => {
      const s = tanpaStatus(langkah);
      const p = milik.get(String(s.id));
      return { ...s, selesai: p?.selesai === true, status: p?.status ?? "belum", selesaiPada: p?.selesaiPada ?? "" };
    }),
  };
}
const statusLangkah = (s: LangkahPeta): StatusServer => (s.selesai === true ? "done" : s.status === "dikerjakan" ? "doing" : "todo");
/** Step status per "key/step" of the approved roadmaps of active Slots. Pure. */
export function statusPeta(slot: string[], peta: Record<string, Record<string, unknown> | null | undefined>): Map<string, StatusServer> {
  const hasil = new Map<string, StatusServer>();
  for (const id of slot) {
    const p = peta[id];
    if (p?.disetujui !== true) continue;
    for (const s of langkahPeta(p)) hasil.set(id + "/" + String(s.id), statusLangkah(s));
  }
  return hasil;
}
export const statusServer = (items: BarisServer[]) =>
  statusPeta(items.filter((b) => b.state === "slot").map((b) => b.competition_key), Object.fromEntries(items.map((b) => [b.competition_key, b.roadmap])));

const DAFTAR = {
  slot: "slot",
  saved: "tersimpan",
  skipped: "dilewati",
} as const;

/** What the device currently holds, as one row per competition. Pure. */
export function barisLokal(lokal: Lokal): Map<string, Baris> {
  const hasil = new Map<string, Baris>();
  const isi = (id: string, state: Baris["state"]) => {
    const kartu = lokal.unggahan.find((u) => u.id === id);
    const roadmap = lokal.peta[id];
    hasil.set(id, {
      state,
      source: kartu ? "manual" : "catalog",
      ...(kartu ? { card: kartu } : {}),
      ...(roadmap ? { roadmap: rencana(roadmap) } : {}),
    });
  };
  for (const id of lokal.deck.slot) isi(id, "slot");
  for (const id of lokal.deck.tersimpan) if (!hasil.has(id)) isi(id, "saved");
  for (const id of lokal.deck.dilewati) if (!hasil.has(id)) isi(id, "skipped");
  // a released Slot keeps its roadmap as history
  for (const id of Object.keys(lokal.peta))
    if (!hasil.has(id)) isi(id, "released");
  return hasil;
}

/**
 * Merges server rows into the device state without dropping anything the device has. Returns the keys it applied.
 * `dasar` is what the server last confirmed per key: a device row that differs from it is an edit that was never
 * sent, so it is kept and sent instead of being replaced by the older server row. Pure.
 */
export function gabung(
  lokal: Lokal,
  server: BarisServer[],
  dikenal: (id: string) => boolean,
  dasar: Record<string, string> = {},
): { lokal: Lokal; dipakai: string[] } {
  const kini = barisLokal(lokal);
  const unggahan = [...lokal.unggahan];
  const deck: Deck = {
    ...lokal.deck,
    antrean: [...lokal.deck.antrean],
    tersimpan: [...lokal.deck.tersimpan],
    dilewati: [...lokal.deck.dilewati],
    slot: [...lokal.deck.slot],
  };
  const peta = { ...lokal.peta };
  const dipakai: string[] = [];
  for (const b of server) {
    const id = b.competition_key;
    if (b.source === "manual" && b.card && !unggahan.some((u) => u.id === id))
      unggahan.push({ ...b.card, id });
    if (!dikenal(id) && !unggahan.some((u) => u.id === id)) continue; // a row this build cannot show stays on the server untouched
    const milikLokal = kini.get(id);
    if (milikLokal && id in dasar && dasar[id] !== JSON.stringify(milikLokal)) {
      // the unsent plan edit is kept; step status is the account's
      const p = denganStatus(peta[id], b.roadmap);
      if (p) peta[id] = p;
      continue;
    }
    for (const k of ["antrean", "tersimpan", "dilewati", "slot"] as const)
      deck[k] = deck[k].filter((x) => x !== id);
    if (b.state !== "released") deck[DAFTAR[b.state]].push(id);
    if (b.roadmap && Array.isArray(b.roadmap.langkah)) peta[id] = b.roadmap;
    dipakai.push(id);
  }
  return { lokal: { deck, unggahan, peta }, dipakai };
}

export type Langkah = { key: string; baris: Baris | null };
/** Rows that differ from what the server last confirmed. Releases go first so a swap fits the limit. Pure. */
export function selisih(
  kini: Map<string, Baris>,
  dasar: Map<string, string>,
): Langkah[] {
  const ubah: Langkah[] = [];
  for (const [key, baris] of kini)
    if (dasar.get(key) !== JSON.stringify(baris)) ubah.push({ key, baris });
  for (const key of dasar.keys())
    if (!kini.has(key)) ubah.push({ key, baris: null });
  const urut = (l: Langkah) => (l.baris?.state === "slot" ? 1 : 0);
  return ubah.sort((a, b) => urut(a) - urut(b));
}

export type HasilKirim = "ok" | "batas" | "gagal";
async function kirim({ key, baris }: Langkah): Promise<HasilKirim> {
  try {
    const res = await fetch(
      `/api/v1/user-competitions/${encodeURIComponent(key)}`,
      {
        method: baris ? "PUT" : "DELETE",
        credentials: "same-origin",
        headers: baris ? { "Content-Type": "application/json" } : undefined,
        body: baris ? JSON.stringify(baris) : undefined,
      },
    );
    if (res.ok) return "ok";
    if (res.status === 409) return "batas";
    return "gagal";
  } catch {
    return "gagal";
  }
}

export type KirimStatus = (kunci: string, status: StatusServer) => Promise<HasilKirim>;
async function kirimStatus(kunci: string, status: StatusServer): Promise<HasilKirim> {
  const i = kunci.indexOf("/");
  try {
    const res = await fetch(
      "/api/v1/tasks/" + encodeURIComponent(kunci.slice(0, i)) + "/" + encodeURIComponent(kunci.slice(i + 1)),
      { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) },
    );
    if (res.ok) return "ok";
    return res.status === 404 || res.status === 409 || res.status === 422 ? "batas" : "gagal";
  } catch {
    return "gagal";
  }
}

export async function bacaServer(): Promise<
  { status: "ok"; items: BarisServer[] } | { status: "keluar" | "gagal" }
> {
  try {
    const res = await fetch("/api/v1/user-competitions", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.status === 401) return { status: "keluar" };
    if (!res.ok) return { status: "gagal" };
    const body = (await res.json()) as { items?: BarisServer[] };
    return Array.isArray(body.items)
      ? { status: "ok", items: body.items }
      : { status: "gagal" };
  } catch {
    return { status: "gagal" };
  }
}

/** Keeps the account in step with the device after the first successful read. */
export function buatPenyinkron(
  baca: () => Lokal,
  lapor: (pesan: string) => void,
  kirimBaris: (l: Langkah) => Promise<HasilKirim> = kirim,
  awal: Record<string, string> = {},
  tulis: (dasar: Record<string, string>) => void = () => {},
  kirimTugas: KirimStatus = kirimStatus,
) {
  const dasar = new Map<string, string>(Object.entries(awal));
  const catatDasar = () => tulis(Object.fromEntries(dasar));
  const ditolak = new Map<string, string>(); // key -> row the server refused; not retried until it changes
  let status = new Map<string, StatusServer>(); // what the account holds per step
  const statusDitolak = new Map<string, StatusServer>();
  let jalan: Promise<void> = Promise.resolve();
  let jeda = 0;

  const dorong = async () => {
    for (const langkah of selisih(barisLokal(baca()), dasar)) {
      const teks = langkah.baris ? JSON.stringify(langkah.baris) : "";
      if (ditolak.get(langkah.key) === teks) continue;
      const hasil = await kirimBaris(langkah);
      if (hasil === "ok") {
        ditolak.delete(langkah.key);
        if (langkah.baris) dasar.set(langkah.key, teks);
        else dasar.delete(langkah.key);
        catatDasar();
      } else if (hasil === "batas") {
        ditolak.set(langkah.key, teks);
        lapor(
          "Slot ini melebihi batas paketmu, jadi hanya tersimpan di perangkat ini. Lepas satu Slot untuk menyimpannya ke akun.",
        );
      } else {
        lapor(
          "Belum tersimpan ke akun. Perubahanmu aman di perangkat ini dan dikirim lagi nanti.",
        );
        return;
      }
    }
    // after the rows: a roadmap has to be approved on the account before its steps can be set
    const lokal = baca();
    for (const [kunci, s] of statusPeta(lokal.deck.slot, lokal.peta)) {
      if ((status.get(kunci) ?? "todo") === s || statusDitolak.get(kunci) === s) continue;
      const hasil = await kirimTugas(kunci, s);
      if (hasil === "ok") {
        status.set(kunci, s);
        statusDitolak.delete(kunci);
      } else if (hasil === "batas") {
        statusDitolak.set(kunci, s);
        lapor("Status langkah ini belum bisa disimpan ke akun. Muat ulang untuk melihat data akunmu.");
      } else {
        lapor("Belum tersimpan ke akun. Perubahanmu aman di perangkat ini dan dikirim lagi nanti.");
        return;
      }
    }
  };

  return {
    /** Rows the server already has, in the device's own shape, so they are not sent back. */
    catat(kunci: string[]) {
      const kini = barisLokal(baca());
      for (const k of kunci) {
        const b = kini.get(k);
        if (b) dasar.set(k, JSON.stringify(b));
      }
      catatDasar();
    },
    /** Step status the account holds, from the rows just read. */
    catatStatus(items: BarisServer[]) {
      status = statusServer(items);
      statusDitolak.clear();
    },
    sekarang: () => (jalan = jalan.then(dorong)),
    nanti() {
      window.clearTimeout(jeda);
      jeda = window.setTimeout(() => void (jalan = jalan.then(dorong)), 400);
    },
    henti: () => window.clearTimeout(jeda),
  };
}

const KUNCI_CATATAN = "ata-lomba-sinkron";
type Catatan = { akun: string; dasar: Record<string, string> };
/** Which account this device's Lomba data was last synced with, and what the server confirmed then. */
export function bacaCatatan(): Catatan | null {
  try {
    const c = JSON.parse(localStorage.getItem(KUNCI_CATATAN) ?? "null");
    return c && typeof c.akun === "string" && c.dasar && typeof c.dasar === "object" ? c : null;
  } catch {
    return null;
  }
}
export function tulisCatatan(catatan: Catatan) {
  try {
    localStorage.setItem(KUNCI_CATATAN, JSON.stringify(catatan));
  } catch {
    /* storage blocked: the next visit simply takes the server rows */
  }
}
/** After "Reset data demo" the device holds sample data again: forget what was confirmed, so the account's rows win. */
export function lupakanDasar() {
  const c = bacaCatatan();
  if (c) tulisCatatan({ akun: c.akun, dasar: {} });
}
