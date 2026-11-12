import { FlaskRound } from "lucide-react";
import { isDemoMode } from "@/lib/env";

/** DEMO-01: thin banner across the whole app. Renders nothing unless DEMO_MODE=true. */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  return (
    <div className="demo-banner" role="note">
      <FlaskRound aria-hidden="true" />
      Versi Demo — data contoh
    </div>
  );
}
