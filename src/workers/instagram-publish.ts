import "dotenv/config";
import { instagramAdapter } from "@/distribution/instagram";

/**
 * Instagram auto-publish worker — posts straight from the free-aggregator
 * radar (src/lib/public-site.ts's getFilteredRadarItems), NOT from the
 * `articles` table src/workers/distribute.ts uses: the public site no
 * longer runs items through the AI verify/write pipeline before showing
 * them (see CLAUDE.md's aggregator pivot), and `articles` has zero
 * real rows published, so wiring Instagram to it would just never fire.
 *
 * Only posts items that HAVE a photo (imageUrl not null) — Instagram has
 * no text-only post type, and one worth flagging honestly: this reposts
 * the ORIGINAL publisher's photo onto @atlasdepeche, which is a real step
 * further than showing it as a thumbnail on our own aggregator page next
 * to a link back to them (what the homepage does) — the caption credits
 * the source by name as a partial mitigation, but this is not a risk-free
 * "just linking" action the way the website itself is.
 *
 * Idempotent — skips any item that already has a social_posts row for
 * channel "instagram" (checked via source_item_id + channel, the unique
 * index added alongside this worker). Safe to run with the feature flag
 * off: records status="disabled" for everything, same pattern as
 * distribute.ts's X/Telegram handling.
 */

// Temporarily 1 (was 5) to test the graph.instagram.com fix on a single
// real post before trusting it with a full batch — raise back to 5 once
// that one post is confirmed working.
const MAX_POSTS_PER_RUN = 1;

async function main() {
  const { db } = await import("@/db/client");
  const { socialPosts } = await import("@/db/schema");
  const { eq, and, sql } = await import("drizzle-orm");
  const { getFilteredRadarItems } = await import("@/lib/public-site");

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  let posted = 0;
  let attempted = 0;
  let skipped = 0;
  let noImage = 0;

  for (const locale of ["fr", "ar"] as const) {
    const items = await getFilteredRadarItems(locale);

    for (const item of items) {
      // Bounded by ATTEMPTS, not successes — a persistent failure (bad
      // credentials, API outage) used to leave `posted` at 0 forever, so
      // the loop never hit its old `posted >= MAX_POSTS_PER_RUN` check and
      // instead burned through every eligible item (hundreds) on every
      // single run, hammering the Graph API with doomed requests. Found
      // live: 346 error rows from a handful of runs. This caps real API
      // calls per run regardless of outcome.
      if (attempted >= MAX_POSTS_PER_RUN) break;

      if (!item.imageUrl) {
        noImage += 1;
        continue;
      }

      const [existing] = await db
        .select({ id: socialPosts.id })
        .from(socialPosts)
        .where(and(eq(socialPosts.sourceItemId, item.id), eq(socialPosts.channel, "instagram")))
        .limit(1);

      if (existing) {
        skipped += 1;
        continue;
      }

      const result = await instagramAdapter.postImage(
        {
          title: item.title,
          sourceName: item.sourceName,
          originalUrl: item.url,
          imageUrl: item.imageUrl,
          locale,
        },
        siteUrl,
      );
      attempted += 1;

      await db.insert(socialPosts).values({
        sourceItemId: item.id,
        channel: "instagram",
        status: result.status,
        externalPostId: result.externalPostId,
        externalUrl: result.externalUrl,
        errorMessage: result.errorMessage,
        postedAt: result.status === "posted" ? sql`now()` : null,
      });

      if (result.status === "posted") posted += 1;

      console.log(
        `[instagram-publish] ${locale} source_item ${item.id} -> instagram: ${result.status}` +
          (result.errorMessage ? ` (${result.errorMessage})` : ""),
      );

      // Disabled or not — one row per item is enough to know the answer;
      // no point burning through every eligible item just to record
      // "disabled" MAX_POSTS_PER_RUN+1 times.
      if (result.status === "disabled") {
        console.log("[instagram-publish] channel disabled — recorded and stopping this run.");
        console.log(
          `[instagram-publish] done. ${posted}/${attempted} posted, ${skipped} already recorded, ${noImage} skipped (no image).`,
        );
        return;
      }
    }
  }

  console.log(
    `[instagram-publish] done. ${posted}/${attempted} posted, ${skipped} already recorded, ${noImage} skipped (no image).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[instagram-publish] fatal:", err);
    process.exit(1);
  });
