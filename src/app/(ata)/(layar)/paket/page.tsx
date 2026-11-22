import type { Metadata } from "next";
import { price } from "@/lib/billing/price";
import { Paket } from "./Paket";

export const metadata: Metadata = { title: "Paket" };

export default function Page() {
  return (
    <section id="screen" className="view view--paket">
      <Paket harga={price()} />
    </section>
  );
}
