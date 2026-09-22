import { describe, expect, it } from "vitest";
import { cleanGoogleNewsTitle } from "./google-news-rss";

describe("cleanGoogleNewsTitle", () => {
  it("strips trailing source domain from Google News title", () => {
    expect(cleanGoogleNewsTitle("Maroc : une élection sans relief - lemonde.fr")).toBe(
      "Maroc : une élection sans relief",
    );
  });

  it("strips source with subdomain", () => {
    expect(cleanGoogleNewsTitle("Breaking news from Morocco - www.lemonde.fr")).toBe(
      "Breaking news from Morocco",
    );
  });

  it("strips multi-part TLD source", () => {
    expect(cleanGoogleNewsTitle("Morocco election update - bbc.co.uk")).toBe(
      "Morocco election update",
    );
  });

  it("handles title with no source suffix", () => {
    expect(cleanGoogleNewsTitle("Morocco announces new policy")).toBe(
      "Morocco announces new policy",
    );
  });

  it("handles title with hyphens in source name", () => {
    expect(cleanGoogleNewsTitle("Sahara: latest developments - middle-east-monitor.com")).toBe(
      "Sahara: latest developments",
    );
  });

  it("handles untitled items", () => {
    expect(cleanGoogleNewsTitle("(untitled)")).toBe("(untitled)");
  });

  it("handles source name with multiple dots", () => {
    expect(cleanGoogleNewsTitle("Diaspora news - news.google.com")).toBe("Diaspora news");
  });

  it("does not strip ' - ' in the middle of a real title", () => {
    expect(cleanGoogleNewsTitle("Maroc - France : nouvelle coopération")).toBe(
      "Maroc - France : nouvelle coopération",
    );
  });
});
