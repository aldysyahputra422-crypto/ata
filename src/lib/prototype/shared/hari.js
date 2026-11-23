/* "Today" for every screen. Live binding: a tab left open across midnight follows the new day, because
   segarkanHari() runs on every store read and write. Signed out it is the device's local day; signed in the app
   sets the account's time zone (profiles.timezone from the server), so the day changes at the account's midnight. */
import { tanggalDiZona } from './logic/tenggat.js';

let zona = null;
export let HARI_INI = tanggalDiZona(zona);
export function segarkanHari(kini = new Date()) {
  const t = tanggalDiZona(zona, kini);
  if (t === HARI_INI) return false;
  HARI_INI = t;
  return true;
}
/* app only: null returns to the device's day. True when the day changed. */
export function aturZonaHari(z, kini = new Date()) {
  zona = typeof z === 'string' && z ? z : null;
  return segarkanHari(kini);
}
export const hariIniKini = (kini = new Date()) => { segarkanHari(kini); return HARI_INI; };
