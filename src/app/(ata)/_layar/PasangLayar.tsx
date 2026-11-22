"use client";

import { useEffect } from "react";
// prototype environment (sunset photo, glass lens filter), copied verbatim from shared/lingkungan.js
import { pasangLingkungan } from "@/lib/prototype/shared/lingkungan.js";

const BREATH_PERIOD = 26;

/** Client-side steps the prototype does on load: environment phase + lens filter, then data-siap once fonts are in. */
export function PasangLayar() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".app > .lingkungan");
    el?.style.setProperty("--fase", `-${((Date.now() / 1000) % BREATH_PERIOD).toFixed(2)}s`);
    pasangLingkungan();
    document.fonts.ready.then(() => {
      document.body.dataset.siap = "1";
    });
    return () => {
      delete document.documentElement.dataset.embed;
    };
  }, []);
  return null;
}
