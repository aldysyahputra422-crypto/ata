"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeNavIndex, NAV_ITEMS } from "@/lib/nav";
import { navIcon } from "./nav-icons";

/** Vertical glass rail for >= 1024 px. Same knob as the tab bar, one signature across the app. */
export function NavRail() {
  const index = activeNavIndex(usePathname());
  return (
    <aside className="navrail">
      <Link href="/hari-ini" className="navrail__brand font-display" aria-label="Ata, ke Hari Ini">
        Ata
      </Link>
      <nav className="navrail__glass glass-thin" aria-label="Navigasi utama" data-specular data-refract>
        <div
          className="seg"
          data-variant="icon"
          data-orientation="vertical"
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
              title={item.label}
              aria-current={i === index ? "page" : undefined}
              data-active={i === index}
            >
              {navIcon(item.icon)}
              <span className="seg__label">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
