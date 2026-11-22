// Pro price, ported from the prototype's akun.py harga() (blueprint 16 §5.2). Integer arithmetic only.
// Display only: there is no payment gateway in this release.
export const MONTHLY_PRICE = 69_000;
export const YEARLY_DISCOUNT = 0.1;

export function price() {
  const normal = MONTHLY_PRICE * 12;
  const saved = Math.round(normal * YEARLY_DISCOUNT);
  const yearly = normal - saved;
  return {
    monthly: { amount: MONTHLY_PRICE, days: 30 },
    yearly: {
      amount: yearly,
      days: 365,
      normal,
      saved,
      discountPercent: Math.round(YEARLY_DISCOUNT * 100),
      perMonth: Math.round(yearly / 12),
    },
  };
}

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
