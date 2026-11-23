// Prototype design system first (blueprint 15 §1), then the sheets in the order of app.html's <link> tags:
// rules of equal specificity (e.g. .tab-penanda in lingkungan.css and fx.css) depend on it.
import "@/styles/prototype/shared/ds.css";
import "../fonts.css";
import "@/styles/prototype/shared/lingkungan.css";
import "@/styles/prototype/shared/fx.css";
import "@/styles/prototype/shared/folder.css";
import "@/styles/prototype/app/app.css";
import "@/styles/prototype/shared/maskot.css";
import { isDemoMode } from "@/lib/env";
import { ataMetadata, ataViewport, Dokumen } from "../_layar/Dokumen";
import { Cangkang } from "./Cangkang";

export const metadata = ataMetadata;
export const viewport = ataViewport;

// Runs before first paint: the prototype's ?tema=gelap|terang override (app/app.js).
const BOOT =
  "var d=document.documentElement.dataset,t=new URLSearchParams(location.search).get('tema');" +
  "if(t==='gelap')d.theme='dark';else if(t==='terang')d.theme='light';";

/**
 * Root layout and app shell for migrated tab screens: the same DOM as the prototype's app.html, body class
 * included, so its CSS applies unchanged.
 */
export default function AplLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Dokumen badan="badan-aplikasi">
      <div className="app" id="app" data-glass="penuh">
        <Cangkang demo={isDemoMode()}>{children}</Cangkang>
        <div id="overlay" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
    </Dokumen>
  );
}
