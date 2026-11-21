import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { ReferensiKomponen } from "../_referensi/ReferensiKomponen";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Design review page (docs/DESIGN-SYSTEM.md): the prototype component reference. Exists only in demo builds. */
export default function Styleguide() {
  if (!isDemoMode()) notFound();
  return <ReferensiKomponen />;
}
