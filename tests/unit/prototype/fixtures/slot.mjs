/* Fixture: an account that holds more active Slots than the Gratis limit allows (K-23).
   The default demo seed has one Slot, so over-limit behaviour is tested from here. */
import { awalBersama } from '@/lib/prototype/shared/logic/bersama.js';

export const SLOT_LEBIH = ['interval-2027', 'cipta-karya-2026'];
export const bersamaLebih = () => ({ ...awalBersama(), slot: [...SLOT_LEBIH] });
