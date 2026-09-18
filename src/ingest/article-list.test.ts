import { describe, expect, it } from "vitest";
import { isArticleLink } from "./article-list";

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
