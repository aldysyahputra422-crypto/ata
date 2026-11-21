import type { Metadata } from "next";
import { EmptyState } from "@/components/ds/EmptyState";

export const metadata: Metadata = { title: "Tanya Ata" };

// Shell placeholder: this screen is built in Hari 3 (see docs/STATUS.md).
export default function Page() {
  return (
    <>
      <h1>Tanya Ata</h1>
      <EmptyState pose="mikir" title="Belum terhubung ke AI." text="Chat, Resep, dan Ingatan dibangun di Hari 3." />
    </>
  );
}
