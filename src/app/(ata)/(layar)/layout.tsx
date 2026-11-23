// Prototype design system first (blueprint 15 §1), then the sheets in the order of masuk.html's <link> tags.
import "@/styles/prototype/shared/ds.css";
import "../fonts.css";
import "@/styles/prototype/shared/lingkungan.css";
import "@/styles/prototype/shared/fx.css";
import "@/styles/prototype/shared/states.css";
import "@/styles/prototype/masuk/masuk.css";
import "@/styles/prototype/shared/embed.css";
import { isDemoMode } from "@/lib/env";
import { ataMetadata, ataViewport, Dokumen } from "../_layar/Dokumen";
import { PasangLayar } from "../_layar/PasangLayar";

export const metadata = ataMetadata;
export const viewport = ataViewport;

// Runs before first paint: the prototype's ?tema=gelap|terang override and mountDeviceFrame's width rule
// (desktop frame from 1000 px). Embed mode (no prototype chrome) is in the server HTML.
const BOOT =
  "var d=document.documentElement.dataset,t=new URLSearchParams(location.search).get('tema');" +
  "if(t==='gelap')d.theme='dark';else if(t==='terang')d.theme='light';" +
  "document.querySelector('.device').dataset.device=innerWidth>=1000?'desktop':'phone';";

/**
 * Root layout and screen frame for migrated prototype screens: the same DOM the prototype pages have in embed mode
 * (masuk.html?embed=1), so the prototype CSS applies unchanged. The rail and tab bar are hidden in that mode;
 * app navigation arrives with the shell when Hari Ini migrates.
 */
export default function LayarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Dokumen embed>
      <div className="proto">
        <div className="stage">
          <div className="device" data-device="phone" suppressHydrationWarning>
            <div className="app" id="app" data-glass="penuh">
              <div className="lingkungan" aria-hidden="true" suppressHydrationWarning>
                <div className="lingkungan__foto" />
                <div className="lingkungan__cahaya" />
                <div className="lingkungan__tirai" />
              </div>
              <div className="shell">
                <main className="views" id="views">
                  {isDemoMode() ? <div className="demo-banner">Versi Demo, data contoh</div> : null}
                  {children}
                </main>
              </div>
              <div id="overlay" />
            </div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      <PasangLayar />
    </Dokumen>
  );
}
