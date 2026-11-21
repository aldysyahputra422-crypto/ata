import { notFound } from "next/navigation";
import { ReferensiKomponen } from "../_referensi/ReferensiKomponen";

/** R0.05-3 visual parity page (development only). */
export default function UjiVisual() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ReferensiKomponen />;
}
