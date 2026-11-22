import type { Metadata } from "next";
import { Lomba } from "./Lomba";

export const metadata: Metadata = { title: "Lomba" };

export default function Page() {
  return <Lomba />;
}
