import { Check } from "lucide-react";
import { useId } from "react";

/** Slot progress. Never turns red when behind: lateness is said in words next to it. */
export function ProgressRing({ value, label, size = 96 }: { value: number; label: string; size?: number }) {
  const id = useId();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const complete = v >= 100;
  return (
    <figure className="ring" data-complete={complete} style={{ width: size }} role="img" aria-label={`${label}: ${v} persen`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--primary)" }} />
            <stop offset="1" style={{ stopColor: "var(--hero-b)" }} />
          </linearGradient>
        </defs>
        {complete ? <circle className="ring__done" cx="50" cy="50" r="36" /> : null}
        <circle className="ring__track" cx="50" cy="50" r="42" fill="none" strokeWidth="10" />
        <circle
          className="ring__arc"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${v} 100`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <figcaption className="ring__value" aria-hidden="true">
        {complete ? (
          <Check />
        ) : (
          <>
            {v}
            <small>%</small>
          </>
        )}
      </figcaption>
    </figure>
  );
}
