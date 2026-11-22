import { describe, expect, it } from "vitest";
import { price, rupiah } from "@/lib/billing/price";

// Ported with the prototype's akun.py harga() (blueprint 16 §5.2).
describe("price", () => {
  it("derives the yearly price from the monthly one, in whole rupiah", () => {
    expect(price()).toEqual({
      monthly: { amount: 69_000, days: 30 },
      yearly: { amount: 745_200, days: 365, normal: 828_000, saved: 82_800, discountPercent: 10, perMonth: 62_100 },
    });
  });

  it("formats rupiah the Indonesian way", () => {
    expect(rupiah(745_200)).toBe("Rp745.200");
  });
});
