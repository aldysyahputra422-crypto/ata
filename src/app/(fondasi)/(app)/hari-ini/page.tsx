import type { Metadata } from "next";
import { EmptyState } from "@/components/ds/EmptyState";

export const metadata: Metadata = { title: "Hari Ini" };

// Shell placeholder: this screen is built in Hari 1–3 (see docs/STATUS.md).
export default function Page() {
  return (
    <>
      <h1>Hari Ini</h1>
      <EmptyState pose="tidur" title="Hari ini belum ada yang cocok." text="Radar dan daftar tugas harian belum dibangun. Layar ini baru kerangkanya." />
    </>
  );
}
