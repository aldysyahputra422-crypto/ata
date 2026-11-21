"use client";

import { useEffect } from "react";
// prototype icon helper, moved verbatim in R0.05-1
import { mountIcons } from "@/lib/prototype/shared/ds.js";

/** Same steps as the prototype reference page: theme from ?tema=, icons mounted, fonts awaited, then data-siap. */
export function PasangUji() {
  useEffect(() => {
    const tema = new URLSearchParams(location.search).get("tema") || "light";
    document.documentElement.dataset.theme = tema;
    const el = document.getElementById("uji");
    if (el) mountIcons(el);
    document.fonts.ready.then(() => {
      document.body.dataset.siap = "1";
    });
  }, []);
  return null;
}
