// same order as app.html
import "@/styles/prototype/shared/lingkungan.css";
import "@/styles/prototype/shared/fx.css";
import "@/styles/prototype/shared/folder.css";
import "@/styles/prototype/app/app.css";
import "@/styles/prototype/shared/maskot.css";
import { isDemoMode } from "@/lib/env";
import { Cangkang } from "./Cangkang";

// Runs before first paint: the prototype shell's body class and its ?tema=gelap|terang override (app/app.js).
const BOOT =
  "var d=document.documentElement.dataset,t=new URLSearchParams(location.search).get('tema');" +
  "document.body.classList.add('badan-aplikasi');" +
  "if(t==='gelap')d.theme='dark';else if(t==='terang')d.theme='light';";

/** App shell for migrated tab screens: the same DOM as the prototype's app.html, so its CSS applies unchanged. */
export default function AplLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="app" id="app" data-glass="penuh">
        <Cangkang demo={isDemoMode()}>{children}</Cangkang>
        <div id="overlay" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
    </>
  );
}
