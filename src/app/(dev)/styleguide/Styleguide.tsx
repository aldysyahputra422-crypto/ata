"use client";

import { CircleCheck, Clock, Monitor, Moon, Sun, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ds/Button";
import { Card } from "@/components/ds/Card";
import { EmptyState } from "@/components/ds/EmptyState";
import { FolderCard, FolderCardEmpty } from "@/components/ds/FolderCard";
import { useFx } from "@/components/ds/FxProvider";
import { CategoryChip, GemChip, MentorChip } from "@/components/ds/GemChip";
import { HeroCard } from "@/components/ds/HeroCard";
import { Field, Input, Textarea } from "@/components/ds/Input";
import { navIcon } from "@/components/ds/nav-icons";
import { PosterCard, PosterCardEmpty, PosterRail } from "@/components/ds/PosterCard";
import { ProgressRing } from "@/components/ds/ProgressRing";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ds/Sheet";
import { Stamp, Sticker } from "@/components/ds/Sticker";
import { TactileSegmented } from "@/components/ds/TactileSegmented";
import { CATEGORY_CODES, mentorTone } from "@/lib/categories";
import type { GlassPref, ThemePref } from "@/lib/fx/prefs";
import type { FxPref } from "@/lib/fx/resolve-fx";
import { fxStore } from "@/lib/fx/store";
import { NAV_ITEMS } from "@/lib/nav";
import "./styleguide.css";

type Width = "full" | "390" | "768" | "1280";

// Fictional organisers only (DEMO-08).
const POSTERS = [
  { title: "Lomba Business Plan Nusantara Muda", organizer: "Forum Wirausaha Pelajar Arunika", category: "business_plan", deadlineLabel: "12 hari lagi", source: "infolomba.arunika", reasons: ["Cocok dengan minat bisnis kamu", "Gratis, sesuai batas biayamu"] },
  { title: "LKTI Pangan Lokal 2027", organizer: "Himpunan Riset Tunas Cendekia", category: "kti_essay", deadlineLabel: "21 hari lagi", source: "tunascendekia", reasons: ["Jenjang SMA diterima", "Butuh ±6 jam per minggu"] },
  { title: "Olimpiade Sains Lintang", organizer: "Yayasan Lintang Ilmu", category: "olympiad", deadlineLabel: "5 hari lagi", source: "lintangilmu", reasons: ["Sesuai peminatan MIPA", "Tahap awal daring"] },
  { title: "Poster Digital: Kota Ramah Pejalan Kaki", organizer: "Komunitas Ruang Jalan", category: "poster", deadlineLabel: "9 hari lagi", source: "ruangjalan.id", reasons: ["Skill desain kamu 4 dari 5", "Boleh solo"] },
  { title: "Cerpen Remaja: Rumah yang Jauh", organizer: "Sanggar Aksara Senja", category: "creative_writing", deadlineLabel: "30 hari lagi", source: "aksarasenja", reasons: ["Kamu pilih menulis kreatif", "Tanpa biaya pendaftaran"] },
] as const;

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="sg-section" id={id} aria-labelledby={`${id}-h`}>
      <header>
        <h2 id={`${id}-h`}>{title}</h2>
        {note ? <p className="t-small t-muted">{note}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Swatch({ name, value, text }: { name: string; value: string; text?: string }) {
  return (
    <div className="sg-swatch">
      <span className="sg-swatch__chip" style={{ background: value, color: text }} />
      <span className="t-caption">{name}</span>
    </div>
  );
}

function FpsPanel() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      frames++;
      if (now - t0 >= 1000) {
        setFps(Math.round((frames * 1000) / (now - t0)));
        frames = 0;
        t0 = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function simulateLoad() {
    fxStore.restartGovernor();
    const end = performance.now() + 5000;
    const burn = () => {
      const stop = performance.now() + 70; // hold each frame ~70 ms => ~14 fps
      while (performance.now() < stop) {
        /* intentional busy wait to trip the governor */
      }
      if (performance.now() < end) requestAnimationFrame(burn);
    };
    requestAnimationFrame(burn);
  }

  return (
    <div className="sg-fps">
      <span className="tabular">
        <strong>{fps}</strong> fps
      </span>
      <Button size="sm" variant="ghost" onClick={simulateLoad}>
        Simulasikan beban
      </Button>
    </div>
  );
}

function Toolbar({ width, setWidth }: { width: Width; setWidth: (w: Width) => void }) {
  const fx = useFx();
  return (
    <div className="sg-toolbar glass-thin" data-specular>
      <div className="sg-toolbar__group">
        <span className="t-label t-muted">Tema</span>
        <TactileSegmented<ThemePref>
          label="Tema"
          variant="icon"
          value={fx.theme}
          onChange={fxStore.setTheme}
          options={[
            { value: "light", label: "Terang", icon: <Sun aria-hidden="true" /> },
            { value: "dark", label: "Gelap", icon: <Moon aria-hidden="true" /> },
            { value: "auto", label: "Otomatis", icon: <Monitor aria-hidden="true" /> },
          ]}
        />
      </div>
      <div className="sg-toolbar__group">
        <span className="t-label t-muted">Kaca</span>
        <TactileSegmented<GlassPref>
          label="Efek kaca"
          size="sm"
          value={fx.glass}
          onChange={fxStore.setGlass}
          options={[
            { value: "full", label: "Penuh" },
            { value: "light", label: "Ringan" },
            { value: "off", label: "Mati" },
          ]}
        />
      </div>
      <div className="sg-toolbar__group">
        <span className="t-label t-muted">
          Efek <span className="sg-level">aktif: {fx.level === "rich" ? "penuh" : "minim"}</span>
        </span>
        <TactileSegmented<FxPref>
          label="Efek gerak"
          size="sm"
          value={fx.fx}
          onChange={fxStore.setFx}
          options={[
            { value: "auto", label: "Otomatis" },
            { value: "rich", label: "Penuh" },
            { value: "minimal", label: "Minim" },
          ]}
        />
      </div>
      <div className="sg-toolbar__group">
        <span className="t-label t-muted">Lebar</span>
        <TactileSegmented<Width>
          label="Lebar tampilan"
          size="sm"
          value={width}
          onChange={setWidth}
          options={[
            { value: "full", label: "Layar" },
            { value: "390", label: "390" },
            { value: "768", label: "768" },
            { value: "1280", label: "1280" },
          ]}
        />
      </div>
      <FpsPanel />
    </div>
  );
}

function Content() {
  const [seg, setSeg] = useState<"chat" | "resep" | "ingatan">("chat");
  const [mode, setMode] = useState<"sun" | "snow" | "rain" | "moon">("snow");
  const [tab, setTab] = useState<string>(NAV_ITEMS[0].href);
  const [name, setName] = useState("");
  const nameError = name.length > 0 && name.trim().length < 2 ? "Nama panggilan minimal 2 huruf." : undefined;

  return (
    <div className="sg-content">
      <Section id="palet" title="Palet" note="Mist netral, merek, semantik, dan 6 permata. Permata untuk kategori; status memakai warna semantik datar.">
        <div className="sg-swatches">
          {["0", "50", "100", "200", "300", "500", "600", "800", "900"].map((n) => (
            <Swatch key={n} name={`mist-${n}`} value={`var(--mist-${n})`} />
          ))}
        </div>
        <div className="sg-swatches">
          <Swatch name="bg" value="var(--bg)" />
          <Swatch name="surface" value="var(--surface)" />
          <Swatch name="surface-sunken" value="var(--surface-sunken)" />
          <Swatch name="primary" value="var(--primary)" />
          <Swatch name="primary-soft" value="var(--primary-soft)" />
          <Swatch name="hero-a" value="var(--hero-a)" />
          <Swatch name="hero-b" value="var(--hero-b)" />
          <Swatch name="spark (isian)" value="var(--spark)" />
        </div>
        <div className="sg-swatches">
          {(["success", "warn", "danger", "info"] as const).flatMap((s) => [
            <Swatch key={s} name={s} value={`var(--${s})`} />,
            <Swatch key={`${s}-soft`} name={`${s}-soft`} value={`var(--${s}-soft)`} />,
          ])}
        </div>
        <div className="sg-row">
          {(["mint", "lavender", "apricot", "sky", "rose", "lemon"] as const).map((t) => (
            <GemChip key={t} tone={t}>
              {t}
            </GemChip>
          ))}
        </div>
      </Section>

      <Section id="tipografi" title="Tipografi" note="Judul: Plus Jakarta Sans 700–800, rapat. Isi: Inter 400–500.">
        <Card className="sg-type">
          <p className="t-display">Asisten lombamu.</p>
          <h1>Ata nemu 3 lomba buat kamu hari ini</h1>
          <h2>Peta Jalan LKTI Pangan Lokal</h2>
          <h3>Riset dan kerangka</h3>
          <p>Isi 16/24. Kamu lagi fokus di Lomba KTI sampai 20 Des. Radar istirahat dulu.</p>
          <p className="t-small t-muted">Pendukung 14/20. Deadline dibaca dari poster, cek poster asli sebelum daftar.</p>
          <p className="t-caption t-muted">Caption 12/16 untuk metadata.</p>
          <p className="t-label t-muted">Label kecil</p>
          <p className="tabular font-display" style={{ fontWeight: 800, fontSize: "2rem" }}>
            07.00 · 18/40 · 72%
          </p>
        </Card>
      </Section>

      <Section id="material" title="Bayangan dan material kaca" note="Kaca hanya untuk tab bar, sheet, folder, dan jendela hero. Matikan lewat pengalih Kaca untuk memeriksa mode solid.">
        <div className="sg-material">
          <div className="sg-material__bg" aria-hidden="true" />
          <div className="sg-tile" style={{ boxShadow: "var(--shadow-1)" }}>shadow-1</div>
          <div className="sg-tile" style={{ boxShadow: "var(--shadow-2)" }}>shadow-2</div>
          <div className="sg-tile" style={{ boxShadow: "var(--shadow-3)" }}>shadow-3</div>
          <div className="sg-tile glass-thin" data-specular>glass-thin</div>
          <div className="sg-tile glass-frost" data-specular>glass-frost</div>
          <div className="sg-tile" style={{ background: "transparent", boxShadow: "none" }}>
            <GemChip tone="lavender">gem</GemChip>
          </div>
        </div>
      </Section>

      <Section id="tombol" title="Tombol">
        <div className="sg-row">
          <Button>Setujui peta jalan</Button>
          <Button variant="secondary">Simpan dulu</Button>
          <Button variant="ghost">Nanti</Button>
          <Button variant="danger">Lepas slot</Button>
        </div>
        <div className="sg-row">
          <Button size="sm">Salin prompt</Button>
          <Button loading>Menyimpan</Button>
          <Button disabled>Slot penuh</Button>
          <IconButton label="Pengingat deadline">
            <Clock aria-hidden="true" />
          </IconButton>
        </div>
      </Section>

      <Section id="input" title="Input">
        <div className="sg-grid-2">
          <Field label="Nama panggilan" hint="Dipakai Ata saat menyapa kamu." error={nameError}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                placeholder="mis. Raka"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
              />
            )}
          </Field>
          <Field label="API key" error="Key ditolak provider. Cek lagi key-nya atau ganti model.">
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} defaultValue="sk-demo-salah" />
            )}
          </Field>
          <Field label="Hambatan terbesar" hint="Boleh dilewati.">
            {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} placeholder="Ceritain singkat aja" />}
          </Field>
          <Field label="Institusi (nonaktif)">{({ id }) => <Input id={id} disabled defaultValue="SMAN 3 Arunika" />}</Field>
        </div>
      </Section>

      <Section id="segmented" title="TactileSegmented dan tab bar" note="Referensi 4. Panah kiri/kanan, Home, End berfungsi. Di desktop knob punya tepi ganda dan sedikit mengikuti kursor.">
        <div className="sg-stack">
          <div style={{ width: "min(100%, 320px)" }}>
            <TactileSegmented
              label="Mode contoh"
              variant="icon"
              value={mode}
              onChange={setMode}
              options={[
                { value: "sun", label: "Terang", icon: <Sun aria-hidden="true" /> },
                { value: "snow", label: "Otomatis", icon: <Monitor aria-hidden="true" /> },
                { value: "rain", label: "Fokus", icon: <Clock aria-hidden="true" /> },
                { value: "moon", label: "Gelap", icon: <Moon aria-hidden="true" /> },
              ]}
            />
          </div>
          <div style={{ width: "min(100%, 360px)" }}>
            <TactileSegmented
              label="Tanya Ata"
              value={seg}
              onChange={setSeg}
              options={[
                { value: "chat", label: "Chat" },
                { value: "resep", label: "Resep" },
                { value: "ingatan", label: "Ingatan" },
              ]}
            />
          </div>
          <div className="glass-thin sg-tabbar" data-specular>
            <TactileSegmented
              label="Contoh tab bar"
              variant="tab"
              value={tab}
              onChange={setTab}
              options={NAV_ITEMS.map((n) => ({ value: n.href, label: n.label, icon: navIcon(n.icon) }))}
              className="sg-tabbar__seg"
            />
          </div>
          <p className="t-small t-muted">
            Tab bar asli memakai tautan rute. Buka <a href="/hari-ini">/hari-ini</a> untuk melihatnya melayang di HP dan menjadi rail di
            layar ≥ 1024 px.
          </p>
        </div>
      </Section>

      <Section id="gem" title="GemChip, stiker, stempel, lencana status" note="Referensi 3. Pemetaan kategori tetap; chip mentor selalu berwarna sama per mentor.">
        <div className="sg-row">
          {CATEGORY_CODES.map((c) => (
            <CategoryChip key={c} category={c} />
          ))}
        </div>
        <div className="sg-row">
          {CATEGORY_CODES.slice(0, 4).map((c) => (
            <CategoryChip key={c} category={c} size="sm" />
          ))}
        </div>
        <div className="sg-row" style={{ gap: 28, padding: "12px 0 0 16px" }}>
          <MentorChip name="Kak Dimas" tone={mentorTone("mentor-dimas")} />
          <MentorChip name="Kak Rani" tone={mentorTone("mentor-rani")} point="right" />
          <Sticker category="business_plan" />
          <Sticker category="olympiad" rotate={5} />
          <Sticker category="creative_writing" rotate={-3} />
          <Stamp daysLeft={12} />
          <Stamp daysLeft={2} />
        </div>
        <div className="sg-row">
          <span className="badge" data-status="success">
            <CircleCheck aria-hidden="true" /> Selesai
          </span>
          <span className="badge" data-status="warn">
            <TriangleAlert aria-hidden="true" /> Tertinggal 2 hari
          </span>
          <span className="badge" data-status="danger">
            <TriangleAlert aria-hidden="true" /> Deadline lewat
          </span>
          <span className="badge" data-status="info">
            <CircleCheck aria-hidden="true" /> Yakin
          </span>
          <span className="badge" data-status="warn">
            <TriangleAlert aria-hidden="true" /> Cek poster asli
          </span>
        </div>
      </Section>

      <Section id="poster" title="PosterCard dan PosterRail" note="Referensi 1. Geser di HP, grid di desktop. Bayangan mengambil warna poster. Tanpa blur.">
        <PosterRail label="Contoh hasil Radar">
          {POSTERS.map((p) => (
            <PosterCard key={p.title} {...p} demo reasons={[...p.reasons]} />
          ))}
          <PosterCardEmpty title="Hari ini belum ada yang cocok." text="Aku tetap pantau besok." />
        </PosterRail>
      </Section>

      <Section id="folder" title="FolderCard: Slot" note="Referensi 2. Bertumpuk di HP, sebaris di desktop. Di desktop folder membuka saat disorot.">
        <div className="sg-folders">
          <FolderCard
            name="LKTI Pangan Lokal 2027"
            countLabel="7 dari 18 tugas"
            category="kti_essay"
            daysLeft={21}
            peeks={[{ tone: "lavender" }, { tone: "sky" }, { tone: "apricot" }]}
          />
          <FolderCard name="Business Plan Nusantara Muda" countLabel="2 dari 22 tugas" category="business_plan" daysLeft={3} peeks={[{ tone: "mint" }]} />
          <FolderCardEmpty hint="Pilih satu lomba" />
        </div>
      </Section>

      <Section id="ring" title="ProgressRing" note="Cincin tidak pernah merah saat tertinggal; status disampaikan dengan ikon dan kata.">
        <div className="sg-row" style={{ gap: 28 }}>
          <div className="sg-ring">
            <ProgressRing value={0} label="Business Plan Nusantara Muda" />
            <span className="t-small">Baru mulai</span>
          </div>
          <div className="sg-ring">
            <ProgressRing value={39} label="LKTI Pangan Lokal" />
            <span className="badge" data-status="warn">
              <TriangleAlert aria-hidden="true" /> Tertinggal 2 hari
            </span>
          </div>
          <div className="sg-ring">
            <ProgressRing value={100} label="Poster Kota Ramah Pejalan Kaki" />
            <span className="badge" data-status="success">
              <CircleCheck aria-hidden="true" /> Siap submit
            </span>
          </div>
        </div>
      </Section>

      <Section id="hero" title="HeroCard" note="Referensi 3. Di desktop, bercak warna, jendela, dan chip bergerak berlapis mengikuti kursor.">
        <HeroCard
          window={
            <div className="sg-hero-window">
              <span className="layer" data-depth="front" style={{ display: "inline-flex" }}>
                <MentorChip name="Kak Dimas" tone={mentorTone("mentor-dimas")} point="right" />
              </span>
              <p className="hero-card__headline">
                Nemu lomba.
                <br />
                Susun rencana.
              </p>
              <span className="layer" data-depth="front" style={{ display: "inline-flex", marginLeft: "40%" }}>
                <MentorChip name="Kak Rani" tone={mentorTone("mentor-rani")} />
              </span>
            </div>
          }
        >
          <h3 style={{ fontSize: "1.5rem" }}>Ata nemenin sampai submit</h3>
          <p className="t-muted">Pakai AI yang kamu pilih sendiri. Maksimal 3 lomba aktif, biar tetap fokus.</p>
          <Button style={{ marginTop: 8 }}>Mulai kenalan</Button>
        </HeroCard>
      </Section>

      <Section id="overlay" title="Sheet, dialog, dan toast" note="Sheet dari bawah di HP, dialog di tengah mulai 768 px. Esc menutup; fokus dikembalikan.">
        <div className="sg-row">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Buka sheet</Button>
            </SheetTrigger>
            <SheetContent title="Lepas slot ini?" description="LKTI Pangan Lokal 2027 akan keluar dari 3 slot fokusmu. Peta jalannya tetap tersimpan di riwayat.">
              <div className="sheet__actions">
                <SheetClose asChild>
                  <Button variant="ghost">Batal</Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="danger">Lepas slot</Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" onClick={() => toast("Prompt tersalin.", { description: "Tempel ke AI pilihanmu." })}>
            Tampilkan toast
          </Button>
          <Button variant="ghost" onClick={() => toast.error("Gagal menyimpan. Coba lagi.")}>
            Toast galat
          </Button>
        </div>
      </Section>

      <Section id="kosong" title="EmptyState, kartu, skeleton" note="Maskot resmi dari Sobat Ambis belum ada di repo, jadi tempatnya ditandai dengan lingkaran berukuran sama.">
        <div className="sg-grid-2">
          <Card>
            <EmptyState
              pose="tidur"
              title="Hari ini belum ada yang cocok."
              text="Aku tetap pantau besok. Mau unggah poster yang kamu temukan sendiri?"
              action={<Button size="sm">Unggah poster</Button>}
            />
          </Card>
          <Card className="sg-skeletons" aria-busy="true" aria-label="Contoh keadaan memuat">
            <div className="skeleton" style={{ height: 20, width: "60%" }} />
            <div className="skeleton" style={{ height: 56 }} />
            <div className="skeleton" style={{ height: 56 }} />
            <div className="skeleton" style={{ height: 56, width: "85%" }} />
          </Card>
        </div>
      </Section>
    </div>
  );
}

export function Styleguide({ embed }: { embed: boolean }) {
  const [width, setWidth] = useState<Width>("full");
  const frame = useRef<HTMLIFrameElement>(null);

  if (embed) {
    return (
      <main className="page sg-page">
        <Content />
      </main>
    );
  }

  return (
    <main className="page sg-page">
      <header className="sg-header">
        <p className="t-label t-muted">Ata Design System · Airy Glass</p>
        <h1>Styleguide</h1>
        <p className="t-muted">Halaman review visual. Semua data di sini contoh, penyelenggara fiktif.</p>
      </header>
      <Toolbar width={width} setWidth={setWidth} />
      {width === "full" ? (
        <Content />
      ) : (
        <div className="sg-frame-wrap">
          <iframe
            ref={frame}
            title={`Pratinjau lebar ${width} px`}
            src="/styleguide?embed=1"
            className="sg-frame"
            style={{ width: `${width}px` }}
          />
        </div>
      )}
    </main>
  );
}
