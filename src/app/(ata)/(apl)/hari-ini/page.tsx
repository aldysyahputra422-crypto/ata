import type { Metadata } from "next";
import { HariIni } from "./HariIni";

export const metadata: Metadata = { title: "Hari Ini" };

export default function Page() {
  return <HariIni />;
}
