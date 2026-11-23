"use client";

import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/masuk/masuk.css";
import "./profil-apl.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ikon } from "../../_layar/Ikon";
import { Sheet, Toast } from "../../_layar/Lapisan";
import {
  bacaAkun, bacaIzin, bacaProfil, ekspor, hapusAkun, KATEGORI_IZIN, keluar, simpanProfil, tanggal, TAHUN_LAHIR_MIN, tahunLahirMaks, ubahIzin,
  type Akun, type Izin, type Profil as DataProfil,
} from "../../_layar/akun";
import { keIsian, periksaIsian, selisih, type Isian } from "../../_layar/profil";
import { pakaiLingkup } from "../../_layar/lingkup";
import { JENJANG, MINAT, TARGET } from "@/lib/prototype/masuk/data/onboarding.js";
import { MINAT_MAKS } from "@/lib/prototype/masuk/logic/onboarding.js";

const ZONA = [
  { id: "Asia/Jakarta", nama: "WIB (Jakarta)" },
  { id: "Asia/Makassar", nama: "WITA (Makassar)" },
  { id: "Asia/Jayapura", nama: "WIT (Jayapura)" },
];
const NAMA_BIDANG: Record<string, string> = {
  display_name: "Nama panggilan", jenjang: "Jenjang", birth_year: "Tahun lahir", institution: "Sekolah atau kampus", major: "Jurusan",
  timezone: "Zona waktu", interests: "Minat lomba", targets: "Target", skills: "Kemampuan", goals_text: "Tujuan", weekly_hours: "Jam belajar",
};

type Muatan =
  | { status: "memuat" }
  | { status: "galat"; pesan: string }
  | { status: "keluar" }
  | { status: "siap"; akun: Akun; profil: DataProfil; izin: Izin | null };

/**
 * Profil tab: the account's profile, AI data permissions, export, sign-out and deletion. Layout follows the
 * prototype's masuk/ui/pengaturan.js and data-progres.js; everything shown and saved is the account's server data.
 */
export function Profil() {
  const router = useRouter();
  const [muatan, setMuatan] = useState<Muatan>({ status: "memuat" });
  const [f, setF] = useState<Isian | null>(null);
  const [galat, setGalat] = useState<{ bidang?: string; pesan: string } | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [izinSibuk, setIzinSibuk] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [hapus, setHapus] = useState(false);
  const [ketik, setKetik] = useState("");
  const [menghapus, setMenghapus] = useState(false);
  const kunci = useRef(false);
  const tutupToast = useCallback(() => setToast(null), []);

  const muat = useCallback(async () => {
    setMuatan({ status: "memuat" });
    const akun = await bacaAkun();
    if (!akun.ok) return setMuatan({ status: "galat", pesan: akun.pesan });
    if (!akun.data.signed_in || !akun.data.user) return setMuatan({ status: "keluar" });
    const [profil, izin] = await Promise.all([bacaProfil(), bacaIzin()]);
    if (!profil.ok) return setMuatan(profil.status === 401 ? { status: "keluar" } : { status: "galat", pesan: profil.pesan });
    setF(keIsian(profil.data.profile));
    setGalat(null);
    setMuatan({ status: "siap", akun: akun.data, profil: profil.data.profile, izin: izin.ok ? izin.data.categories : null });
  }, []);
  useEffect(() => { void muat(); }, [muat]);

  const kepala = (
    <div className="judul-layar">
      <h1>Profil</h1>
      <p className="hari">Profil, izin data, dan akunmu.</p>
    </div>
  );

  if (muatan.status === "memuat") {
    return <>{kepala}<div className="setelan"><p className="small muted" role="status">Memuat profilmu dari server…</p></div></>;
  }
  if (muatan.status === "galat") {
    return (
      <>
        {kepala}
        <div className="setelan">
          <div className="error" role="alert">
            <Ikon nama="alert" />
            <div><strong>Profil belum bisa dimuat.</strong><p>{muatan.pesan}</p></div>
          </div>
          <div className="btn-row"><button type="button" className="btn btn--kecil" onClick={muat}>Coba lagi</button></div>
        </div>
      </>
    );
  }
  if (muatan.status === "keluar") {
    return (
      <>
        {kepala}
        <div className="setelan">
          <section className="card">
            <h2>Kamu belum masuk</h2>
            <p className="small">Profil, izin data, dan progres per akun tersimpan di server setelah kamu masuk dengan Google. Tanpa akun, Ata tetap bisa dipakai dengan data di perangkat ini saja.</p>
            <div className="btn-row">
              <Link className="btn btn--primary btn--kecil" href="/">Masuk</Link>
              <Link className="btn btn--kecil" href="/paket">Lihat paket</Link>
            </div>
          </section>
        </div>
      </>
    );
  }
  if (!f) return null;

  const { akun, profil, izin } = muatan;
  const user = akun.user!;
  const pro = akun.plan.plan === "pro";
  const ubah = selisih(profil, f);
  const berubah = Object.keys(ubah).length > 0;
  const salah = (bidang: string) => (galat?.bidang === bidang ? true : undefined);
  const isi = <K extends keyof Isian>(k: K, v: Isian[K]) => { setGalat(null); setF({ ...f, [k]: v }); };
  const chip = (k: "interests" | "targets", o: string) => {
    const kini = f[k];
    if (!kini.includes(o) && k === "interests" && kini.length >= MINAT_MAKS) return setGalat({ bidang: k, pesan: "Maksimal lima minat. Lepas satu dulu." });
    isi(k, kini.includes(o) ? kini.filter((x) => x !== o) : [...kini, o]);
  };

  const simpan = async () => {
    if (kunci.current || !berubah) return;
    const keliru = periksaIsian(f);
    if (keliru) {
      setGalat(keliru);
      document.getElementById("p-" + keliru.bidang)?.focus();
      return;
    }
    kunci.current = true;
    setMenyimpan(true);
    const r = await simpanProfil(ubah);
    kunci.current = false;
    setMenyimpan(false);
    if (!r.ok) {
      if (r.status === 401) return setMuatan({ status: "keluar" });
      return setGalat({ bidang: r.bidang, pesan: r.bidang && NAMA_BIDANG[r.bidang] ? `${NAMA_BIDANG[r.bidang]} belum valid. Periksa lalu simpan lagi.` : r.pesan });
    }
    setMuatan({ ...muatan, profil: r.data.profile });
    setF(keIsian(r.data.profile));
    setGalat(null);
    setToast("Profil tersimpan di akunmu.");
  };

  const saklar = async (id: keyof Izin, boleh: boolean) => {
    if (!izin || izinSibuk.includes(id)) return;
    setIzinSibuk((s) => [...s, id]);
    const r = await ubahIzin(id, boleh);
    setIzinSibuk((s) => s.filter((x) => x !== id));
    if (!r.ok) return setToast(r.pesan);
    // only this category is taken from the reply: another toggle may still be in flight
    setMuatan((m) => (m.status === "siap" && m.izin ? { ...m, izin: { ...m.izin, [id]: r.data.categories[id] } } : m));
    setToast(boleh ? "Kategori ini boleh dipakai fitur AI." : "Kategori ini tidak lagi dipakai fitur AI.");
  };

  const unduh = async () => {
    const r = await ekspor();
    if (!r.ok) return setToast(r.pesan);
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" }));
    const el = Object.assign(document.createElement("a"), { href: url, download: "akun-ata.json" });
    document.body.append(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Data akun diunduh.");
  };

  const pergi = () => {
    // the account's copy on this device is dropped and the device's own data comes back
    pakaiLingkup(null);
    router.push("/");
  };

  return (
    <>
      {kepala}
      <div className="setelan">
        {profil.onboarding_done ? null : (
          <section className="card" id="ajakKenalan">
            <h2>Kenalan dulu, yuk</h2>
            <p className="small">Tujuh pertanyaan singkat supaya Ata tahu jenjang, minat, dan targetmu. Jawabannya tersimpan di akun.</p>
            <div className="btn-row"><Link className="btn btn--primary btn--kecil" href="/kenalan">Mulai kenalan</Link></div>
          </section>
        )}

        <section className="card" aria-labelledby="judulAkun">
          <div className="card__kepala"><h2 id="judulAkun">Akun</h2><span className="pill">{pro ? "Pro" : "Gratis"}</span></div>
          <dl className="rincian">
            <div><dt>Nama</dt><dd>{profil.display_name ?? user.display_name ?? "Belum diisi"}</dd></div>
            <div><dt>Akun Google</dt><dd>{user.email}</dd></div>
            <div><dt>Paket</dt><dd>{pro ? "Pro" : "Gratis"}{pro && akun.plan.ends_at ? ` sampai ${tanggal(akun.plan.ends_at)}` : ""}</dd></div>
          </dl>
          <div className="btn-row">
            <Link className="btn btn--kecil" id="kePaket" href="/paket">Lihat paket</Link>
            <Link className="btn btn--kecil btn--ghost" href="/progres">Buka Progres</Link>
          </div>
        </section>

        <form
          className="card"
          aria-labelledby="judulProfil"
          noValidate
          onSubmit={(e) => { e.preventDefault(); void simpan(); }}
        >
          <h2 id="judulProfil">Profil akademik</h2>
          <div className="profil__dua">
            <div className="field">
              <label htmlFor="p-display_name">Nama panggilan</label>
              <input className="input" id="p-display_name" maxLength={30} autoComplete="nickname" value={f.display_name} aria-invalid={salah("display_name")} onChange={(e) => isi("display_name", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-birth_year">Tahun lahir</label>
              <input className="input" id="p-birth_year" type="number" inputMode="numeric" min={TAHUN_LAHIR_MIN} max={tahunLahirMaks()} value={f.birth_year} aria-invalid={salah("birth_year")} onChange={(e) => isi("birth_year", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <span id="labelJenjang">Jenjang</span>
            <div className="pilih" role="radiogroup" aria-labelledby="labelJenjang">
              {(JENJANG as string[]).map((o, n) => (
                <button key={o} type="button" role="radio" id={n === 0 ? "p-jenjang" : undefined} aria-checked={f.jenjang === o} className="pilih__butir" onClick={() => isi("jenjang", o)}>{o}</button>
              ))}
            </div>
          </div>
          <div className="profil__dua">
            <div className="field">
              <label htmlFor="p-institution">Sekolah atau kampus</label>
              <input className="input" id="p-institution" maxLength={120} autoComplete="organization" value={f.institution} onChange={(e) => isi("institution", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-major">Jurusan atau peminatan</label>
              <input className="input" id="p-major" maxLength={120} value={f.major} onChange={(e) => isi("major", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <span id="labelMinat">Minat lomba</span>
            <div className="pilih pilih--multi" role="group" aria-labelledby="labelMinat">
              {(MINAT as string[]).map((o, n) => (
                <button key={o} type="button" id={n === 0 ? "p-interests" : undefined} className="pilih__butir" aria-pressed={f.interests.includes(o)} onClick={() => chip("interests", o)}>{o}</button>
              ))}
            </div>
            <span className="hint">{f.interests.length} dari {MINAT_MAKS} dipilih.</span>
          </div>
          <div className="field">
            <span id="labelTarget">Target utama</span>
            <div className="pilih pilih--multi" role="group" aria-labelledby="labelTarget">
              {(TARGET as string[]).map((o) => (
                <button key={o} type="button" className="pilih__butir" aria-pressed={f.targets.includes(o)} onClick={() => chip("targets", o)}>{o}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="p-skills">Kemampuan</label>
            <input className="input" id="p-skills" value={f.skills} placeholder="Menulis, riset, desain" aria-describedby="hintSkills" aria-invalid={salah("skills")} onChange={(e) => isi("skills", e.target.value)} />
            <span className="hint" id="hintSkills">Pisahkan dengan koma, maksimal sepuluh.</span>
          </div>
          <div className="field">
            <label htmlFor="p-goals_text">Tujuan dan prioritasmu</label>
            <textarea className="input" id="p-goals_text" maxLength={280} value={f.goals_text} placeholder="Contoh: lolos PKM tahun ini, fokus ke riset sosial." onChange={(e) => isi("goals_text", e.target.value)} />
          </div>
          <div className="profil__dua">
            <div className="field">
              <label htmlFor="p-weekly_hours">Jam belajar per minggu</label>
              <input className="input" id="p-weekly_hours" type="number" inputMode="numeric" min={0} max={80} value={f.weekly_hours} aria-invalid={salah("weekly_hours")} onChange={(e) => isi("weekly_hours", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p-timezone">Zona waktu</label>
              <select className="input" id="p-timezone" value={f.timezone} aria-describedby="hintZona" onChange={(e) => isi("timezone", e.target.value)}>
                {ZONA.some((z) => z.id === f.timezone) ? null : <option value={f.timezone}>{f.timezone}</option>}
                {ZONA.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
              </select>
              <span className="hint" id="hintZona">Menentukan tanggal Hari Ini dan streak.</span>
            </div>
          </div>
          <p className="galat profil__status" id="galatProfil" role="alert">{galat?.pesan ?? ""}</p>
          <div className="btn-row">
            <button type="submit" className="btn btn--primary btn--kecil" id="simpanProfil" disabled={!berubah || menyimpan}>
              {menyimpan ? "Menyimpan…" : berubah ? "Simpan perubahan" : "Tersimpan"}
            </button>
            {berubah && !menyimpan ? <button type="button" className="btn btn--ghost btn--kecil" onClick={() => { setF(keIsian(profil)); setGalat(null); }}>Batalkan</button> : null}
          </div>
        </form>

        <section className="card data-progres" aria-labelledby="judulIzin">
          <h2 id="judulIzin">Izin data untuk AI</h2>
          <p className="small">Tentukan kategori data yang boleh dibaca fitur AI. Semua mati sampai kamu menyalakannya. Fitur AI Ata belum aktif; izin ini berlaku begitu fitur itu tersedia, dan tidak mengubah rekomendasi berbasis aturan.</p>
          {izin ? (
            <ul className="data-progres__daftar">
              {KATEGORI_IZIN.map((k) => (
                <li key={k.id} className="data-progres__butir">
                  <div className="data-progres__kepala">
                    <strong id={"izin-" + k.id}>{k.nama}</strong>
                    <label className="saklar">
                      <input type="checkbox" role="switch" aria-labelledby={"izin-" + k.id} checked={izin[k.id]} disabled={izinSibuk.includes(k.id)} onChange={(e) => void saklar(k.id, e.target.checked)} />
                      <span>{izin[k.id] ? "Boleh dipakai AI" : "Tidak dipakai AI"}</span>
                    </label>
                  </div>
                  <p className="data-progres__isi">{k.isi}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="error" role="alert">
              <Ikon nama="alert" />
              <div><strong>Izin belum bisa dimuat.</strong><p>Tidak ada izin yang berubah. Muat ulang untuk mencoba lagi.</p></div>
            </div>
          )}
        </section>

        <section className="card" aria-labelledby="judulData">
          <h2 id="judulData">Data kamu</h2>
          <p className="small muted">Unduhan berisi profil, izin, lomba, tugas, dan progres akunmu dalam JSON.</p>
          <div className="btn-row">
            <button type="button" className="btn btn--kecil" id="ekspor" onClick={unduh}>Unduh data akun</button>
            <button
              type="button"
              className="btn btn--kecil btn--ghost"
              id="keluar"
              onClick={async () => {
                const r = await keluar();
                if (!r.ok) return setToast(r.pesan);
                pergi();
              }}
            >
              Keluar
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="judulHapus">
          <h2 id="judulHapus">Hapus akun</h2>
          <p className="small muted">Profil, izin, lomba, tugas, dan progres akunmu di server hilang permanen. Data di perangkat ini tidak ikut terhapus.</p>
          <div className="btn-row"><button type="button" className="btn btn--kecil btn--bahaya" id="hapusAkun" onClick={() => { setKetik(""); setHapus(true); }}>Hapus akun</button></div>
        </section>
      </div>

      {hapus ? (
        <Sheet judul="Hapus akun?" onTutup={() => setHapus(false)}>
          <div className="error"><Ikon nama="alert" /><div><strong>Tindakan ini permanen</strong><p>Profil, tugas, dan Slot akunmu akan hilang.</p></div></div>
          <div className="field">
            <label htmlFor="konfirmasi">Ketik <strong>HAPUS</strong> untuk melanjutkan</label>
            <input className="input" id="konfirmasi" autoComplete="off" placeholder="HAPUS" value={ketik} onChange={(e) => setKetik(e.target.value)} />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--bahaya"
              id="yaHapus"
              disabled={ketik.trim() !== "HAPUS" || menghapus}
              onClick={async () => {
                setMenghapus(true);
                const r = await hapusAkun();
                setMenghapus(false);
                setHapus(false);
                if (!r.ok) return setToast(r.pesan);
                pergi();
              }}
            >
              {menghapus ? "Menghapus…" : "Hapus akun"}
            </button>
            <button type="button" className="btn btn--ghost" data-batal onClick={() => setHapus(false)}>Batal</button>
          </div>
        </Sheet>
      ) : null}
      <Toast teks={toast} onSelesai={tutupToast} />
    </>
  );
}
