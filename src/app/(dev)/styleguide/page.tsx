import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { Styleguide } from "./Styleguide";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false } };
export const dynamic = "force-dynamic";

// DESIGN-SYSTEM 11.4: visual review page. Exists only in demo builds.
export default async function Page({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  if (!isDemoMode()) notFound();
  const { embed } = await searchParams;
  return <Styleguide embed={embed === "1"} />;
}
