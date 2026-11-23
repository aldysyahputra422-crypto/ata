/* Deadline countdowns. One rule for every screen: days left = stored deadline DATE minus "today".
   A saved "days left" number is never a source: it is only right on the day it was saved.
   Dates are calendar days 'YYYY-MM-DD' (no clock time), so a difference never depends on DST or on the hour. Pure. */
const HARI = 864e5;
const POLA = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' of a real calendar day (2026-02-30 is refused), otherwise null. */
export function tanggalSah(iso) {
  if (typeof iso !== 'string' || !POLA.test(iso)) return null;
  const t = Date.parse(iso + 'T00:00:00Z');
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === iso ? iso : null;
}

/** Whole days from hariIni to tenggatIso: 0 on the deadline day, negative after it; null when either is not a date. */
export function sisaHari(tenggatIso, hariIni) {
  const a = tanggalSah(tenggatIso), b = tanggalSah(hariIni);
  if (!a || !b) return null;
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / HARI);
}

const lokal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The calendar day at instant `kini` in an IANA zone (the account's); the device's own day without a zone or with an unknown one. */
export function tanggalDiZona(zona, kini = new Date()) {
  if (typeof zona === 'string' && zona) {
    try {
      const b = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(kini).map((p) => [p.type, p.value]));
      const t = tanggalSah(`${b.year}-${b.month}-${b.day}`);
      if (t) return t;
    } catch (e) { /* unknown zone: device day */ }
  }
  return lokal(kini);
}

/** A PERSISTED competition (device card, account row) as screens read it: its countdown comes from its stored date only. */
export function denganSisaHari(lomba, hariIni) {
  const tenggatIso = tanggalSah(lomba?.tenggatIso);
  return { ...lomba, tenggatIso, hariLagi: sisaHari(tenggatIso, hariIni) };
}

/** Deadline date of a competition: its stored date; a bare offset only counts for in-memory seed data, relative to hariIni by design. */
export function tenggatLomba(lomba, hariIni) {
  const iso = tanggalSah(lomba?.tenggatIso);
  if (iso) return iso;
  if (!Number.isFinite(lomba?.hariLagi) || !tanggalSah(hariIni)) return null;
  const d = new Date(hariIni + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + lomba.hariLagi);
  return d.toISOString().slice(0, 10);
}
