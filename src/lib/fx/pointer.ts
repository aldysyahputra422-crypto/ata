// One document-level pointermove listener drives specular highlights (E3),
// layered parallax (E4) and the knob magnet (E7). Throttled with requestAnimationFrame.

function isRich(): boolean {
  return document.documentElement.dataset.fx === "rich";
}

export function attachPointerFx(): () => void {
  let raf = 0;
  let lastEvent: PointerEvent | null = null;
  let lastSeg: HTMLElement | null = null;

  function clearMagnet() {
    if (lastSeg) {
      lastSeg.style.removeProperty("--kx");
      lastSeg.style.removeProperty("--ky");
      lastSeg = null;
    }
  }

  function apply() {
    raf = 0;
    const e = lastEvent;
    if (!e || !isRich() || e.pointerType !== "mouse") return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;

    const spec = target.closest<HTMLElement>("[data-specular]");
    if (spec) {
      const r = spec.getBoundingClientRect();
      spec.style.setProperty("--mx", `${e.clientX - r.left}px`);
      spec.style.setProperty("--my", `${e.clientY - r.top}px`);
    }

    const par = target.closest<HTMLElement>("[data-parallax]");
    if (par) {
      const pxn = (e.clientX / window.innerWidth) * 2 - 1;
      const pyn = (e.clientY / window.innerHeight) * 2 - 1;
      par.style.setProperty("--pxn", pxn.toFixed(3));
      par.style.setProperty("--pyn", pyn.toFixed(3));
    }

    const seg = target.closest<HTMLElement>(".seg");
    if (seg !== lastSeg) clearMagnet();
    if (seg) {
      const knob = seg.querySelector<HTMLElement>(".seg__knob");
      if (knob) {
        const r = knob.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const clamp = (v: number) => Math.max(-3, Math.min(3, v / 14));
        seg.style.setProperty("--kx", `${clamp(dx).toFixed(2)}px`);
        seg.style.setProperty("--ky", `${clamp(dy).toFixed(2)}px`);
        lastSeg = seg;
      }
    }
  }

  function onMove(e: PointerEvent) {
    lastEvent = e;
    if (!raf) raf = requestAnimationFrame(apply);
  }
  function onLeave() {
    clearMagnet();
  }

  document.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    if (raf) cancelAnimationFrame(raf);
    clearMagnet();
  };
}
