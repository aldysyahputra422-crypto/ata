import type { Metadata } from "next";
import { EmptyState } from "@/components/ds/EmptyState";

export const metadata: Metadata = { title: "Progres" };

// Shell placeholder: this screen is built in Hari 2 (see docs/STATUS.md).
export default function Page() {
  return (
    <>
      <h1>Progres</h1>
      <EmptyState pose="santai" title="Belum ada progres untuk ditampilkan." text="Cincin, linimasa, dan heatmap dibangun di Hari 2." />
    </>
  );
}
