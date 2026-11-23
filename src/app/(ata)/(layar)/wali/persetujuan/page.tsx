import type { Metadata } from "next";
import { Wali } from "./Wali";

export const metadata: Metadata = { title: "Persetujuan orang tua/wali", robots: { index: false, follow: false }, referrer: "no-referrer" };

// FR-AUTH-07: the page a guardian opens from the link in their inbox. No account; the link's token is the credential.
export default function Page() {
  return (
    <section id="screen" className="view view--onboarding">
      <Wali />
    </section>
  );
}
