"use client";
import { useRef } from "react";

/** E2: pointer-driven 3D tilt + sheen. Inert unless html[data-fx="rich"] and the pointer is a mouse. */
export function Tilt({ children, max = 8 }: { children: React.ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function onMove(e: React.PointerEvent) {
    if (document.documentElement.dataset.fx !== "rich" || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    // If the user forces "rich" while the OS asks for reduced motion, keep the tilt subtle.
    const limit = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? Math.min(max, 3) : max;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - py) * limit * 2}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * limit * 2}deg`);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    });
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} className="tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="tilt__body">{children}</div>
    </div>
  );
}
