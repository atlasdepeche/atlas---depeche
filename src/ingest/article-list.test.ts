import { describe, expect, it } from "vitest";
import { isArticleLink, looksLikeArticleSlug } from "./article-list";

describe("isArticleLink", () => {
  it("matches a slug nested under the listing path", () => {
    expect(isArticleLink("/fr/actualites/mode-de-scrutin", "/fr/actualites")).toBe(true);
  });

  it("matches when the listing path already has a trailing slash", () => {
    expect(isArticleLink("/fr/actualites/mode-de-scrutin", "/fr/actualites/")).toBe(true);
  });

  it("rejects the listing page's own URL", () => {
    expect(isArticleLink("/fr/actualites", "/fr/actualites")).toBe(false);
    expect(isArticleLink("/fr/actualites/", "/fr/actualites")).toBe(false);
  });

  it("rejects an unrelated path", () => {
    expect(isArticleLink("/fr/institutions", "/fr/actualites")).toBe(false);
  });

  it("rejects a path that merely shares a prefix without a separator", () => {
    // "/fr/actualites-archive" starts with "/fr/actualites" as a raw string
    // but is not actually nested under it — must not match.
    expect(isArticleLink("/fr/actualites-archive", "/fr/actualites")).toBe(false);
  });
});

describe("looksLikeArticleSlug", () => {
  it("matches a real maroc.ma article slug", () => {
    expect(
      looksLikeArticleSlug(
        "/fr/actualites/mode-de-scrutin-un-gage-de-la-pleine-expression-des-choix-des-electeurs",
      ),
    ).toBe(true);
  });

  it("matches a real Le360 article slug with a trailing ID", () => {
    expect(
      looksLikeArticleSlug(
        "/politique/legislatives-2026-a-rabat-adib-benbrahim-a-lassaut-de-la-redoutable-circonscription-de-chellah_43RR2OHFXJGSDH3BGUAPNRNSLQ/",
      ),
    ).toBe(true);
  });

  it("rejects a bare category link", () => {
    expect(looksLikeArticleSlug("/politique/")).toBe(false);
    expect(looksLikeArticleSlug("/politique")).toBe(false);
  });

  it("rejects a short non-article nav link", () => {
    expect(looksLikeArticleSlug("/archives/2022/")).toBe(false);
  });
});
