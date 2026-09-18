import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { articles } from "@/db/schema";
import type { Locale } from "@/i18n/locales";

export async function getPublishedArticles(locale: Locale) {
  return db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      publishedAt: articles.publishedAt,
    })
    .from(articles)
    .where(and(eq(articles.locale, locale), eq(articles.status, "published")))
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
        eq(articles.status, "published"),
      ),
    )
    .limit(1);
  return article ?? null;
}
