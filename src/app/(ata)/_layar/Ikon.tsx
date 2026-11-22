// prototype icon set, moved verbatim in R0.05-1
import { icon } from "@/lib/prototype/shared/ds.js";

/** Same output as the prototype's `<span data-icon>` after mountIcons(). */
export function Ikon({ nama, className }: { nama: string; className?: string }) {
  return <span className={className} data-icon={nama} aria-hidden={className ? true : undefined} dangerouslySetInnerHTML={{ __html: icon(nama) }} />;
}
