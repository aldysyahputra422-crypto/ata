import type { Metadata } from "next";
import { Progres } from "./Progres";

export const metadata: Metadata = { title: "Progres" };

export default function Page() {
  return <Progres />;
}
