import "dotenv/config";

/**
 * One-time cleanup for source_items rows that got a shared/stuck thumbnail
 * from a broken feed (confirmed 2026-09-20: Yabiladi's RSS media:thumbnail
 * was identical across many unrelated articles). Nulls imageUrl on any row
 * whose image is shared by 2+ OTHER rows from the same source, so the
 * existing radar backfillMissingImages() pass re-fetches the real
 * per-article og:image on the next run(s). The ingest-side fix in
 * radar.ts prevents new rows from getting this in the first place.
 */
async function main() {
  const { db } = await import("@/db/client");
  const { sourceItems } = await import("@/db/schema");
  const { sql, inArray } = await import("drizzle-orm");

  const dupGroups = await db.execute<{ source_id: string; image_url: string; cnt: number }>(sql`
    select source_id, image_url, count(*)::int as cnt
    from source_items
    where image_url is not null
    group by source_id, image_url
    having count(*) > 1
  `);

  const rows = Array.from(dupGroups as unknown as { source_id: string; image_url: string; cnt: number }[]);
  console.log(`found ${rows.length} (source, image) group(s) with shared thumbnails`);

  const totalIds: string[] = [];
  for (const g of rows) {
    const affected = await db
      .select({ id: sourceItems.id })
      .from(sourceItems)
      .where(sql`${sourceItems.sourceId} = ${g.source_id} and ${sourceItems.imageUrl} = ${g.image_url}`);
    console.log(`  source=${g.source_id} image=${g.image_url} -> ${affected.length} row(s)`);
    totalIds.push(...affected.map((a) => a.id));
  }

  if (totalIds.length === 0) {
    console.log("nothing to clean");
    process.exit(0);
  }

  const result = await db
    .update(sourceItems)
    .set({ imageUrl: null })
    .where(inArray(sourceItems.id, totalIds));

  console.log(`nulled imageUrl on ${totalIds.length} row(s):`, result);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
