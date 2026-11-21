import type { Metadata } from "next";
import { EmptyState } from "@/components/ds/EmptyState";

export const metadata: Metadata = { title: "Profil" };

// Shell placeholder: this screen is built in Hari 1 (see docs/STATUS.md).
export default function Page() {
  return (
    <>
      <h1>Profil</h1>
      <EmptyState pose="santai" title="Profil belum diisi." text="Ambition Profile dan pengaturan dibangun di Hari 1." />
    </>
  );
}
