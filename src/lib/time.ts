// Indonesian time zones (PRD 5.2: province decides the zone; all cron times are stored in UTC).
export type IndonesiaZone = "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";

export const ZONE_LABEL: Record<IndonesiaZone, "WIB" | "WITA" | "WIT"> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

export const DEFAULT_ZONE: IndonesiaZone = "Asia/Jakarta";
