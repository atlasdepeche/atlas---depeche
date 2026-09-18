import "dotenv/config";
import { xAdapter } from "@/distribution/x";
import { telegramAdapter } from "@/distribution/telegram";
import type { DistributionAdapter } from "@/distribution/types";

/**
 * Distribution worker — Phase 5. For each published article, tries every
 * adapter once (idempotent — skips if a social_posts row already exists
 * for that article+channel). A disabled channel still gets a row
 * (status="disabled") so /admin/analytics can answer "why wasn't this
 * posted to X" from the DB, per MASTER_PROMPT section 33.
 */

const ADAPTERS: DistributionAdapter[] = [xAdapter, telegramAdapter];

async function main() {
  const { db } = await import("@/db/client");
  const { articles, socialPosts } = await import("@/db/schema");
  const { eq, and, sql } = await import("drizzle-orm");

  const published = await db.select().from(articles).where(eq(articles.status, "published"));
  if (published.length === 0) {
    console.log("[distribute] no published articles.");
    return;
  }

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  let posted = 0;
  let skipped = 0;

  for (const article of published) {
    for (const adapter of ADAPTERS) {
      const [existing] = await db
        .select({ id: socialPosts.id })
        .from(socialPosts)
        .where(and(eq(socialPosts.articleId, article.id), eq(socialPosts.channel, adapter.channel)))
        .limit(1);

      if (existing) {
        skipped += 1;
        continue;
      }

      const result = await adapter.post(
        { title: article.title, slug: article.slug, locale: article.locale as "ar" | "fr" },
        siteUrl,
      );

      await db.insert(socialPosts).values({
        articleId: article.id,
        channel: adapter.channel,
        status: result.status,
        externalPostId: result.externalPostId,
        externalUrl: result.externalUrl,
        errorMessage: result.errorMessage,
        postedAt: result.status === "posted" ? sql`now()` : null,
      });

      if (result.status === "posted") posted += 1;

      console.log(
        `[distribute] article ${article.id} -> ${adapter.channel}: ${result.status}` +
          (result.errorMessage ? ` (${result.errorMessage})` : ""),
      );
    }
  }

  console.log(`[distribute] done. ${posted} posted, ${skipped} already had a record.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[distribute] fatal:", err);
    process.exit(1);
  });
