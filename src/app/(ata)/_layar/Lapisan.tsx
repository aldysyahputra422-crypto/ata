"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
// prototype sheet spring (drag to dismiss), copied verbatim from shared/sheet.js
import { pasangPegas } from "@/lib/prototype/shared/sheet.js";

function useOverlay() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById("overlay")), []);
  return el;
}

/** Prototype toast (masuk/app.js toast): one at a time, removed after 5.2 s. */
export function Toast({ teks, onSelesai }: { teks: string | null; onSelesai: () => void }) {
  const overlay = useOverlay();
  useEffect(() => {
    if (!teks) return;
    const t = setTimeout(onSelesai, 5200);
    return () => clearTimeout(t);
  }, [teks, onSelesai]);
  if (!overlay || !teks) return null;
  return createPortal(
    <div className="toast" role="status">
      <span>{teks}</span>
    </div>,
    overlay,
  );
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Prototype bottom sheet (masuk/app.js sheet): modal dialog, focus trap, Escape, scrim click, spring drag. */
export function Sheet({ judul, onTutup, children }: { judul: string; onTutup: () => void; children: ReactNode }) {
  const overlay = useOverlay();
  const scrim = useRef<HTMLDivElement>(null);
  const tutup = useRef(onTutup);
  tutup.current = onTutup;

  useEffect(() => {
    const el = scrim.current;
    if (!el) return;
    const before = document.activeElement as HTMLElement | null;
    const shell = document.querySelector<HTMLElement>(".shell");
    if (shell) shell.inert = true;
    const sheet = el.querySelector<HTMLElement>(".sheet");
    if (sheet) pasangPegas(sheet, () => tutup.current());
    el.querySelector<HTMLElement>("h2")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (shell) shell.inert = false;
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, [overlay]);

  if (!overlay) return null;
  return createPortal(
    <div
      className="scrim"
      ref={scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const all = [...e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
          (x) => !(x as HTMLButtonElement).disabled && x.offsetParent !== null,
        );
        if (!all.length) return;
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={judul}>
        <div className="sheet__grip" />
        <h2 tabIndex={-1}>{judul}</h2>
        {children}
      </div>
    </div>,
    overlay,
  );
}
