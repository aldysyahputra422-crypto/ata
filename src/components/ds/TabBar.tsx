"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavIndex, NAV_ITEMS } from "@/lib/nav";
import { navIcon } from "./nav-icons";

/** Floating glass tab bar for < 1024 px. Route-driven (not state): each tab is a link. */
export function TabBar() {
  const index = activeNavIndex(usePathname());
  return (
    <nav className="tabbar glass-thin" aria-label="Navigasi utama" data-specular>
      <div
        className="seg"
        data-variant="tab"
        data-orientation="horizontal"
        style={{ "--n": NAV_ITEMS.length, "--i": Math.max(0, index), border: 0, boxShadow: "none", background: "transparent" } as React.CSSProperties}
      >
        <span className="seg__knob" aria-hidden="true" hidden={index < 0}>
          <span className="seg__disc" />
        </span>
        {NAV_ITEMS.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className="seg__item"
            aria-current={i === index ? "page" : undefined}
            data-active={i === index}
            onClick={() => {
              if (i !== index && "vibrate" in navigator) navigator.vibrate(8);
            }}
          >
            {navIcon(item.icon)}
            <span className="seg__label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
