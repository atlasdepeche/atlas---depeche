import "dotenv/config";

/**
 * Retention worker — explicitly requested: "con la llegada de muchas
 * noticias, no vamos a tener más sitio y un día se colapsa?" (won't we run
 * out of space as the radar keeps ingesting?).
 *
 * At today's real volume (see CLAUDE.md/live radar runs — tens to low
 * hundreds of new source_items/day) raw storage itself is not an urgent
 * problem: a few years of unbounded growth is still only a few hundred MB.
 * The real, sooner problem is QUERY COST — getFilteredRadarItems
 * (src/lib/public-site.ts) runs on every homepage/ticker/Instagram-worker
 * request and sorts by coalesce(published_at, fetched_at) over every row
 * for the locale; that gets slower as the table grows even with the
 * matching expression index added alongside this worker (schema.ts's
 * source_items_sort_idx), which speeds up the sort itself but not the
 * fact that more rows exist to consider. Bounding the table size bounds
 * that cost too, indefinitely.
 *
 * Deletes only `source_items` older than RETENTION_DAYS — deliberately
 * NOT `events`/`claims`/`agent_runs`/`audit_logs`: those are the
 * AI-pipeline's audit trail (see docs/MASTER_PROMPT's "never silently
 * overwrite the past"), a different kind of data than raw radar ingest,
 * and not the thing actually growing unbounded from the aggregator's
 * day-to-day operation. A source_items row past RETENTION_DAYS has
 * already aged off every page of the homepage pagination in practice —
 * nothing user-facing references it by then.
 *
 * social_posts.sourceItemId cascades on delete (schema.ts), so deleting an
 * old source_item also drops its Instagram post record — accepted
 * trade-off, not an oversight: that FK's cascade behavior already existed
 * before this worker, this just means it now actually fires over time.
 */

// Lowered from 90 to 7, then to 3 days, explicitly requested.
const RETENTION_DAYS = 3;

async function main() {
  const { db } = await import("@/db/client");
  const { sourceItems } = await import("@/db/schema");
  const { lt, sql } = await import("drizzle-orm");

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deleted = await db
    .delete(sourceItems)
    .where(lt(sourceItems.fetchedAt, cutoff))
    .returning({ id: sourceItems.id });

  const [remainingRow] = await db.select({ count: sql<number>`count(*)` }).from(sourceItems);
  const remaining = remainingRow?.count ?? 0;

  console.log(
    `[cleanup] deleted ${deleted.length} source_items older than ${RETENTION_DAYS} days ` +
      `(cutoff ${cutoff.toISOString()}). ${remaining} rows remain.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cleanup] fatal:", err);
    process.exit(1);
  });
