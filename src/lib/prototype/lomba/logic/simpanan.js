/* Make a saved demo state safe to use: unknown versions start fresh, missing fields come from the fresh state,
   and ids the demo no longer knows are dropped. Pure; the caller supplies the fresh state and an id check. */
export function rapikan(saved, awal, ada) {
  if (!saved || typeof saved !== 'object' || saved.v !== awal.v || !saved.deck || typeof saved.deck !== 'object') return awal;
  const s = { ...awal, ...saved, deck: { ...awal.deck, ...saved.deck } };
  for (const k of ['antrean', 'tersimpan', 'dilewati', 'slot']) s.deck[k] = (Array.isArray(s.deck[k]) ? s.deck[k] : []).filter(ada);
  s.deck.riwayat = (Array.isArray(s.deck.riwayat) ? s.deck.riwayat : []).filter((r) => r && ada(r.id));
  if (!Array.isArray(s.unggahan)) s.unggahan = [];
  if (!ada(s.dipilih)) s.dipilih = awal.dipilih;
  return s;
}
