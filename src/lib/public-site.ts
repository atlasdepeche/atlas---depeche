import { and, desc, eq, inArray, or, ilike, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { articles, sourceItems, sources } from "@/db/schema";
import type { Locale } from "@/i18n/locales";

export const RADAR_PAGE_SIZE = 50;

// Free-aggregator homepage: raw radar items (photo, title, source name),
// each linking out to the ORIGINAL article — never a rewrite of the text.
// Sorted by the item's own published date when the connector has one
// (RSS, html_list), falling back to when the radar first saw it (html's
// coarse "page changed" signal has no per-article date).
export async function getRadarItems(locale: Locale, page: number) {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * RADAR_PAGE_SIZE;

  return db
    .select({
      id: sourceItems.id,
      title: sourceItems.title,
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
    .limit(RADAR_PAGE_SIZE)
    .offset(offset);
}

export async function getRadarItemsCount(locale: Locale): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(eq(sources.language, locale));
  return Number(row?.count ?? 0);
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
