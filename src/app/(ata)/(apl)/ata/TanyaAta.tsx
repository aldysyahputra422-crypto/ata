"use client";

import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/tanya/tanya.css";
import "./tanya-apl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ikon } from "../../_layar/Ikon";
import { Sheet, Toast } from "../../_layar/Lapisan";
import { KATEGORI_IZIN } from "../../_layar/akun";
import { renderMarkdown } from "@/lib/prototype/tanya/logic/markdown.js";
import {
  bacaStatus, muatModel, putuskan, sambungkan, siapkanPrompt, tanya,
  type Alasan, type Asal, type Galat, type Riwayat, type Status,
} from "./api";

const BATAS = 12000;
// prototype tanya/ui/chat.js AKSI_CEPAT
const AKSI_CEPAT = [
  { label: "Cek aturan", isi: "Cek aturan lomba di Slot aktifku: apa saja yang wajib kupenuhi?" },
  { label: "Review ide", isi: "Tolong review ideku: " },
  { label: "Pecah tugas", isi: "Pecah tugasku minggu ini jadi langkah kecil." },
  { label: "Simulasi juri", isi: "Simulasi juri: beri aku tiga pertanyaan tersulit untuk karyaku." },
  { label: "Aku mentok", isi: "Aku mentok. Bantu aku mulai lagi dari langkah terkecil." },
];
const ALASAN: Record<Alasan, string> = {
  signed_out: "kamu belum masuk",
  guardian_consent_required: "butuh persetujuan orang tua atau wali",
  permission_off: "izinnya mati",
};
const NAMA = Object.fromEntries(KATEGORI_IZIN.map((k) => [k.id, k.nama])) as Record<string, string>;
const PERBAIKAN: Record<string, string> = { reconnect: "Atur sambungan AI", change_model: "Ganti model", retry: "Coba lagi", wait: "Coba lagi", sign_in: "Masuk" };

type Pesan =
  | { id: number; jenis: "aku"; teks: string }
  | { id: number; jenis: "ata"; teks: string; model: string; asal: Asal | null; mengalir: boolean; peringatan: string[]; catatan?: string }
  | { id: number; jenis: "galat"; galat: Galat; pertanyaan: string };
/** The server reads the last 12 messages and rejects more than 40. */
const RIWAYAT_MAKS = 24;
type Muatan = { status: "memuat" } | { status: "galat"; pesan: string } | { status: "siap"; data: Status };

function Sumber({ asal }: { asal: Asal }) {
  const terblokir = asal.blocked.map((b) => `${NAMA[b.category] ?? b.category} (${ALASAN[b.reason]})`);
  return (
    <details className="tanya__sumber">
      <summary>
        {asal.sources.length ? `Data akun yang dipakai: ${asal.sources.length} sumber` : "Tanpa data akun"} · {asal.intent_label}
      </summary>
      {asal.sources.length > 0 && (
        <ul>
          {asal.sources.map((s) => (
            <li key={s.id}>
              <strong>[{s.id}] {s.label}</strong> <span className="muted">· {NAMA[s.category] ?? s.category}</span>
              <pre className="wrap-any">{s.text}</pre>
            </li>
          ))}
        </ul>
      )}
      {terblokir.length > 0 && <p className="small muted">Tidak dipakai: {terblokir.join(", ")}.</p>}
      {asal.empty.length > 0 && <p className="small muted">Belum ada datanya: {asal.empty.map((c) => NAMA[c] ?? c).join(", ")}.</p>}
      {asal.trimmed.length > 0 && <p className="small muted">Dipotong karena terlalu panjang: {asal.trimmed.map((c) => NAMA[c] ?? c).join(", ")}.</p>}
    </details>
  );
}

function SheetSambung({ data, onTutup, onBerubah }: { data: Status; onTutup: () => void; onBerubah: (pesan: string) => void }) {
  const ada = data.connection;
  const [penyedia, setPenyedia] = useState(ada?.provider_id ?? data.providers[0]?.id ?? "");
  const [kunci, setKunci] = useState("");
  const [alamat, setAlamat] = useState("");
  const [model, setModel] = useState("");
  const [daftar, setDaftar] = useState<string[] | null>(null);
  const [lihat, setLihat] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const dipilih = data.providers.find((p) => p.id === penyedia);
  const isi = { provider_id: penyedia, api_key: kunci.trim(), ...(dipilih?.needs_base_url ? { base_url: alamat.trim() } : {}) };

  const jalankan = async (kerja: () => Promise<string | null>) => {
    setSibuk(true);
    setGalat(null);
    const pesan = await kerja();
    setSibuk(false);
    if (pesan) setGalat(pesan);
  };
  const cek = () => jalankan(async () => {
    const hasil = await muatModel(isi);
    if (!hasil.ok) return hasil.galat.message;
    setDaftar(hasil.data.models);
    setModel((m) => (hasil.data.models.includes(m) ? m : hasil.data.models[0] ?? m));
    return null;
  });
  const simpan = () => jalankan(async () => {
    const hasil = await sambungkan({ ...isi, model: model.trim() });
    if (!hasil.ok) return hasil.galat.message;
    setKunci("");
    onBerubah(`Tersambung ke ${hasil.data.connection.provider_name}.`);
    return null;
  });
  const hapus = () => jalankan(async () => {
    const hasil = await putuskan();
    if (!hasil.ok) return hasil.galat.message;
    onBerubah("Sambungan diputus dan key dihapus.");
    return null;
  });

  return (
    <Sheet judul="Sambungkan AI-mu" onTutup={onTutup}>
      <div className="tanya-sheet">
        <p className="small">
          Pakai API key milikmu sendiri. Key dikirim ke server Ata lewat HTTPS, dienkripsi, dan hanya berlaku selama sesi masuk ini (paling lama 12 jam).
          Ata tidak punya key cadangan dan tidak menampilkan key-mu lagi setelah disimpan.
        </p>
        {ada && (
          <div className="banner banner--ok">
            <Ikon nama="check" />
            <p>Tersambung ke <strong>{ada.provider_name}</strong> · <code>{ada.model}</code> · key berakhiran {ada.last4}.</p>
          </div>
        )}
        <fieldset className="ai-penyedia" disabled={sibuk}>
          <legend className="field__label">Penyedia</legend>
          {data.providers.map((p) => (
            <label className="ai-penyedia__pilih" key={p.id}>
              <input type="radio" name="aiPenyedia" value={p.id} checked={p.id === penyedia} onChange={() => { setPenyedia(p.id); setDaftar(null); setModel(""); setGalat(null); }} />
              <span>{p.name}</span>
            </label>
          ))}
        </fieldset>
        {dipilih?.needs_base_url && (
          <div className="field">
            <label htmlFor="aiAlamat">Alamat API (https)</label>
            <input className="input" id="aiAlamat" type="url" inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://contoh.com/v1" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
            <span className="hint">Harus https dan alamat publik. Alamat lokal atau jaringan privat ditolak.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="aiKunci">API key</label>
          <div className="ai-kunci">
            <input className="input" id="aiKunci" type={lihat ? "text" : "password"} autoComplete="off" spellCheck={false} value={kunci} onChange={(e) => { setKunci(e.target.value); setDaftar(null); }} />
            <button type="button" className="btn btn--ghost btn--kecil" aria-pressed={lihat} aria-controls="aiKunci" onClick={() => setLihat((v) => !v)}>{lihat ? "Tutup" : "Lihat"}</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="aiModel">Model</label>
          {daftar && daftar.length > 0 ? (
            <select className="input" id="aiModel" value={model} onChange={(e) => setModel(e.target.value)}>
              {daftar.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input className="input" id="aiModel" autoComplete="off" spellCheck={false} placeholder="ID model dari penyediamu" value={model} onChange={(e) => setModel(e.target.value)} />
          )}
          <span className="hint">
            {daftar === null ? "Tekan \"Cek key\" untuk memuat daftar model dari penyediamu, atau ketik ID model." : daftar.length ? `${daftar.length} model tersedia untuk key ini.` : "Penyedia ini tidak memberi daftar model. Ketik ID modelnya."}
          </span>
        </div>
        <div className="banner banner--warn">
          <Ikon nama="alert" />
          <span>Pemakaian API ditagih ke akun penyediamu sendiri. Pertanyaanmu dan data akun yang kamu izinkan dikirim ke penyedia itu.</span>
        </div>
        <div aria-live="polite">{galat && <p className="error" role="alert">{galat}</p>}</div>
        <div className="btn-row">
          <button type="button" className="btn" disabled={sibuk || kunci.trim().length < 8} onClick={cek}>Cek key</button>
          <button type="button" className="btn btn--primary" disabled={sibuk || kunci.trim().length < 8 || !model.trim()} onClick={simpan}>{sibuk ? "Menguji…" : "Simpan & uji koneksi"}</button>
        </div>
        {ada && <button type="button" className="btn btn--ghost" disabled={sibuk} onClick={hapus}>Putuskan & hapus key</button>}
      </div>
    </Sheet>
  );
}

/**
 * Tanya Ata tab. Layout follows the prototype's tanya/ui/chat.js. With a connected key the answer comes from the
 * user's own provider through /api/v1/tanya/chat; without one the screen only prepares a prompt to copy and says so.
 * The conversation lives in memory for this visit only.
 */
export function TanyaAta() {
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [tulis, setTulis] = useState("");
  const [galatTulis, setGalatTulis] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [konteks, setKonteks] = useState(false);
  const [sambung, setSambung] = useState(false);
  const [prompt, setPrompt] = useState<{ teks: string; asal: Asal } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const batal = useRef<AbortController | null>(null);
  const nomor = useRef(0);
  const kotak = useRef<HTMLDivElement>(null);
  const masukan = useRef<HTMLTextAreaElement>(null);
  const tutupToast = useCallback(() => setToast(null), []);

  const muat = useCallback(async (diam = false) => {
    if (!diam) setMuatan({ status: "memuat" });
    const hasil = await bacaStatus();
    setMuatan(hasil.ok ? { status: "siap", data: hasil.data } : { status: "galat", pesan: hasil.galat.message });
  }, []);
  useEffect(() => { void muat(); }, [muat]);
  useEffect(() => () => batal.current?.abort(), []);
  useEffect(() => {
    const el = kotak.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pesan]);

  const kepala = (
    <div className="judul-layar">
      <h1>Tanya Ata</h1>
      <p className="hari">Tanya soal lomba, ide, dan rencanamu.</p>
    </div>
  );
  if (muatan.status === "memuat") {
    return <>{kepala}<div className="tanya"><p className="small muted" role="status">Memeriksa sambungan AI dan izin datamu…</p></div></>;
  }
  if (muatan.status === "galat") {
    return (
      <>
        {kepala}
        <div className="tanya">
          <div className="banner banner--danger" role="alert"><Ikon nama="alert" /><p>{muatan.pesan}</p></div>
          <div className="btn-row"><button type="button" className="btn btn--primary btn--kecil" onClick={() => void muat()}>Coba lagi</button></div>
        </div>
      </>
    );
  }

  const data = muatan.data;
  const tersambung = data.signed_in && !!data.connection;
  const diizinkan = KATEGORI_IZIN.filter((k) => data.permissions[k.id]?.allowed);
  const riwayat = (): Riwayat => {
    const out: Riwayat = [];
    for (const p of pesan) {
      if (p.jenis === "aku") out.push({ role: "user", content: p.teks });
      else if (p.jenis === "ata" && p.teks) out.push({ role: "assistant", content: p.teks });
      else if (p.jenis === "galat") {
        // A failed turn is not part of the conversation: drop its question and any partial answer.
        while (out.length && out.pop()?.role !== "user");
      }
    }
    return out.slice(-RIWAYAT_MAKS);
  };

  const periksa = (teks: string) => {
    if (!teks.trim()) return "Tulis pertanyaanmu dulu.";
    if (teks.length > BATAS) return `Teksmu ${teks.length.toLocaleString("id-ID")} karakter, batasnya 12.000. Potong ${(teks.length - BATAS).toLocaleString("id-ID")} karakter dulu.`;
    return null;
  };

  const kirim = async (isi = tulis) => {
    const salah = periksa(isi);
    setGalatTulis(salah);
    if (salah || sibuk) return;
    const pertanyaan = isi.trim();
    if (!tersambung) {
      setSibuk(true);
      const hasil = await siapkanPrompt(pertanyaan, []);
      setSibuk(false);
      if (!hasil.ok) return setGalatTulis(hasil.galat.message);
      return setPrompt({ teks: hasil.data.prompt, asal: hasil.data.provenance });
    }
    const sebelum = riwayat();
    const idAta = ++nomor.current + 1;
    nomor.current += 1;
    // A retry replaces the failed attempt instead of repeating the question.
    setPesan((p) => [
      ...p.filter((x) => !(x.jenis === "galat" && x.pertanyaan === pertanyaan)).filter((x, i, a) => !(i === a.length - 1 && x.jenis === "aku" && x.teks === pertanyaan)),
      { id: idAta - 1, jenis: "aku", teks: pertanyaan },
      { id: idAta, jenis: "ata", teks: "", model: data.connection?.model ?? "", asal: null, mengalir: true, peringatan: [] },
    ]);
    setTulis("");
    setSibuk(true);
    const kendali = new AbortController();
    batal.current = kendali;
    const ubah = (ganti: (p: Extract<Pesan, { jenis: "ata" }>) => Pesan) =>
      setPesan((semua) => semua.map((p) => (p.id === idAta && p.jenis === "ata" ? ganti(p) : p)));
    await tanya(pertanyaan, sebelum, kendali.signal, (e) => {
      if (e.type === "meta") ubah((p) => ({ ...p, model: e.model, asal: e.provenance }));
      else if (e.type === "delta") ubah((p) => ({ ...p, teks: p.teks + e.text }));
      else if (e.type === "done") ubah((p) => ({ ...p, mengalir: false, peringatan: e.warnings }));
      else if (e.code === "stopped") ubah((p) => ({ ...p, mengalir: false, catatan: "Kamu menghentikan jawaban ini." }));
      else {
        // Keep what already arrived, marked as incomplete; an empty bubble is replaced by the error.
        setPesan((semua) => [
          ...semua.flatMap((p) => (p.id !== idAta || p.jenis !== "ata" ? [p] : p.teks ? [{ ...p, mengalir: false, catatan: "Jawaban ini terpotong dan belum lengkap." }] : [])),
          { id: ++nomor.current, jenis: "galat", galat: e, pertanyaan },
        ]);
        if (e.action === "reconnect" || e.code === "no_connection" || e.code === "connection_expired") void muat(true);
      }
    });
    batal.current = null;
    setSibuk(false);
  };

  const perbaiki = (p: Extract<Pesan, { jenis: "galat" }>) => {
    const aksi = p.galat.action;
    if (aksi === "reconnect" || aksi === "change_model") return setSambung(true);
    if (aksi === "sign_in") return window.location.assign("/");
    void kirim(p.pertanyaan);
  };
  const salin = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.teks);
      setToast("Prompt disalin. Tempel ke AI favoritmu.");
    } catch {
      setToast("Tidak bisa menyalin otomatis. Blok teksnya lalu salin manual.");
    }
  };

  return (
    <>
      {kepala}
      <div className="tanya">
        {!data.signed_in && (
          <div className="banner">
            <Ikon nama="lock" />
            <p>Kamu belum masuk, jadi Ata tidak memakai data akun dan tidak bisa menyambung ke AI. <Link href="/">Masuk</Link> untuk menyambungkan AI-mu sendiri.</p>
          </div>
        )}
        <div className="chat">
          <div className="ctxline">
            <span className="ctxline__ikon"><Ikon nama="sparkle" /></span>
            <p className="small">
              {diizinkan.length
                ? <>Ata boleh memakai <strong>{diizinkan.length} dari 8</strong> kategori datamu: {diizinkan.map((k) => k.nama).join(", ")}.</>
                : <>Ata <strong>tidak memakai data akunmu</strong>. Semua izin data mati.</>}
            </p>
            <button type="button" className="linkbtn" aria-expanded={konteks} aria-controls="ctxDetail" onClick={() => setKonteks((v) => !v)}>{konteks ? "tutup" : "lihat"}</button>
          </div>
          <div className="ctxdetail" id="ctxDetail" hidden={!konteks}>
            <div className="ctxdetail__blok">
              <p className="eyebrow">Izin data untuk AI</p>
              <ul className="ctxdetail__daftar">
                {KATEGORI_IZIN.map((k) => {
                  const izin = data.permissions[k.id];
                  return <li key={k.id} className="wrap-any"><strong>{k.nama}</strong>: {izin?.allowed ? "boleh dipakai" : `tidak dipakai, ${ALASAN[izin?.reason ?? "permission_off"]}`}</li>;
                })}
              </ul>
              <p className="small muted">Ata hanya mengambil kategori yang relevan dengan pertanyaanmu, dan hanya yang diizinkan. Tiap jawaban menunjukkan data apa yang dipakai.</p>
              {data.signed_in && <Link className="linkbtn" href="/profil">Atur izin di Profil</Link>}
            </div>
          </div>

          <div className="chat__body" id="pesanBox" ref={kotak} aria-live="polite" aria-label="Percakapan dengan Ata" tabIndex={0}>
            {pesan.length === 0 && (
              <div className="empty">
                <img src="/prototype/assets/wink.svg" alt="" width={96} height={96} />
                <h2>Mau tanya apa?</h2>
                <p className="small muted">
                  {tersambung ? "Tulis pertanyaanmu atau pilih aksi cepat di bawah. Jawaban dibuat oleh model AI yang kamu sambungkan." : "AI belum tersambung. Tulis pertanyaanmu, lalu Ata menyusun prompt untuk kamu jalankan di AI favoritmu."}
                </p>
              </div>
            )}
            {pesan.map((p) => {
              if (p.jenis === "aku") {
                return (
                  <article className="msg msg--me" key={p.id}>
                    <div className="msg__col"><p className="msg__meta">Kamu</p><div className="msg__bubble wrap-any">{p.teks}</div></div>
                  </article>
                );
              }
              if (p.jenis === "galat") {
                return (
                  <div className="msg msg--galat" role="alert" key={p.id}>
                    <Ikon nama="alert" />
                    <div>
                      <strong>Jawaban tidak berhasil dibuat</strong>
                      <p>{p.galat.message}</p>
                      <div className="btn-row">
                        <button type="button" className="btn btn--kecil" disabled={sibuk} onClick={() => perbaiki(p)}>{PERBAIKAN[p.galat.action ?? "retry"] ?? "Coba lagi"}</button>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <article className="msg msg--ata" key={p.id}>
                  <img className="msg__ava" src="/prototype/assets/wink.svg" alt="" width={36} height={36} />
                  <div className="msg__col">
                    <p className="msg__meta">Ata <span className="msg__sumber msg__sumber--ai">AI · {p.model}</span></p>
                    {p.peringatan.map((w) => <div className="banner banner--warn" key={w}><Ikon nama="shield" /><p>{w}</p></div>)}
                    {p.teks
                      ? <div className="msg__bubble msg__bubble--md wrap-any" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.teks) }} />
                      : <div className="msg__bubble"><span className="typing" role="status" aria-label="Ata sedang menulis"><i /><i /><i /></span></div>}
                    {p.catatan && <p className="small muted">{p.catatan}</p>}
                    {p.asal && <Sumber asal={p.asal} />}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="chips" role="group" aria-label="Aksi cepat">
            {AKSI_CEPAT.map((a) => (
              <button type="button" className="chip" key={a.label} onClick={() => { setTulis(a.isi); setGalatTulis(null); masukan.current?.focus(); }}>{a.label}</button>
            ))}
          </div>
          <div className="ai-status" id="aiStatus" aria-live="polite">
            {tersambung && data.connection ? (
              <>
                <span className="ai-status__titik ai-status__titik--ok" />
                <span>Tersambung ke <strong>{data.connection.provider_name}</strong> · <code>{data.connection.model}</code></span>
                <button type="button" className="linkbtn" onClick={() => setSambung(true)}>Atur</button>
              </>
            ) : (
              <>
                <span className="ai-status__titik" />
                <span>Mode Tanpa Key: Ata tidak menjalankan AI dan tidak membuat jawaban. Ata menyusun prompt untuk kamu salin.</span>
                {data.signed_in && data.byok_available && <button type="button" className="linkbtn" onClick={() => setSambung(true)}>Sambungkan AI</button>}
              </>
            )}
          </div>
          {data.signed_in && !data.byok_available && <p className="small muted">Penyimpanan key belum disiapkan di server ini, jadi sambungan AI belum bisa dipakai.</p>}
          <div className="composer">
            <label className="sr-only" htmlFor="tulis">Tulis pesan untuk Ata</label>
            <textarea
              id="tulis" ref={masukan} className="composer__input" rows={2} placeholder="Tulis atau tempel teks (maks 12.000 karakter)" aria-describedby="hitung"
              value={tulis} aria-invalid={galatTulis ? true : undefined}
              onChange={(e) => { setTulis(e.target.value); setGalatTulis(e.target.value.length > BATAS ? periksa(e.target.value) : null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void kirim(); } }}
            />
            <div className="composer__bar">
              <span className={"small muted num" + (tulis.length > BATAS ? " num--lewat" : "")} id="hitung">{tulis.length.toLocaleString("id-ID")}/{BATAS.toLocaleString("id-ID")}</span>
              {sibuk && tersambung
                ? <button type="button" className="btn btn--kecil" id="hentikan" onClick={() => batal.current?.abort()}><Ikon nama="pause" />Hentikan</button>
                : <button type="button" className="btn btn--primary btn--kecil" id="kirim" disabled={sibuk} onClick={() => void kirim()}><Ikon nama="send" />{tersambung ? "Kirim" : sibuk ? "Menyusun…" : "Siapkan prompt"}</button>}
            </div>
            {galatTulis && <p className="error" id="galatTempel" role="alert">{galatTulis}</p>}
          </div>
        </div>
      </div>

      {sambung && <SheetSambung data={data} onTutup={() => setSambung(false)} onBerubah={(teks) => { setSambung(false); setToast(teks); void muat(true); }} />}
      {prompt && (
        <Sheet judul="Prompt siap disalin" onTutup={() => setPrompt(null)}>
          <div className="tanya-sheet">
            <p className="small muted">Ini bukan jawaban AI. Tempel prompt ini ke AI favoritmu (Gemini, ChatGPT, Claude) untuk mendapat jawabannya.</p>
            <div className="promptbox"><pre className="promptbox__teks" id="promptSalin" tabIndex={0}>{prompt.teks}</pre></div>
            <Sumber asal={prompt.asal} />
            <div className="btn-row">
              <button type="button" className="btn btn--primary" id="salinPrompt" onClick={() => void salin()}>Salin prompt</button>
              <button type="button" className="btn btn--ghost" onClick={() => setPrompt(null)}>Tutup</button>
            </div>
          </div>
        </Sheet>
      )}
      <Toast teks={toast} onSelesai={tutupToast} />
    </>
  );
}
