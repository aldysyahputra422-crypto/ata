import type { Metadata } from "next";
import { Kenalan } from "./Kenalan";

export const metadata: Metadata = { title: "Kenalan" };

// FR-AUTH-04: onboarding after the first sign-in. Answers are saved to the account, one step at a time.
export default function Page() {
  return (
    <section id="screen" className="view view--onboarding">
      <Kenalan />
    </section>
  );
}
