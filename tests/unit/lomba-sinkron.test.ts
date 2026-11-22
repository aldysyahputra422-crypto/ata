import { describe, expect, it } from "vitest";
import { barisLokal, buatPenyinkron, gabung, selisih, type BarisServer, type HasilKirim, type Langkah, type Lokal } from "@/app/(ata)/(apl)/lomba/sinkron";

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
