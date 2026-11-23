import type { Metadata, Viewport } from "next";

export const ataMetadata: Metadata = { title: { default: "Ata · asisten lombamu", template: "%s · Ata" } };
export const ataViewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFF8F3" };

type Props = Readonly<{
  /** Class of <body>, e.g. the prototype shell's `badan-aplikasi` (app.html). */
  badan?: string;
  /** The prototype's embed mode (`html[data-embed]`, masuk.html?embed=1). */
  embed?: boolean;
  children: React.ReactNode;
}>;

/**
 * <html> and <body> for one prototype page type. Each route group that mirrors a prototype page (app.html,
 * masuk.html, the component reference) is its own root layout, so the attributes that page type needs are in the
 * server HTML instead of being added by a script before hydration. Moving between root layouts is a full page
 * load, as it is between the prototype's pages.
 * suppressHydrationWarning on <html> covers only data-theme, which the ?tema= override sets before first paint.
 */
export function Dokumen({ badan, embed, children }: Props) {
  return (
    <html lang="id" data-embed={embed ? "1" : undefined} suppressHydrationWarning>
      <body className={badan}>{children}</body>
    </html>
  );
}
