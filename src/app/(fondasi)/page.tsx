import Link from "next/link";
import { isDemoMode } from "@/lib/env";

// Landing placeholder. The real landing + sign-in button (FR-AUTH-01) is built on Day 1.
export default function Home() {
  return (
    <main className="page" style={{ display: "grid", gap: 16, alignContent: "center", minHeight: "100dvh", maxWidth: 560 }}>
      <p className="t-label t-muted">Ata by Sobat Ambis</p>
      <h1>Asisten lombamu.</h1>
      <p className="t-muted">
        Fondasi proyek sudah terpasang. Fitur masuk, onboarding, dan Radar dibangun di tahap berikutnya.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/hari-ini" className="btn btn-primary">
          Lihat kerangka app
        </Link>
        {isDemoMode() ? (
          <Link href="/styleguide" className="btn btn-secondary glass-frost">
            Buka styleguide
          </Link>
        ) : null}
      </div>
    </main>
  );
}
