import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// R0.05-3: prototype CSS moved verbatim; the only allowed change is url(assets/...) → /prototype/assets/...
const AKAR = "src/styles/prototype";
const semua = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? semua(join(dir, n)) : n.endsWith(".css") ? [join(dir, n)] : []));

describe("prototype CSS move", () => {
  const berkas = semua(AKAR);

  it("every shared and screen stylesheet of the prototype is present", () => {
    for (const f of ["shared/ds.css", "shared/states.css", "shared/fx.css", "shared/folder.css", "shared/lingkungan.css", "shared/maskot.css",
      "shared/tarik.css", "app/app.css", "lomba/lomba.css", "masuk/masuk.css", "tanya/tanya.css", "sidang/sidang.css", "portofolio/portofolio.css"]) {
      expect(existsSync(join(AKAR, f)), f).toBe(true);
    }
  });

  it("no relative asset URL is left, and every referenced public asset exists", () => {
    for (const f of berkas) {
      const css = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); // comments are not CSS
      expect(css, f).not.toMatch(/url\((['"]?)(\.\.\/)?assets\//);
      for (const m of css.matchAll(/url\((['"]?)(\/prototype\/assets\/[^'")]+)\1\)/g)) {
        expect(existsSync(join("public", m[2])), `${f}: ${m[2]}`).toBe(true);
      }
    }
  });

  it("the migrated root layout loads the prototype design system, not the old foundation", () => {
    const layout = readFileSync("src/app/(ata)/layout.tsx", "utf8");
    expect(layout).toMatch(/styles\/prototype\/shared\/ds\.css/);
    expect(layout).not.toMatch(/globals\.css|MeshBackground|DemoBanner/);
  });
});
