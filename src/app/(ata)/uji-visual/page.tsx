import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { PasangUji } from "./PasangUji";
import "./uji-visual.css";

/**
 * R0.05-3 visual parity page (development only). Renders the SAME markup file as the prototype reference page
 * (`_r005-referensi.html` in the prototype repo), so screenshot differences come only from the CSS/token/font/asset move.
 */
export default function UjiVisual() {
  if (process.env.NODE_ENV === "production") notFound();
  const html = readFileSync(join(process.cwd(), "src/app/(ata)/uji-visual/komponen.html"), "utf8").replaceAll("{{ASET}}", "/prototype/assets/");
  return (
    <>
      <div id="uji" dangerouslySetInnerHTML={{ __html: html }} />
      <PasangUji />
    </>
  );
}
