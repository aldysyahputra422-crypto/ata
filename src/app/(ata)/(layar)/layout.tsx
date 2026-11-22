import "@/styles/prototype/shared/lingkungan.css";
import "@/styles/prototype/masuk/masuk.css";
import "@/styles/prototype/shared/embed.css";
import { isDemoMode } from "@/lib/env";
import { PasangLayar } from "../_layar/PasangLayar";

// Runs before first paint: the prototype's embed mode (no prototype chrome), its ?tema=gelap|terang override,
// and mountDeviceFrame's width rule (desktop frame from 1000 px).
const BOOT =
  "var d=document.documentElement.dataset,t=new URLSearchParams(location.search).get('tema');d.embed='1';" +
  "if(t==='gelap')d.theme='dark';else if(t==='terang')d.theme='light';" +
  "document.querySelector('.device').dataset.device=innerWidth>=1000?'desktop':'phone';";

/**
 * Screen frame for migrated prototype screens: the same DOM the prototype pages have in embed mode
 * (masuk.html?embed=1), so the prototype CSS applies unchanged. The rail and tab bar are hidden in that mode;
 * app navigation arrives with the shell when Hari Ini migrates.
 */
export default function LayarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
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
    </>
  );
}
