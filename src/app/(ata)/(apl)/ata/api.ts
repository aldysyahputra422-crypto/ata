// Client access to the Tanya Ata API. Every call resolves, never throws. The API key is only ever sent, never read back.
export type Alasan = "signed_out" | "guardian_consent_required" | "permission_off";
export type Sambungan = { provider_id: string; provider_name: string; model: string; last4: string; expires_at: string };
export type Penyedia = { id: string; name: string; notes: string; needs_base_url: boolean };
export type Status = {
  signed_in: boolean;
  byok_available: boolean;
  connection: Sambungan | null;
  providers: Penyedia[];
  permissions: Record<string, { allowed: boolean; reason?: Alasan }>;
};
export type Asal = {
  intent: string;
  intent_label: string;
  sources: { id: string; category: string; label: string; text: string }[];
  blocked: { category: string; reason: Alasan }[];
  empty: string[];
  trimmed: string[];
};
export type Galat = { code: string; message: string; action?: string; retry_after_s?: number };
export type Hasil<T> = { ok: true; data: T } | { ok: false; galat: Galat; status?: number };
export type Riwayat = { role: "user" | "assistant"; content: string }[];

const OFFLINE: Galat = { code: "network", message: "Server Ata tidak bisa dihubungi. Periksa koneksi lalu coba lagi.", action: "retry" };

async function panggil<T>(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<Hasil<T>> {
  try {
    const res = await fetch(path, {
      method, cache: "no-store", credentials: "same-origin", signal,
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data) return { ok: true, data: data as T };
    const e = data?.error;
    return { ok: false, status: res.status, galat: typeof e?.message === "string" ? { code: String(e.code), message: e.message, retry_after_s: e.retry_after_s } : OFFLINE };
  } catch {
    return { ok: false, galat: OFFLINE };
  }
}

export const bacaStatus = () => panggil<Status>("/api/v1/tanya/status");
export const muatModel = (isi: { provider_id: string; api_key: string; base_url?: string }) =>
  panggil<{ models: string[] }>("/api/v1/connections/models", "POST", isi);
export const sambungkan = (isi: { provider_id: string; api_key: string; model: string; base_url?: string }) =>
  panggil<{ connection: Sambungan }>("/api/v1/connections", "POST", isi);
export const putuskan = () => panggil<{ connection: null }>("/api/v1/connections", "DELETE");
export const siapkanPrompt = (question: string, history: Riwayat) =>
  panggil<{ prompt: string; provenance: Asal }>("/api/v1/tanya/prompt", "POST", { question, history });

export type Peristiwa =
  | { type: "meta"; provider: string; model: string; provenance: Asal; cleared?: string[] }
  | { type: "delta"; text: string }
  | { type: "done"; warnings: string[] }
  | ({ type: "error"; partial?: boolean; categories?: string[]; guardian?: boolean } & Galat);

/** Streams one answer. `kategori` are the data categories the earlier turns in `history` were answered with.
 *  Calls `pada` for each server event; resolves when the stream ends, is cut, or is stopped. */
export async function tanya(question: string, history: Riwayat, kategori: string[], signal: AbortSignal, pada: (p: Peristiwa) => void): Promise<void> {
  let selesai = false;
  const lapor = (p: Peristiwa) => {
    if (p.type === "done" || p.type === "error") selesai = true;
    pada(p);
  };
  try {
    const res = await fetch("/api/v1/tanya/chat", {
      method: "POST", cache: "no-store", credentials: "same-origin", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, history, context_categories: kategori }),
    });
    if (!res.ok || !res.body) {
      const e = (await res.json().catch(() => null))?.error;
      const action = res.status === 409 ? "reconnect" : res.status === 401 ? "sign_in" : res.status === 429 ? "wait" : "retry";
      return lapor(typeof e?.message === "string" ? { type: "error", code: String(e.code), message: e.message, retry_after_s: e.retry_after_s, action } : { type: "error", ...OFFLINE });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sisa = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      sisa += decoder.decode(value, { stream: true });
      const bagian = sisa.split("\n\n");
      sisa = bagian.pop() ?? "";
      for (const b of bagian) {
        if (!b.startsWith("data: ")) continue;
        try {
          lapor(JSON.parse(b.slice(6)) as Peristiwa);
        } catch {
          // a malformed event is skipped; the stream end below reports the cut
        }
      }
    }
    if (!selesai) lapor({ type: "error", code: "network", message: "Koneksi putus sebelum jawaban selesai.", action: "retry", partial: true });
  } catch {
    if (signal.aborted) return lapor({ type: "error", code: "stopped", message: "Kamu menghentikan jawaban ini.", partial: true });
    if (!selesai) lapor({ type: "error", ...OFFLINE, partial: true });
  }
}
