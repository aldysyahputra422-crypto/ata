// docs/DESIGN-SYSTEM.md 6.9: lowers effects automatically when frames drop below ~30 fps.
export function startFxGovernor(onDegrade: () => void, durationMs = 10_000): () => void {
  let last = performance.now();
  const t0 = last;
  let winStart = last;
  let frames = 0;
  let slow = 0;
  let stopped = false;

  function tick(now: number) {
    if (stopped) return;
    const dt = now - last;
    last = now;
    if (dt < 1000) {
      // ignore gaps while the tab is hidden
      frames++;
      if (dt > 34) slow++;
    }
    if (now - winStart >= 2000) {
      if (frames > 20 && slow / frames > 0.25) {
        stopped = true;
        onDegrade();
        return;
      }
      winStart = now;
      frames = 0;
      slow = 0;
    }
    if (now - t0 < durationMs) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return () => {
    stopped = true;
  };
}
