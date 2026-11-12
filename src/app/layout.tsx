import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { DemoBanner } from "@/components/ds/DemoBanner";
import { FxProvider } from "@/components/ds/FxProvider";
import { MeshBackground } from "@/components/ds/MeshBackground";
import { RefractDefs } from "@/components/ds/RefractDefs";
import { Toaster } from "@/components/ds/Toaster";
import { BOOT_SCRIPT } from "@/lib/fx/prefs";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Ata — Asisten lombamu", template: "%s · Ata" },
  description:
    "Ata itu temen strategi lombamu. Nemuin lomba yang pas, nyusun rencananya, dan nemenin sampai submit, pakai AI yang kamu pilih sendiri.",
  applicationName: "Ata",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0D1F" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The data-* attributes are written by BOOT_SCRIPT before first paint, hence suppressHydrationWarning.
    <html lang="id" data-theme="light" data-glass="full" data-fx="minimal" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className={`${display.variable} ${body.variable}`}>
        <MeshBackground />
        <RefractDefs />
        <FxProvider>
          <DemoBanner />
          {children}
        </FxProvider>
        <Toaster />
      </body>
    </html>
  );
}
