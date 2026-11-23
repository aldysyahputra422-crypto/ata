import { describe, expect, it } from "vitest";
import { dariProfil, jamKeOpsi, keIsian, periksa, periksaIsian, selisih, ubahLangkah } from "@/app/(ata)/_layar/profil";
import { tahunLahirMaks, type Profil } from "@/app/(ata)/_layar/akun";
import { permissionInput, profileInput, publicPermissions, publicProfile } from "@/lib/account/profile";
import { LANGKAH } from "@/lib/prototype/masuk/data/onboarding.js";

const profil: Profil = {
  display_name: "Raka", jenjang: "SMA/SMK", birth_year: 2009, institution: null, major: null, timezone: null,
  interests: ["KTI"], targets: [], skills: ["Menulis"], goals_text: null, weekly_hours: 6, onboarding_done: true, updated_at: "2026-11-23T00:00:00Z",
};
const langkah = (kunci: string) => (LANGKAH as { kunci: string }[]).find((l) => l.kunci === kunci) as never;

describe("profile input (FR-AUTH-04)", () => {
  it("accepts a partial patch and trims text", () => {
    expect(profileInput.parse({ display_name: "  Raka ", interests: ["KTI"] })).toEqual({ display_name: "Raka", interests: ["KTI"] });
  });
  it.each([
    {}, { display_name: "R" }, { jenjang: "S3" }, { birth_year: 1900 }, { birth_year: tahunLahirMaks() + 1 }, { weekly_hours: 81 },
    { interests: ["a", "b", "c", "d", "e", "f"] }, { onboarding_done: true }, { user_id: "x" }, { skills: [""] },
  ])("rejects %j", (value) => {
    expect(profileInput.safeParse(value).success).toBe(false);
  });
  it("returns only documented fields", () => {
    expect(publicProfile({ ...profil, user_id: "u1", fee_max_idr: 5 })).toEqual(profil);
  });
  it("treats anything but true as off", () => {
    const izin = publicPermissions({ profil: true, tugas: "true", lain: true });
    expect(izin.profil).toBe(true);
    expect(izin.tugas).toBe(false);
    expect(Object.keys(izin)).toHaveLength(8);
    expect(permissionInput.safeParse({ category: "lain", allowed: true }).success).toBe(false);
  });
});

describe("onboarding steps", () => {
  it("maps answers to profile fields and back", () => {
    const d = dariProfil(profil);
    expect(d).toMatchObject({ nama: "Raka", tahunLahir: 2009, jam: "5–7 jam" });
    expect(ubahLangkah("jam", d)).toEqual({ weekly_hours: 6 });
    expect(ubahLangkah("sekolah", { ...d, sekolah: "  " })).toEqual({ institution: null });
    expect(jamKeOpsi(null)).toBe("");
    expect(jamKeOpsi(20)).toBe("Lebih dari 10 jam");
  });
  it("validates required steps; the birth year follows the server range", () => {
    const d = dariProfil(profil);
    expect(periksa(langkah("nama"), { ...d, nama: "R" })).toMatch(/minimal dua/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: tahunLahirMaks() })).toBeNull();
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: tahunLahirMaks() + 1 })).toMatch(/Tahun lahir/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: "" })).toMatch(/Tahun lahir/);
  });
});

describe("profile form", () => {
  it("sends only changed fields", () => {
    const f = keIsian(profil);
    expect(selisih(profil, f)).toEqual({});
    expect(selisih(profil, { ...f, major: " Statistika ", skills: "Menulis, Riset, Riset", weekly_hours: "" }))
      .toEqual({ major: "Statistika", skills: ["Menulis", "Riset"], weekly_hours: null });
    expect(selisih(profil, { ...f, timezone: "Asia/Makassar" })).toEqual({ timezone: "Asia/Makassar" });
  });
  it("checks the form before sending", () => {
    const f = keIsian(profil);
    expect(periksaIsian(f)).toBeNull();
    expect(periksaIsian({ ...f, display_name: "" })?.bidang).toBe("display_name");
    expect(periksaIsian({ ...f, birth_year: "1900" })?.bidang).toBe("birth_year");
    expect(periksaIsian({ ...f, weekly_hours: "99" })?.bidang).toBe("weekly_hours");
  });
});
