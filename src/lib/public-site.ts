import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { articles } from "@/db/schema";
import type { Locale } from "@/i18n/locales";

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
