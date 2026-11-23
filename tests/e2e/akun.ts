import type { Page } from "@playwright/test";

// A stand-in for the account's progress API (FR-PRG-03): GET /api/v1/progress and PUT /api/v1/tasks/{key}/{step}.
// Like the server, it owns task status and XP; the page only sends { status }.
export type Kirim = { key: string; step: string; body: Record<string, unknown> };
const STATUS = { todo: "belum", doing: "dikerjakan", done: "selesai" } as const;
type Status = keyof typeof STATUS;
const iso = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
const lusa = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

export const peta = (langkah = 3, disetujui = true) => ({
  disetujui,
  langkah: Array.from({ length: langkah }, (_, i) => ({ id: "s" + (i + 1), nama: "Langkah akun " + (i + 1), tanggal: lusa(i + 2) })),
});

export async function progresAkun(page: Page, opts: { slot?: string[]; limit?: number; plan?: string; fail?: () => number | undefined; today?: () => string; deadline?: Record<string, string>; timezone?: string } = {}) {
  const slot = opts.slot ?? ["interval-2027"];
  const rencana = Object.fromEntries(slot.map((k) => [k, peta()]));
  const status = new Map<string, { status: Status; pada: string }>();
  const sent: Kirim[] = [];
  const today = () => opts.today?.() ?? iso(new Date());
  const summary = () => {
    const done = [...status.values()].filter((s) => s.status === "done");
    const tuntas = slot.filter((k) => rencana[k].langkah.every((l) => status.get(k + "/" + l.id)?.status === "done")).length;
    const xp = done.length * 10 + tuntas * 20;
    return { xp, level: Math.floor(xp / 100) + 1, xpLevel: xp % 100, keLevelBerikut: 100 - (xp % 100), streak: done.some((s) => s.pada === today()) ? 1 : 0, selesai: done.length, tepat: done.length, tuntas, pencapaian: [] };
  };
  const activity = () => {
    const out: Record<string, number> = {};
    for (const s of status.values()) if (s.status === "done") out[s.pada] = (out[s.pada] ?? 0) + 1;
    return out;
  };
  const body = () => ({
    today: today(), timezone: opts.timezone ?? "Asia/Jakarta", plan: opts.plan ?? "free", slot_limit: opts.limit ?? 1, summary: summary(), activity: activity(),
    competitions: slot.map((k) => ({
      competition_key: k, source: "catalog", state: "slot", card: null, deadline_on: opts.deadline?.[k] ?? null,
      roadmap: { ...rencana[k], langkah: rencana[k].langkah.map((l) => {
        const s = status.get(k + "/" + l.id);
        return { ...l, selesai: s?.status === "done", status: STATUS[s?.status ?? "todo"], selesaiPada: s?.status === "done" ? s.pada : "" };
      }) },
    })),
  });
  await page.route("**/api/v1/progress", (route) => {
    const gagal = opts.fail?.();
    return gagal ? route.fulfill({ status: gagal, json: { error: { code: "unavailable" } } }) : route.fulfill({ json: body() });
  });
  await page.route("**/api/v1/tasks/*/*", (route) => {
    const [key, step] = route.request().url().split("/").slice(-2).map(decodeURIComponent);
    const kiriman = route.request().postDataJSON() as Record<string, unknown>;
    sent.push({ key, step, body: kiriman });
    const gagal = opts.fail?.();
    if (gagal) return route.fulfill({ status: gagal, json: { error: { code: "unavailable" } } });
    const id = key + "/" + step;
    const lama = status.get(id)?.status ?? "todo";
    const baru = kiriman.status as Status;
    if (lama !== baru) status.set(id, { status: baru, pada: today() });
    return route.fulfill({ json: { changed: lama !== baru, today: today(), summary: summary() } });
  });
  return { sent, status };
}
