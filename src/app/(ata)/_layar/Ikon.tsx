// prototype icon set, moved verbatim in R0.05-1
import { icon } from "@/lib/prototype/shared/ds.js";

/** Same output as the prototype's `<span data-icon>` after mountIcons(). */
export function Ikon({ nama }: { nama: string }) {
  return <span data-icon={nama} dangerouslySetInnerHTML={{ __html: icon(nama) }} />;
}
