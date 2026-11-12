import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_CODES, categoryMeta, mentorTone } from "@/lib/categories";

describe("categories", () => {
  it("maps every code to the tone fixed in DESIGN-SYSTEM 9.2", () => {
    expect(CATEGORIES.business_plan.tone).toBe("mint");
    expect(CATEGORIES.pkm.tone).toBe("lavender");
    expect(CATEGORIES.kti_essay.tone).toBe("lavender");
    expect(CATEGORIES.olympiad.tone).toBe("sky");
    expect(CATEGORIES.hackathon.tone).toBe("sky");
    expect(CATEGORIES.poster.tone).toBe("apricot");
    expect(CATEGORIES.design.tone).toBe("apricot");
    expect(CATEGORIES.photo.tone).toBe("apricot");
    expect(CATEGORIES.creative_writing.tone).toBe("rose");
    expect(CATEGORIES.video.tone).toBe("rose");
    expect(CATEGORIES.speech.tone).toBe("lemon");
    expect(CATEGORIES.other.tone).toBe("lemon");
    expect(Object.keys(CATEGORIES).sort()).toEqual([...CATEGORY_CODES].sort());
  });

  it("falls back to 'other' for unknown or missing codes", () => {
    expect(categoryMeta("debate").code).toBe("other");
    expect(categoryMeta(null).code).toBe("other");
  });

  it("gives each mentor a stable tone", () => {
    expect(mentorTone("mentor-dimas")).toBe(mentorTone("mentor-dimas"));
    expect(["lavender", "apricot", "sky", "rose", "mint"]).toContain(mentorTone("x"));
  });
});
