import Parser from "rss-parser";
import { politeFetch } from "./fetch-utils";
import type { RawItem } from "./types";

/**
 * Google News RSS connector. Google News search RSS feeds return items
 * whose <link> is a Google redirect URL (not the actual article URL) and
 * whose <title> is "Article Title - Source Domain". This connector:
 *
 *   1. Parses the feed with rss-parser (same as regular RSS).
 *   2. Strips the trailing " - source.domain" from the title.
 *   3. Uses the Google News redirect URL as the item URL — the radar's
 *      dedup/relevance logic works on titles, not URLs, so this is fine
 *      for event detection. The actual article URL is only needed later
 *      (og:image fetch, public site links), and those can follow the
 *      redirect at that point.
 *   4. Extracts the source domain from <source url="..."> for attribution.
 *
 * This is deliberately NOT a new seed-source `type` — it's a helper that
 * produces the same `RawItem[]` the existing RSS connector does, so the
 * radar worker doesn't need any changes. The seed-sources entries use
 * `type: "google-news-rss"` and the radar dispatches to this connector
 * based on that type.
 */

const parser = new Parser<object, { source?: { $?: { url?: string }; _: string } }>({
  customFields: {
    item: [["source", "source"]],
  },
});

/**
 * Google News RSS titles come as "Article Title - source.domain".
 * Strip the trailing source attribution to get the clean headline.
 * Handles common edge cases: source with subdomain (www.), multi-part
 * TLD (.co.uk), and source names containing hyphens.
 */
export function cleanGoogleNewsTitle(rawTitle: string): string {
  // Match " - " followed by a domain-like pattern at the end
  const match = rawTitle.match(/^(.+)\s+-\s+\S+\.\S+$/);
  return match?.[1]?.trim() ?? rawTitle.trim();
}

export async function fetchGoogleNewsRssItems(feedUrl: string): Promise<RawItem[]> {
  const xml = await politeFetch(feedUrl);
  const feed = await parser.parseString(xml);

  return (feed.items ?? []).map((item): RawItem => {
    const url = item.link ?? item.guid ?? feedUrl;
    const title = cleanGoogleNewsTitle(item.title ?? "(untitled)");
    const summary = item.contentSnippet?.trim() || item.content?.trim() || undefined;
    const publishedAt = item.isoDate ? new Date(item.isoDate) : undefined;

    // Extract source domain from <source url="..."> for attribution
    const sourceDomain = item.source?._ ?? undefined;

    // Google News RSS doesn't include images in the feed — leave undefined
    // so the radar's og:image fallback can fetch it later if needed.
    return {
      externalId: item.guid ?? url,
      url,
      title,
      summary: summary
        ? `${summary}${sourceDomain ? ` (via ${sourceDomain})` : ""}`
        : sourceDomain
          ? `(via ${sourceDomain})`
          : undefined,
      publishedAt,
      imageUrl: undefined,
    };
  });
}
