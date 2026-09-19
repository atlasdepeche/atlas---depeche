import * as cheerio from "cheerio";
import { politeFetch } from "./fetch-utils";
import type { RawItem } from "./types";

const DEFAULT_MAX_ARTICLES = 8;

/**
 * Pure matching rule, exported so it's testable without a network call:
 * a link counts as an article if its path is strictly nested under the
 * listing page's own path.
 */
export function isArticleLink(hrefPath: string, listingPath: string): boolean {
  const linkPrefix = listingPath.endsWith("/") ? listingPath : `${listingPath}/`;
  return hrefPath.startsWith(linkPrefix) && hrefPath.length > linkPrefix.length;
}

/**
 * Generic "listing page -> real article pages" connector. Unlike
 * fetchHtmlChangeSignal (which only ever sees a static homepage's
 * `<title>`), this extracts real per-article links from a listing/index
 * page, then fetches each article's own page for a title + body summary —
 * see CLAUDE.md's "structural corroboration gap" note for why this exists:
 * without it, an official source can never supply the "1 official primary
 * source" that MASTER_PROMPT section 35 accepts on its own.
 *
 * Article links are recognized heuristically: any `<a href>` on the
 * listing page whose path is nested under the listing page's own path
 * (e.g. a listing at /fr/actualites matches links under
 * /fr/actualites/...). This covers the common "index page + nested
 * article slugs" pattern without needing a per-site selector config for
 * what is, for now, a single source (maroc.ma). If a second source needs
 * a genuinely different pattern, that's the point to add real per-source
 * config — not to guess more heuristics into this one.
 */
export async function fetchArticleListItems(
  listUrl: string,
  maxArticles = DEFAULT_MAX_ARTICLES,
): Promise<RawItem[]> {
  const html = await politeFetch(listUrl);
  const $ = cheerio.load(html);

  const listingPath = new URL(listUrl).pathname;

  const articleUrls = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    let absolute: URL;
    try {
      absolute = new URL(href, listUrl);
    } catch {
      return;
    }
    if (isArticleLink(absolute.pathname, listingPath)) {
      articleUrls.add(absolute.toString());
    }
  });

  const items: RawItem[] = [];
  for (const articleUrl of Array.from(articleUrls).slice(0, maxArticles)) {
    try {
      const articleHtml = await politeFetch(articleUrl);
      const $$ = cheerio.load(articleHtml);
      const title = $$("h1").first().text().trim() || $$("title").first().text().trim();
      const summary = $$('meta[name="description"]').attr("content")?.trim();
      // The first <time datetime="..."> on the page is the article's own
      // publish date (later ones belong to "related articles" widgets) —
      // without this, the Adversarial Agent correctly can't rule out the
      // page being old/evergreen content re-detected as news. Confirmed
      // against a real maroc.ma article on 2026-09-18.
      const publishedAtRaw = $$("time[datetime]").first().attr("datetime");
      const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : undefined;
      const imageUrl =
        $$('meta[property="og:image"]').attr("content")?.trim() ||
        $$('meta[name="twitter:image"]').attr("content")?.trim();

      if (!title) continue;

      items.push({
        externalId: articleUrl,
        url: articleUrl,
        title,
        summary,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : undefined,
        imageUrl: imageUrl || undefined,
      });
    } catch (err) {
      console.warn(`[article-list] failed to fetch article ${articleUrl}: ${(err as Error).message}`);
    }
  }

  return items;
}
