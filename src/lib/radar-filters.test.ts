import { describe, expect, it } from "vitest";
import { dedupeRadarItems, isLikelyHomepageTitle, isMoroccoRelevant } from "./radar-filters";

describe("isLikelyHomepageTitle", () => {
  it("flags a title that is just the outlet's own masthead", () => {
    expect(isLikelyHomepageTitle("Le360 - Le média des actualités du Maroc", "Le360")).toBe(true);
  });

  it("flags an 'Accueil' homepage title", () => {
    expect(isLikelyHomepageTitle("Accueil | SNRT", "SNRT (Al Aoula group)")).toBe(true);
  });

  it("flags the Arabic homepage marker", () => {
    expect(isLikelyHomepageTitle("الرئيسية - سنرت", "SNRT (Al Aoula group)")).toBe(true);
  });

  it("does not flag a real headline", () => {
    expect(
      isLikelyHomepageTitle(
        "Transport routier : nouvelle tranche de soutien exceptionnel aux professionnels",
        "Aujourd'hui le Maroc",
      ),
    ).toBe(false);
  });

  // Found live 2026-09-19: a plain substring match on "accueil" also caught
  // real headlines using the French verb "accueillir" — these must not be
  // filtered.
  it("does not flag a real headline using the verb 'accueillir'", () => {
    expect(
      isLikelyHomepageTitle(
        "Sahara: la MINURSO accueille son nouveau commandant le Pakistanais Jawwad Ahmed",
        "Hespress Français",
      ),
    ).toBe(false);
    expect(
      isLikelyHomepageTitle(
        "Marhaba 2026 : Plus de 4,1 millions de MRE accueillis",
        "Maroc.ma (portail officiel, FR)",
      ),
    ).toBe(false);
  });
});

describe("isMoroccoRelevant", () => {
  // The real item that triggered this filter, live 2026-09-19.
  it("rejects an unrelated international wire story", () => {
    expect(
      isMoroccoRelevant(
        "L'armée yéménite reprend des positions aux Houthis à l'ouest de la ville de Taëz",
        null,
      ),
    ).toBe(false);
  });

  it("accepts a domestic Moroccan story", () => {
    expect(
      isMoroccoRelevant(
        "Transport routier : nouvelle tranche de soutien exceptionnel aux professionnels",
        "Le gouvernement marocain a annoncé...",
      ),
    ).toBe(true);
  });

  it("accepts a story naming only a Moroccan city, no explicit 'Maroc'", () => {
    expect(isMoroccoRelevant("Agadir : ouverture du nouveau port de pêche", null)).toBe(true);
  });

  it("accepts an Arabic headline", () => {
    expect(isMoroccoRelevant("المغرب يسجل نموا اقتصاديا قويا هذا العام", null)).toBe(true);
  });

  it("accepts a story about a Moroccan abroad", () => {
    expect(
      isMoroccoRelevant("USA : le boxeur marocain remporte le titre mondial à Las Vegas", null),
    ).toBe(true);
  });

  it("rejects a story with no Moroccan signal at all", () => {
    expect(
      isMoroccoRelevant("Turquie : 20 suspects interpellés dans des enquêtes sur la drogue", null),
    ).toBe(false);
  });
});

describe("dedupeRadarItems", () => {
  // The real case found live 2026-09-19: Hespress cross-posts the same
  // sport article into both its general FR feed and its Sport FR feed.
  it("drops a same-URL duplicate from a second source, keeping the first (newer) one", () => {
    const items = [
      { id: "1", url: "https://fr.hespress.com/488923-...html", title: "Zidane dévoile sa liste" },
      { id: "2", url: "https://fr.hespress.com/488923-...html", title: "Zidane dévoile sa liste" },
      { id: "3", url: "https://example.com/other", title: "Une autre histoire" },
    ];
    expect(dedupeRadarItems(items)).toEqual([items[0], items[2]]);
  });

  it("drops a same-title duplicate even when the URL differs", () => {
    const items = [
      { id: "1", url: "https://a.example.com/x", title: "Le Maroc annonce une réforme" },
      { id: "2", url: "https://b.example.com/y", title: "Le Maroc annonce une réforme" },
    ];
    expect(dedupeRadarItems(items)).toEqual([items[0]]);
  });

  it("keeps genuinely distinct items", () => {
    const items = [
      { id: "1", url: "https://a.example.com/x", title: "Titre A" },
      { id: "2", url: "https://b.example.com/y", title: "Titre B" },
    ];
    expect(dedupeRadarItems(items)).toEqual(items);
  });
});
