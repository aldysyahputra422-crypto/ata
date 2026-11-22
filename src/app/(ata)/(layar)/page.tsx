import type { Metadata } from "next";
import { Masuk } from "./Masuk";

export const metadata: Metadata = { title: "Masuk" };

// FR-AUTH-01. A failed Google sign-in lands here as /?error=… (see api/v1/auth/google/callback).
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await searchParams;
  return (
    <section id="screen" className="view view--masuk">
      <Masuk galatOAuth={!!error} />
    </section>
  );
}
