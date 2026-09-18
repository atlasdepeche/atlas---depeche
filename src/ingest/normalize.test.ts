import { describe, expect, it } from "vitest";
import { eventFingerprint, normalizeTitle } from "./normalize";

describe("normalizeTitle", () => {
  it("lowercases and strips Latin diacritics", () => {
    expect(normalizeTitle("Le Général Décède à Rabat")).toBe(
      "le general decede a rabat",
    );
  });

  it("collapses punctuation and whitespace", () => {
    expect(normalizeTitle("  Breaking:   Storm hits Casablanca!!  ")).toBe(
      "breaking storm hits casablanca",
    );
  });

  it("keeps Arabic letters intact", () => {
    expect(normalizeTitle("الحكومة تعلن عن قرار جديد")).toBe(
      "الحكومة تعلن عن قرار جديد",
    );
  });

  it("is stable for equivalent inputs with different casing/spacing", () => {
    const a = normalizeTitle("Rabat: New Minister Appointed");
    const b = normalizeTitle("  RABAT new minister appointed  ");
    expect(a).toBe(b);
  });
});

describe("eventFingerprint", () => {
  it("is identical for the same category+title regardless of formatting", () => {
    const a = eventFingerprint({ category: "politics", title: "Rabat: New Minister Appointed" });
    const b = eventFingerprint({ category: "politics", title: "rabat new minister appointed" });
    expect(a).toBe(b);
  });

  it("differs across categories for the same title", () => {
    const a = eventFingerprint({ category: "politics", title: "Weather update" });
    const b = eventFingerprint({ category: "weather", title: "Weather update" });
    expect(a).not.toBe(b);
  });

  it("differs for meaningfully different titles", () => {
    const a = eventFingerprint({ category: "sports", title: "Raja wins 2-0" });
    const b = eventFingerprint({ category: "sports", title: "Wydad wins 3-1" });
    expect(a).not.toBe(b);
  });
});
