import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PasangUji } from "./PasangUji";
import "./referensi.css";

/**
 * Renders the prototype's component reference markup (`uji-visual/komponen.html`, the same file the prototype's
 * `_r005-referensi.html` mounts) with the prototype CSS, so screenshots differ only by the CSS/token/font/asset move.
 * Theme comes from `?tema=light|dark`. Shared by /uji-visual and /styleguide.
 */
export function ReferensiKomponen() {
  const html = readFileSync(join(process.cwd(), "src/app/(ata)/uji-visual/komponen.html"), "utf8").replaceAll("{{ASET}}", "/prototype/assets/");
  return (
    <>
      <div id="uji" dangerouslySetInnerHTML={{ __html: html }} />
      <PasangUji />
    </>
  );
}
