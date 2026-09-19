import { and, desc, eq, inArray, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { articles, sourceItems, sources } from "@/db/schema";
import type { Locale } from "@/i18n/locales";
import { isLikelyHomepageTitle, isMoroccoRelevant } from "@/lib/radar-filters";

export const RADAR_PAGE_SIZE = 50;

// Safety cap on how many recent rows are pulled from the DB before
// filtering/paginating in memory (see getRadarItems below) — generous
// relative to real daily volume (tens of items/day across all sources), so
// it never actually caps a real page, just protects a runaway query.
const RADAR_FETCH_CAP = 2000;

// Free-aggregator homepage: raw radar items (photo, title, source name),
// each linking out to the ORIGINAL article — never a rewrite of the text.
// Sorted by the item's own published date when the connector has one
// (RSS, html_list), falling back to when the radar first saw it (html's
// coarse "page changed" signal has no per-article date). Filtering (not
// just pagination) happens here rather than in SQL so isLikelyHomepageTitle
// stays the single, unit-tested source of truth — see src/lib/radar-filters.ts.
export async function getRadarItems(
  locale: Locale,
  page: number,
): Promise<{ items: Array<{
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  fetchedAt: Date;
  sourceName: string;
}>; page: number; totalPages: number }> {
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
    })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(eq(sources.language, locale))
    .orderBy(desc(sql`coalesce(${sourceItems.publishedAt}, ${sourceItems.fetchedAt})`))
    .limit(RADAR_FETCH_CAP);

  const filtered = rows.filter(
    (row) =>
      !isLikelyHomepageTitle(row.title, row.sourceName) &&
      isMoroccoRelevant(row.title, row.summary),
  );
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
