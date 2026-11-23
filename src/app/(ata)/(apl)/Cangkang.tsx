"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon } from "../_layar/Ikon";
// prototype modules, copied verbatim (environment, mascot, dock scale)
import { pasangLingkungan } from "@/lib/prototype/shared/lingkungan.js";
import { buatMaskot } from "@/lib/prototype/shared/maskot.js";
import { skalaDok } from "@/lib/prototype/shared/logic/lingkungan.js";

// Tanya Ata and Progres still point at the old foundation routes until each screen migrates.
export const TAB = [
  { id: "hari-ini", label: "Hari Ini", ikon: "sun", href: "/hari-ini" },
  { id: "lomba", label: "Lomba", ikon: "trophy", href: "/lomba" },
  { id: "tanya", label: "Tanya Ata", ikon: "chat", href: "/ata" },
  { id: "progres", label: "Progres", ikon: "ring", href: "/progres" },
  { id: "profil", label: "Profil", ikon: "user", href: "/profil" },
] as const;

const DemoContext = createContext(false);
export const useDemo = () => useContext(DemoContext);

function Nav({ aktif, rail = false }: { aktif: string; rail?: boolean }) {
  return (
    <>
      <span className="tab-penanda" aria-hidden="true" />
      {TAB.map((t) => (
        <Link key={t.id} className={rail ? "tab rail__tab" : "tab"} href={t.href} data-tab={t.id} aria-current={t.href === aktif ? "page" : undefined}>
          <Ikon nama={t.ikon} />
          <span>{t.label}</span>
        </Link>
      ))}
    </>
  );
}

/** Port of the prototype shell (app.html + app/app.js): rail on desktop, tab bar on phones, sliding active marker. */
export function Cangkang({ demo, children }: { demo: boolean; children: ReactNode }) {
  const aktif = usePathname();
  const rail = useRef<HTMLElement>(null);
  const tabbar = useRef<HTMLElement>(null);

  useEffect(() => {
    pasangLingkungan();
    const logo = rail.current?.querySelector("img");
    const maskot = buatMaskot({ ukuran: 60, kelas: "maskot--rail" });
    logo?.after(maskot.el);

    // macOS-style dock on the desktop rail: fine pointers only, off under reduced motion (app/app.js pasangDok)
    const seg = rail.current?.querySelector<HTMLElement>(".rail__seg");
    const tab = seg ? [...seg.querySelectorAll<HTMLElement>(".tab")] : [];
    const dok = matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gerak = (e: PointerEvent) => {
      seg?.classList.add("is-dok");
      for (const t of tab) {
        const r = t.getBoundingClientRect();
        t.style.setProperty("--dok", String(skalaDok(e.clientY - (r.top + r.height / 2), { maks: 1.5, jangkau: 140 })));
      }
    };
    const pergi = () => {
      seg?.classList.remove("is-dok");
      for (const t of tab) t.style.setProperty("--dok", "1");
    };
    const induk = dok ? seg?.parentElement : null;
    induk?.addEventListener("pointermove", gerak);
    induk?.addEventListener("pointerleave", pergi);
    return () => {
      maskot.lepas();
      induk?.removeEventListener("pointermove", gerak);
      induk?.removeEventListener("pointerleave", pergi);
    };
  }, []);

  // active marker follows the current tab (app/app.js geserPenanda)
  useEffect(() => {
    const geser = () => {
      for (const wadah of [tabbar.current, rail.current?.querySelector<HTMLElement>(".rail__seg")]) {
        const p = wadah?.querySelector<HTMLElement>(".tab-penanda");
        const kini = wadah?.querySelector<HTMLElement>('[aria-current="page"]');
        if (!p || !kini || !kini.offsetWidth) continue;
        const pertama = !p.style.getPropertyValue("--pw");
        if (pertama) p.style.transition = "none";
        p.style.setProperty("--px", `${kini.offsetLeft}px`);
        p.style.setProperty("--py", `${kini.offsetTop}px`);
        p.style.setProperty("--pw", `${kini.offsetWidth}px`);
        p.style.setProperty("--ph", `${kini.offsetHeight}px`);
        if (pertama) {
          void p.offsetWidth;
          requestAnimationFrame(() => {
            p.style.transition = "";
          });
        }
      }
    };
    geser();
    void document.fonts?.ready.then(geser);
    // the bar and the rail are observed too: their own padding can settle after #app has its size
    const ro = new ResizeObserver(geser);
    for (const el of [document.getElementById("app"), tabbar.current, rail.current?.querySelector(".rail__seg")]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [aktif]);

  return (
    <DemoContext.Provider value={demo}>
      <div className="shell">
        <nav className="rail" id="rail" aria-label="Navigasi utama" ref={rail}>
          {/* eslint-disable-next-line @next/next/no-img-element -- prototype markup, static SVG */}
          <img src="/prototype/assets/logo-icon.svg" alt="Sobat Ambis" width={44} height={44} />
          <div className="rail__seg punya-penanda">
            <Nav aktif={aktif} rail />
          </div>
        </nav>
        <main className="layar" id="layar">
          <div className="layar__isi" id="layarIsi">
            {children}
          </div>
        </main>
        <nav className="tabbar punya-penanda" id="tabbar" aria-label="Navigasi utama" ref={tabbar}>
          <Nav aktif={aktif} />
        </nav>
      </div>
    </DemoContext.Provider>
  );
}
