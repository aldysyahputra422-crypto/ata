import type { Metadata, Viewport } from "next";
// Prototype design system, moved verbatim in R0.05-3 (docs: blueprint 15 §1 — the prototype wins over the old DS).
import "@/styles/prototype/shared/ds.css";
import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/shared/fx.css";
import "@/styles/prototype/shared/folder.css";
import "./fonts.css";

export const metadata: Metadata = { title: { default: "Ata · asisten lombamu", template: "%s · Ata" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFF8F3" };

/**
 * Root layout for screens migrated from the prototype. Separate from the (fondasi) root layout so the old
 * Tailwind/shadcn foundation (preflight, mesh background, demo banner) does not change the prototype's look.
 * The prototype CSS names its font 'Plus Jakarta Sans'; ./fonts.css self-hosts the same font files the prototype
 * loads from Google Fonts under that exact family name, so the font tokens need no bridge.
 */
export default function AtaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
