import type { Metadata } from "next";
import { Masuk } from "./Masuk";

export const metadata: Metadata = { title: "Masuk" };

// FR-AUTH-01. A failed Google sign-in lands here as /?galat=oauth (our callback) or /?error=… (Supabase Auth).
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { error, galat } = await searchParams;
  return (
    <section id="screen" className="view view--masuk">
      <Masuk galatOAuth={!!error || !!galat} />
    </section>
  );
}
