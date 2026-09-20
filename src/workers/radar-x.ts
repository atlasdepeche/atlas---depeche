import "dotenv/config";
import { X_ACCOUNTS, fetchXTimelineItems } from "@/ingest/x-timeline";

/**
 * X (Twitter) personalities worker — separate from radar.ts on purpose.
 * Runs once a day (.github/workflows/x-personalities.yml), never the
 * 30-min cron: X bills per post read (no free tier since Feb 2026 — see
 * x-timeline.ts's own comment), so cadence directly controls real money.
 * At 5 tweets × 6 accounts once/day, that's ~30 reads/day, ~900/month —
 * comfortably inside the $5 hard spend cap set on the X developer account
 * itself (belt AND suspenders: the cap makes overspend structurally
 * impossible even if this worker's own math is ever wrong).
 *
 * No event/dedup-fingerprint machinery here unlike radar.ts — a tweet
 * doesn't need cross-source corroboration the way a news claim does, it's
 * already an original, attributed, single-source post. Items just need a
 * `sources` row to join into getFilteredRadarItems (public-site.ts) like
 * anything else on the homepage/Instagram pipeline.
 */
async function main() {
  const { db } = await import("@/db/client");
  const { sources, sourceItems } = await import("@/db/schema");
  const { eq, and, sql } = await import("drizzle-orm");

  let itemCount = 0;
  let newCount = 0;
  let errorCount = 0;

  for (const account of X_ACCOUNTS) {
    const profileUrl = `https://x.com/${account.username}`;
    const [source] = await db
      .select({ id: sources.id, status: sources.status })
      .from(sources)
      .where(eq(sources.url, profileUrl))
      .limit(1);

    if (!source) {
      console.log(`[radar-x] no sources row for ${profileUrl} — run \`npm run db:seed\` first, skipping.`);
      continue;
    }
    if (source.status !== "active") {
      console.log(`[radar-x] ${account.username} is paused — skipping.`);
      continue;
    }

    try {
      const items = await fetchXTimelineItems(account);
      console.log(`[radar-x] @${account.username}: fetched ${items.length} tweet(s)`);

      for (const item of items) {
        itemCount += 1;

        const [existing] = await db
          .select({ id: sourceItems.id })
          .from(sourceItems)
          .where(and(eq(sourceItems.sourceId, source.id), eq(sourceItems.externalId, item.externalId)))
          .limit(1);

        if (existing) {
          await db.update(sourceItems).set({ fetchedAt: sql`now()` }).where(eq(sourceItems.id, existing.id));
          continue;
        }

        await db.insert(sourceItems).values({
          sourceId: source.id,
          externalId: item.externalId,
          url: item.url,
          title: item.title,
          imageUrl: item.imageUrl,
          publishedAt: item.publishedAt,
          connectorVersion: "x@1",
          lineageType: "original",
        });
        newCount += 1;
      }
    } catch (err) {
      errorCount += 1;
      console.error(`[radar-x] @${account.username} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `[radar-x] done. ${newCount} new tweet(s) saved, ${itemCount - newCount} already seen, ${errorCount} account error(s).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[radar-x] fatal:", err);
    process.exit(1);
  });
