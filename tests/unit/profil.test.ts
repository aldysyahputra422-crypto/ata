import { describe, expect, it } from "vitest";
import { dariProfil, jamKeOpsi, langkahAwal, keIsian, periksa, periksaIsian, selisih, ubahLangkah } from "@/app/(ata)/_layar/profil";
import { tahunLahirMaks, type Profil } from "@/app/(ata)/_layar/akun";
import { permissionInput, profileInput, publicPermissions, publicProfile } from "@/lib/account/profile";
import { LANGKAH } from "@/lib/prototype/masuk/data/onboarding.js";

const profil: Profil = {
  display_name: "Raka", jenjang: "SMA/SMK", birth_date: "2009-04-17", birth_year: 2009, institution: null, major: null, timezone: null,
  interests: ["KTI"], targets: [], skills: ["Menulis"], goals_text: null, weekly_hours: 6, onboarding_done: true, updated_at: "2026-11-23T00:00:00Z",
};
const langkah = (kunci: string) => (LANGKAH as { kunci: string }[]).find((l) => l.kunci === kunci) as never;

describe("profile input (FR-AUTH-04)", () => {
  it("accepts a partial patch and trims text", () => {
    expect(profileInput.parse({ display_name: "  Raka ", interests: ["KTI"] })).toEqual({ display_name: "Raka", interests: ["KTI"] });
  });
  it.each([
    {}, { display_name: "R" }, { jenjang: "S3" }, { birth_year: 2009 }, { birth_date: "1900-01-01" }, { birth_date: `${tahunLahirMaks() + 1}-01-01` }, { birth_date: "2009-02-30" }, { birth_date: "2009" }, { birth_date: null }, { weekly_hours: 81 },
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
    expect(d).toMatchObject({ nama: "Raka", tahunLahir: "2009-04-17", jam: "5–7 jam" });
    expect(ubahLangkah("jam", d)).toEqual({ weekly_hours: 6 });
    expect(ubahLangkah("sekolah", { ...d, sekolah: "  " })).toEqual({ institution: null });
    expect(jamKeOpsi(null)).toBe("");
    expect(jamKeOpsi(20)).toBe("Lebih dari 10 jam");
  });
  it("keeps exact saved hours when the range is left unchanged", () => {
    const d = dariProfil({ ...profil, weekly_hours: 20 });
    expect(ubahLangkah("jam", d, 20)).toEqual({ weekly_hours: 20 });
    expect(ubahLangkah("jam", { ...d, jam: "5–7 jam" }, 20)).toEqual({ weekly_hours: 6 });
    expect(ubahLangkah("jam", { ...d, jam: "" }, 20)).toEqual({ weekly_hours: null });
  });
  it("resumes at the first missing required answer, then the first empty optional step", () => {
    const d = dariProfil(profil);
    expect(langkahAwal({ ...d, jenjang: "" })).toBe(1);
    expect(langkahAwal(d)).toBe(3); // school is empty
    expect(langkahAwal({ ...d, sekolah: "SMAN 3" })).toBe(5); // interests answered, targets empty
    expect(langkahAwal({ ...d, sekolah: "SMAN 3", target: ["Juara"] })).toBe(6);
  });
  it("validates required steps; the birth date is a full date in the server range", () => {
    const d = dariProfil(profil);
    expect(periksa(langkah("nama"), { ...d, nama: "R" })).toMatch(/minimal dua/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: `${tahunLahirMaks()}-12-31` })).toBeNull();
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: `${tahunLahirMaks() + 1}-01-01` })).toMatch(/tanggal lahir lengkap/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: "2009-02-30" })).toMatch(/tanggal lahir lengkap/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: "2009" })).toMatch(/tanggal lahir lengkap/);
    expect(periksa(langkah("tahunLahir"), { ...d, tahunLahir: "" })).toMatch(/tanggal lahir lengkap/);
    expect(ubahLangkah("tahunLahir", { ...d, tahunLahir: "2009-04-18" })).toEqual({ birth_date: "2009-04-18" });
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
    expect(periksaIsian({ ...f, birth_date: "1900-01-01" })?.bidang).toBe("birth_date");
    expect(periksaIsian({ ...f, birth_date: "" })?.bidang).toBe("birth_date");
    // an account that only ever gave a year can save its other fields; a date it types is still checked
    expect(periksaIsian({ ...f, birth_date: "" }, { birth_date: null } as never)).toBeNull();
    expect(periksaIsian({ ...f, birth_date: "1900-01-01" }, { birth_date: null } as never)?.bidang).toBe("birth_date");
    expect(selisih(profil, { ...f, birth_date: "2009-04-18" })).toEqual({ birth_date: "2009-04-18" });
    // an account that only has a year sends nothing until the date is filled in
    expect(selisih({ ...profil, birth_date: null }, keIsian({ ...profil, birth_date: null }))).toEqual({});
    expect(periksaIsian({ ...f, weekly_hours: "99" })?.bidang).toBe("weekly_hours");
  });
});
