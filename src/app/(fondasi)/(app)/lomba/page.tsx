import type { Metadata } from "next";
import { EmptyState } from "@/components/ds/EmptyState";

export const metadata: Metadata = { title: "Lomba" };

// Shell placeholder: this screen is built in Hari 2 (see docs/STATUS.md).
export default function Page() {
  return (
    <>
      <h1>Lomba</h1>
      <EmptyState pose="santai" title="3 slot masih kosong." text="Slot, Peta Jalan, dan Karya dibangun di Hari 2." />
    </>
  );
}
