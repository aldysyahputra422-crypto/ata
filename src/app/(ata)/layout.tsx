import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
// Prototype design system, moved verbatim in R0.05-3 (docs: blueprint 15 §1 — the prototype wins over the old DS).
import "@/styles/prototype/shared/ds.css";
import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/shared/fx.css";
import "@/styles/prototype/shared/folder.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = { title: { default: "Ata · asisten lombamu", template: "%s · Ata" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFF8F3" };

/**
 * Root layout for screens migrated from the prototype. Separate from the (fondasi) root layout so the old
 * Tailwind/shadcn foundation (preflight, mesh background, demo banner) does not change the prototype's look.
 * The prototype CSS names its font 'Plus Jakarta Sans'; next/font serves it under a generated family name,
 * so the font tokens are pointed at that name here (the only bridge needed).
 */
export default function AtaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fam = jakarta.style.fontFamily;
  return (
    <html lang="id" style={{ ["--font-display" as string]: fam, ["--font-body" as string]: fam }} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
