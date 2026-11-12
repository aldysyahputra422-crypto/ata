"use client";
import { useRef } from "react";

export type SegOption<T extends string> = { value: T; label: string; icon?: React.ReactNode };

/** Pill switch with a tactile knob (ref 4). Max 4 options (5 for the tab variant). */
export function TactileSegmented<T extends string>({
  value,
  onChange,
  options,
  label,
  variant = "text",
  orientation = "horizontal",
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  label: string;
  variant?: "icon" | "text" | "tab";
  orientation?: "horizontal" | "vertical";
  size?: "md" | "sm";
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(i: number, focus: boolean) {
    const k = (i + options.length) % options.length;
    if (options[k].value !== value) {
      onChange(options[k].value);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
    }
    if (focus) refs.current[k]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const fwd = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    if (e.key === fwd) {
      e.preventDefault();
      select(i + 1, true);
    } else if (e.key === back) {
      e.preventDefault();
      select(i - 1, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      select(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      select(options.length - 1, true);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-orientation={orientation}
      className={className ? `seg ${className}` : "seg"}
      data-variant={variant}
      data-orientation={orientation}
      data-size={size}
      style={{ "--n": options.length, "--i": index } as React.CSSProperties}
    >
      <span className="seg__knob" aria-hidden="true">
        <span className="seg__disc" />
      </span>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="seg__item"
          title={variant === "icon" ? o.label : undefined}
          onClick={() => select(i, false)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.icon}
          <span className="seg__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
