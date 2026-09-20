import { and, desc, eq, inArray, isNull, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { articles, socialPosts, sourceItems, sources } from "@/db/schema";
import type { Locale } from "@/i18n/locales";
import { dedupeRadarItems, isLikelyHomepageTitle, isMoroccoRelevant } from "@/lib/radar-filters";

export const RADAR_PAGE_SIZE = 50;

// Safety cap on how many recent rows are pulled from the DB before
// filtering/paginating in memory (see getRadarItems below) — generous
// relative to real daily volume (tens of items/day across all sources), so
// it never actually caps a real page, just protects a runaway query.
const RADAR_FETCH_CAP = 2000;

// Free-aggregator homepage/ticker/distribution: raw radar items (photo,
// title, source name), each linking out to the ORIGINAL article — never a
// rewrite of the text. Sorted by the item's own published date when the
// connector has one (RSS, html_list), falling back to when the radar first
// saw it (html's coarse "page changed" signal has no per-article date).
// Filtering (not just pagination) happens here rather than in SQL so
// isLikelyHomepageTitle/isMoroccoRelevant/dedupeRadarItems stay the single,
// unit-tested source of truth — see src/lib/radar-filters.ts. Not paginated
// — used both by getRadarItems below (which slices a page off it) and by
// src/workers/instagram-publish.ts (which needs the full eligible set, not
// one page of it).
export async function getFilteredRadarItems(locale: Locale): Promise<
  Array<{
    id: string;
    title: string;
    url: string;
    imageUrl: string | null;
    publishedAt: Date | null;
    fetchedAt: Date;
    sourceName: string;
  }>
> {
  const rows = await db
    .select({
      id: sourceItems.id,
      title: sourceItems.title,
      summary: sourceItems.summary,
      url: sourceItems.url,
      imageUrl: sourceItems.imageUrl,
      publishedAt: sourceItems.publishedAt,
      fetchedAt: sourceItems.fetchedAt,
      sourceName: sources.name,
      sourceCategory: sources.category,
    })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(and(eq(sources.language, locale), isNull(sourceItems.hiddenAt)))
    .orderBy(desc(sql`coalesce(${sourceItems.publishedAt}, ${sourceItems.fetchedAt})`))
    .limit(RADAR_FETCH_CAP);

  // category "personalities" (curated Moroccan X accounts — footballers,
  // FRMF) skips the Morocco-relevance keyword filter entirely: the
  // account itself IS the curation, a tweet like "great game tonight"
  // wouldn't mention "Maroc" but is still exactly what was asked for.
  // "personalities-intl" (CAF, beIN — international orgs that post about
  // far more than Morocco) keeps the filter, same as any news source.
  const relevant = rows.filter(
    (row) =>
      !isLikelyHomepageTitle(row.title, row.sourceName) &&
      (row.sourceCategory === "personalities" || isMoroccoRelevant(row.title, row.summary)),
  );
  // Rows are already sorted newest-first (the query's orderBy above), so
  // the survivor of a duplicate pair is the more recent one.
  return dedupeRadarItems(relevant);
}

// Names of the currently-active sources for a locale — real, not
// aspirational, and re-checked live each request (a paused/removed source
// drops out on its own, nothing here needs manual upkeep). Used to build
// an honest SEO description ("news from Le360, Hespress, TelQuel...")
// instead of a generic tagline that doesn't tell Google or a reader what's
// actually on the page — see generateMetadata in
// src/app/(public)/[locale]/page.tsx.
export async function getActiveSourceNames(locale: Locale): Promise<string[]> {
  const rows = await db
    .select({ name: sources.name })
    .from(sources)
    .where(and(eq(sources.language, locale), eq(sources.status, "active")))
    .orderBy(sources.name);
  return rows.map((row) => row.name);
}

// "Link in bio" page (src/app/(public)/[locale]/links): Instagram captions
// can't carry a clickable link (see src/distribution/instagram.ts's own
// comment on that platform limit), and the bio itself only holds one
// static URL. This gives that one URL somewhere real to point to — every
// item @atlasdepeche has actually posted, each linking to its real
// original article, newest first. Not locale-filtered: the account posts
// both ar and fr captions from the one bio link, so a visitor from either
// should find what they just saw.
const RECENT_INSTAGRAM_LINKS_LIMIT = 30;

export async function getRecentInstagramLinks(): Promise<
  Array<{
    id: string;
    title: string;
    url: string;
    imageUrl: string | null;
    sourceName: string;
    postedAt: Date;
  }>
> {
  const rows = await db
    .select({
      id: socialPosts.id,
      title: sourceItems.title,
      url: sourceItems.url,
      imageUrl: sourceItems.imageUrl,
      sourceName: sources.name,
      postedAt: socialPosts.postedAt,
    })
    .from(socialPosts)
    .innerJoin(sourceItems, eq(socialPosts.sourceItemId, sourceItems.id))
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(and(eq(socialPosts.channel, "instagram"), eq(socialPosts.status, "posted")))
    .orderBy(desc(socialPosts.postedAt))
    .limit(RECENT_INSTAGRAM_LINKS_LIMIT);

  // postedAt is non-null by construction for status="posted" (see
  // src/workers/instagram-publish.ts), but the column itself is nullable
  // — narrow it here rather than weaken the return type for callers.
  return rows.filter((row): row is typeof row & { postedAt: Date } => row.postedAt !== null);
}

export async function getRadarItems(
  locale: Locale,
  page: number,
): Promise<{
  items: Awaited<ReturnType<typeof getFilteredRadarItems>>;
  page: number;
  totalPages: number;
}> {
  const filtered = await getFilteredRadarItems(locale);
  const totalPages = Math.max(1, Math.ceil(filtered.length / RADAR_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * RADAR_PAGE_SIZE;

  return {
    items: filtered.slice(offset, offset + RADAR_PAGE_SIZE),
    page: safePage,
    totalPages,
  };
}

// A corrected article is still a published article — MASTER_PROMPT section
// 36 requires corrections to be visible, not to make the article vanish.
const PUBLIC_STATUSES = ["published", "corrected"] as const;

export async function getPublishedArticles(locale: Locale) {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(eq(articles.locale, locale), inArray(articles.status, PUBLIC_STATUSES)))
    .orderBy(desc(articles.publishedAt));
}

export async function getPublishedArticleBySlug(locale: Locale, slug: string) {
  const [article] = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.locale, locale),
        eq(articles.slug, slug),
        inArray(articles.status, PUBLIC_STATUSES),
      ),
    )
    .limit(1);
  return article ?? null;
}

export async function searchArticles(locale: Locale, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(
      and(
        eq(articles.locale, locale),
        inArray(articles.status, PUBLIC_STATUSES),
        or(
          ilike(articles.title, `%${trimmed}%`),
          ilike(articles.body, `%${trimmed}%`),
        ),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(50);
}
