import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases, strips accents, and hyphenates a French title", () => {
    expect(slugify("Le Roi reçoit le Ministre à Rabat")).toBe("le-roi-recoit-le-ministre-a-rabat");
  });

  it("collapses punctuation and repeated separators", () => {
    expect(slugify("Botola : Wydad 2-1 Raja !!")).toBe("botola-wydad-2-1-raja");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  - Titre -  ")).toBe("titre");
  });

  it("returns empty string for Arabic text (never guesses a transliteration)", () => {
    expect(slugify("الملك يستقبل الوزير")).toBe("");
  });
});
