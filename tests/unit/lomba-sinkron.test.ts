import { describe, expect, it } from "vitest";
import { barisLokal, buatPenyinkron, gabung, selisih, statusPeta, type StatusServer, type BarisServer, type HasilKirim, type Langkah, type Lokal } from "@/app/(ata)/(apl)/lomba/sinkron";

// M1 Lomba account sync (K-03, K-23): device data is never dropped, a Slot the plan rejects stays on the device.
const lokal = (over: Partial<Lokal["deck"]> = {}, extra: Partial<Lokal> = {}): Lokal => ({
  deck: { antrean: ["a", "b"], tersimpan: [], dilewati: [], slot: [], ...over },
  unggahan: [],
  peta: {},
  ...extra,
});
const server = (key: string, state: BarisServer["state"], over: Partial<BarisServer> = {}): BarisServer => ({ competition_key: key, source: "catalog", state, card: null, roadmap: null, ...over });

describe("barisLokal", () => {
  it("maps Slot, saved, skipped and released rows; the queue is not sent", () => {
    const rows = barisLokal(lokal({ slot: ["s"], tersimpan: ["t"], dilewati: ["d"] }, { peta: { s: { langkah: [1] }, lama: { langkah: [] } }, unggahan: [{ id: "t" }] }));
    expect([...rows.keys()].sort()).toEqual(["d", "lama", "s", "t"]);
    expect(rows.get("s")).toEqual({ state: "slot", source: "catalog", roadmap: { langkah: [1] } });
    expect(rows.get("t")).toEqual({ state: "saved", source: "manual", card: { id: "t" } });
    expect(rows.get("lama")?.state).toBe("released");
  });
});

describe("gabung", () => {
  const known = (id: string) => ["a", "b", "c"].includes(id);
  it("adds server rows and keeps everything the device already has", () => {
    const { lokal: hasil, dipakai } = gabung(lokal({ antrean: ["b", "c"], slot: ["a"] }), [server("b", "slot", { roadmap: { langkah: [], disetujui: true } }), server("c", "saved")], known);
    expect(hasil.deck.slot).toEqual(["a", "b"]);
    expect(hasil.deck.tersimpan).toEqual(["c"]);
    expect(hasil.deck.antrean).toEqual([]);
    expect(hasil.peta.b).toEqual({ langkah: [], disetujui: true });
    expect(dipakai).toEqual(["b", "c"]);
  });
  it("keeps Slots above the plan limit: three server Slots stay three", () => {
    const { lokal: hasil } = gabung(lokal(), ["a", "b", "c"].map((k) => server(k, "slot")), known);
    expect(hasil.deck.slot).toEqual(["a", "b", "c"]);
  });
  it("restores a manual card from the account and ignores rows this build cannot show", () => {
    const { lokal: hasil, dipakai } = gabung(lokal(), [server("u-1", "saved", { source: "manual", card: { nama: "Lomba sendiri" } }), server("hilang", "slot")], known);
    expect(hasil.unggahan).toEqual([{ nama: "Lomba sendiri", id: "u-1" }]);
    expect(hasil.deck.tersimpan).toEqual(["u-1"]);
    expect(hasil.deck.slot).toEqual([]);
    expect(dipakai).toEqual(["u-1"]);
  });
  it("a released row leaves every list", () => {
    const { lokal: hasil } = gabung(lokal({ slot: ["a"] }), [server("a", "released")], known);
    expect(hasil.deck.slot).toEqual([]);
  });
});

describe("selisih", () => {
  it("sends only changed rows, releases before new Slots", () => {
    const kini = barisLokal(lokal({ slot: ["b"], tersimpan: ["c"] }, { peta: { a: { langkah: [] } } }));
    const dasar = new Map([["c", JSON.stringify(kini.get("c"))], ["a", JSON.stringify({ state: "slot", source: "catalog" })], ["x", "{}"]]);
    const langkah = selisih(kini, dasar);
    expect(langkah.map((l) => [l.key, l.baris?.state ?? null])).toEqual([["a", "released"], ["x", null], ["b", "slot"]]);
  });
});

describe("buatPenyinkron", () => {
  const jalankan = async (data: Lokal, jawab: (l: Langkah) => HasilKirim) => {
    const terkirim: Langkah[] = [];
    const pesan: string[] = [];
    const p = buatPenyinkron(() => data, (m) => pesan.push(m), async (l) => {
      terkirim.push(l);
      return jawab(l);
    });
    return { p, terkirim, pesan };
  };
  it("a Slot over the limit is refused once, reported, and stays on the device", async () => {
    const data = lokal({ slot: ["a", "b"] });
    const { p, terkirim, pesan } = await jalankan(data, (l) => (l.key === "b" ? "batas" : "ok"));
    await p.sekarang();
    await p.sekarang();
    expect(terkirim.map((l) => l.key)).toEqual(["a", "b"]);
    expect(pesan).toHaveLength(1);
    expect(pesan[0]).toContain("batas paket");
    expect(data.deck.slot).toEqual(["a", "b"]);
  });
  it("retries the refused Slot after another one is released", async () => {
    const data = lokal({ slot: ["a", "b"] });
    let penuh = true;
    const { p, terkirim } = await jalankan(data, (l) => (l.baris?.state === "slot" && l.key === "b" && penuh ? "batas" : "ok"));
    await p.sekarang();
    data.deck.slot = ["b"];
    data.peta = { a: { langkah: [] } };
    penuh = false;
    await p.sekarang();
    expect(terkirim.map((l) => [l.key, l.baris?.state])).toEqual([["a", "slot"], ["b", "slot"], ["a", "released"]]);
  });
  it("a failed request stops the run and is sent again next time", async () => {
    const data = lokal({ tersimpan: ["a", "b"] });
    let hidup = false;
    const { p, terkirim, pesan } = await jalankan(data, () => (hidup ? "ok" : "gagal"));
    await p.sekarang();
    expect(terkirim).toHaveLength(1);
    expect(pesan[0]).toContain("aman di perangkat ini");
    hidup = true;
    await p.sekarang();
    expect(terkirim.map((l) => l.key)).toEqual(["a", "a", "b"]);
  });
  it("rows the server already has are not sent back", async () => {
    const data = lokal({ slot: ["a"] });
    const { p, terkirim } = await jalankan(data, () => "ok");
    p.catat(["a"]);
    await p.sekarang();
    expect(terkirim).toEqual([]);
  });
});

describe("unsent edits (three-way merge)", () => {
  const known = () => true;
  const lama = { langkah: [{ id: 1, nama: "Draf" }] };
  const baru = { langkah: [{ id: 1, nama: "Draf akhir" }] };

  it("a roadmap edit that never reached the account survives the next read and is sent", async () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: baru } });
    const dasar = { a: JSON.stringify({ state: "slot", source: "catalog", roadmap: lama }) };
    const { lokal: hasil, dipakai } = gabung(data, [server("a", "slot", { roadmap: lama })], known, dasar);
    expect(hasil.peta.a).toMatchObject(baru);
    expect(dipakai).toEqual([]);

    const terkirim: Langkah[] = [];
    const p = buatPenyinkron(() => data, () => {}, async (l) => { terkirim.push(l); return "ok"; }, dasar);
    p.catat(dipakai);
    await p.sekarang();
    expect(terkirim.map((l) => l.baris?.roadmap)).toEqual([baru]);
  });

  it("an unchanged device row takes the newer server row", () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: lama } });
    const dasar = { a: JSON.stringify({ state: "slot", source: "catalog", roadmap: lama }) };
    const { lokal: hasil, dipakai } = gabung(data, [server("a", "slot", { roadmap: baru })], known, dasar);
    expect(hasil.peta.a).toEqual(baru);
    expect(dipakai).toEqual(["a"]);
  });

  it("without a confirmed row (first sign-in, or after a demo reset) the account wins", () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: lama } });
    expect(gabung(data, [server("a", "slot", { roadmap: baru })], known).lokal.peta.a).toEqual(baru);
  });

  it("a row missing on the device is restored from the account, never deleted because of the missing copy", () => {
    const dasar = { a: JSON.stringify({ state: "slot", source: "catalog" }) };
    expect(gabung(lokal({ antrean: [] }), [server("a", "slot")], known, dasar).lokal.deck.slot).toEqual(["a"]);
  });

  it("writes what the server confirmed, so it is known on the next visit", async () => {
    const tulis: Record<string, string>[] = [];
    const p = buatPenyinkron(() => lokal({ antrean: [], slot: ["a"] }), () => {}, async () => "ok", {}, (d) => tulis.push(d));
    await p.sekarang();
    expect(Object.keys(tulis.at(-1)!)).toEqual(["a"]);
  });
});

// M1 Personal Progress (FR-PRG-03): step status is the account's, set through /api/v1/tasks, never sent inside the roadmap row.
describe("step status", () => {
  const known = () => true;
  const peta = (status: string, selesai = status === "selesai") => ({ disetujui: true, langkah: [{ id: "s1", nama: "Draf", status, selesai, selesaiPada: selesai ? "2026-11-23" : "" }] });
  const rencana = { disetujui: true, langkah: [{ id: "s1", nama: "Draf" }] };

  it("is not part of the row sent to the account", () => {
    const rows = barisLokal(lokal({ antrean: [], slot: ["a"] }, { peta: { a: peta("selesai") } }));
    expect(rows.get("a")?.roadmap).toEqual(rencana);
  });

  it("only approved roadmaps of active Slots have tasks", () => {
    expect([...statusPeta(["a"], { a: peta("dikerjakan"), b: peta("selesai") })]).toEqual([["a/s1", "doing"]]);
    expect(statusPeta(["a"], { a: { ...peta("selesai"), disetujui: false } }).size).toBe(0);
  });

  it("a change is sent once as a task status, after the rows, and not again", async () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: peta("belum") } });
    const urutan: string[] = [];
    const p = buatPenyinkron(() => data, () => {}, async (l) => { urutan.push("baris:" + l.key); return "ok"; }, {}, () => {},
      async (kunci: string, status: StatusServer) => { urutan.push(kunci + "=" + status); return "ok"; });
    p.catatStatus([server("a", "slot", { roadmap: peta("belum") })]);
    await p.sekarang();
    expect(urutan).toEqual(["baris:a"]);
    data.peta.a = peta("selesai");
    await p.sekarang();
    await p.sekarang();
    expect(urutan).toEqual(["baris:a", "a/s1=done"]);
    data.peta.a = peta("belum");
    await p.sekarang();
    expect(urutan.at(-1)).toBe("a/s1=todo");
  });

  it("status the account already holds is not sent back; a refused one is not retried", async () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: peta("selesai") } });
    const dasar = { a: JSON.stringify(barisLokal(data).get("a")) };
    const terkirim: string[] = [];
    const pesan: string[] = [];
    const p = buatPenyinkron(() => data, (m) => pesan.push(m), async () => "ok", dasar, () => {}, async (kunci) => { terkirim.push(kunci); return "batas"; });
    p.catatStatus([server("a", "slot", { roadmap: peta("selesai") })]);
    await p.sekarang();
    expect(terkirim).toEqual([]);
    data.peta.a = peta("dikerjakan");
    await p.sekarang();
    await p.sekarang();
    expect(terkirim).toEqual(["a/s1"]);
    expect(pesan).toHaveLength(1);
  });

  it("an unsent plan edit is kept, but its step status is the account's", () => {
    const data = lokal({ antrean: [], slot: ["a"] }, { peta: { a: { disetujui: true, langkah: [{ id: "s1", nama: "Draf akhir", status: "belum", selesai: false }] } } });
    const dasar = { a: JSON.stringify({ state: "slot", source: "catalog", roadmap: rencana }) };
    const { lokal: hasil, dipakai } = gabung(data, [server("a", "slot", { roadmap: peta("selesai") })], known, dasar);
    expect(dipakai).toEqual([]);
    expect(hasil.peta.a.langkah).toEqual([{ id: "s1", nama: "Draf akhir", selesai: true, status: "selesai", selesaiPada: "2026-11-23" }]);
  });
});
