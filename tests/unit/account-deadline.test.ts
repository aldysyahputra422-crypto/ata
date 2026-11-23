import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { deadlineOn, withDeadline } from "@/lib/account/competitions";
import { dataAkun } from "@/app/(ata)/(apl)/hari-ini/data";
import { LOMBA_NYATA } from "@/lib/prototype/lomba/data/lomba.js";

// FR-PRG-01 / FR-SLT-01: an account's countdown = stored deadline date minus the account's day (profiles.timezone).
const catalog = (LOMBA_NYATA as { id: string; tenggatIso?: string }[]).find((l) => l.tenggatIso)!;
const row = (competition_key: string, card: Record<string, unknown> | null = null) => ({ competition_key, card });

describe("deadline of an account's competition row", () => {
  it("reads the date stored on the account's own card and ignores a saved days-left number", () => {
    expect(deadlineOn(row("manual-1", { nama: "Lomba Esai", tenggatIso: "2026-12-06", hariLagi: 99 }))).toBe("2026-12-06");
    expect(withDeadline(row("manual-1", { tenggatIso: "2026-12-06", hariLagi: 99 }), "2026-11-23")).toMatchObject({ deadline_on: "2026-12-06", days_left: 13 });
  });

  it("uses the catalogue's date for a catalogue row", () => {
    expect(deadlineOn(row(catalog.id))).toBe(catalog.tenggatIso);
  });

  it("has no deadline when no real date is stored, even with a days-left number", () => {
    for (const card of [{ hariLagi: 16 }, { tenggatIso: "2026-02-30" }, { tenggatIso: "besok" }, { tenggatIso: 20261206 }])
      expect(withDeadline(row("manual-2", card), "2026-11-23")).toMatchObject({ deadline_on: null, days_left: null });
    expect(deadlineOn(row("bukan-katalog"))).toBeNull();
  });

  it("counts on the account's day: deadline today, passed, and the same row on two account days", () => {
    const r = row("manual-1", { tenggatIso: "2026-11-24" });
    expect(withDeadline(r, "2026-11-24").days_left).toBe(0);
    expect(withDeadline(r, "2026-11-27").days_left).toBe(-3);
    // 23:30 in Jakarta is already the 24th in Makassar: the server passes each account its own day
    expect(withDeadline(r, "2026-11-23").days_left).toBe(1);
  });

  it("keeps every other field of the row", () => {
    expect(withDeadline({ ...row("manual-1", { tenggatIso: "2026-12-06" }), state: "slot" }, "2026-12-06")).toEqual({
      competition_key: "manual-1", card: { tenggatIso: "2026-12-06" }, state: "slot", deadline_on: "2026-12-06", days_left: 0,
    });
  });
});

describe("Hari Ini and Progres for an account", () => {
  const summary = { xp: 0, level: 1, xpLevel: 0, keLevelBerikut: 100, streak: 0, selesai: 0, tepat: 0, tuntas: 0, pencapaian: [] };
  const roadmap = { disetujui: true, langkah: [{ id: "s1", nama: "A", tanggal: "2026-11-23" }, { id: "s2", nama: "B", tanggal: "2026-11-20" }] };
  const akun = (today: string, card: Record<string, unknown> | null, deadline_on: string | null, key = "manual-1") =>
    dataAkun({ today, timezone: "Asia/Makassar", plan: "free", slot_limit: 1, summary, activity: {},
      competitions: [{ competition_key: key, source: card ? "manual" : "catalog", state: "slot", card, roadmap, deadline_on }] } as Parameters<typeof dataAkun>[0]);
  const kartu = { nama: "Lomba Esai", kategori: "karya-tulis", tenggatIso: "2026-12-06", hariLagi: 99 };

  it("counts the Slot ring from the server's deadline date and the account's day", () => {
    expect(akun("2026-11-23", kartu, "2026-12-06").slot[0]).toMatchObject({ tenggat: "2026-12-06", c: { sisaHari: 13, label: "13 hari lagi" } });
    expect(akun("2026-12-06", kartu, "2026-12-06").slot[0].c).toMatchObject({ sisaHari: 0, label: "Tenggat hari ini", lewat: false });
    expect(akun("2026-12-08", kartu, "2026-12-06").slot[0].c).toMatchObject({ sisaHari: -2, label: "Lewat tenggat 2 hari", lewat: true });
  });

  it("does not fall back to a saved number or the device clock when the server has no date", () => {
    expect(akun("2026-11-23", { nama: "Poster lama", hariLagi: 16 }, null).slot[0]).toMatchObject({ tenggat: null, c: { sisaHari: null, label: "Tanpa tenggat" } });
  });

  it("a catalogue Slot follows the account's day, not the device's", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2031-05-05T00:00:00Z")); // a device clock years off
      const s = akun("2026-11-23", null, catalog.tenggatIso!, catalog.id).slot[0];
      expect(s.tenggat).toBe(catalog.tenggatIso);
      expect(s.c.sisaHari).toBe(Math.round((Date.parse(catalog.tenggatIso!) - Date.parse("2026-11-23")) / 864e5));
    } finally { vi.useRealTimers(); }
  });

  it("marks a task late only after its day has passed on the account's day", () => {
    expect(akun("2026-11-23", kartu, "2026-12-06").telat).toBe(1); // s2 (20th) is late, s1 (23rd) is due today
    expect(akun("2026-11-20", kartu, "2026-12-06").telat).toBe(0);
    expect(akun("2026-11-24", kartu, "2026-12-06").telat).toBe(2);
  });
});
