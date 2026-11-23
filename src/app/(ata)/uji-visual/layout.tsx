// Root layout of the visual parity page: the prototype design system and font only (uji-visual/komponen.html).
import "@/styles/prototype/shared/ds.css";
import "../fonts.css";
import { ataMetadata, ataViewport, Dokumen } from "../_layar/Dokumen";

export const metadata = ataMetadata;
export const viewport = ataViewport;

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <Dokumen>{children}</Dokumen>;
}
