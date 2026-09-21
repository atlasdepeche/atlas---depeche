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
 * Deletes `source_items` older than RETENTION_DAYS — the AI-pipeline's
 * audit trail (`claims`/`agent_runs`/`audit_logs`) is a different kind of
 * data than raw radar ingest and isn't touched by that pass (see
 * docs/MASTER_PROMPT's "never silently overwrite the past"). A
 * source_items row past RETENTION_DAYS has already aged off every page of
 * the homepage pagination in practice — nothing user-facing references it
 * by then.
 *
 * social_posts.sourceItemId cascades on delete (schema.ts), so deleting an
 * old source_item also drops its Instagram post record — accepted
 * trade-off, not an oversight: that FK's cascade behavior already existed
 * before this worker, this just means it now actually fires over time.
 *
 * Second pass, added 2026-09-21 — explicitly requested ("si son antiguas
 * quitalas") after Hicham noticed 928 `candidate` events piled up
 * untouched since the "$0 AI spend" pause (see
 * [[project_rexfoot_gemini_quota]]-style standing decision in
 * project_atlasdepeche_new_project memory): with verify/write paused,
 * candidate events never resolve and just accumulate forever, unlike
 * source_items which already had retention. Deletes `events` older than
 * RETENTION_DAYS that are STILL `candidate` AND have zero `agent_runs` —
 * the agent_runs check is the guard: any event verify.ts has actually
 * spent real money analyzing (agent_runs rows exist) is left alone,
 * cascade-delete would silently throw away paid analysis for no reason.
 * Never touches `published`/`rejected`/other resolved states.
 */

// Lowered from 90 to 7, then to 3, then to 1 day (= 24h) — explicitly
// requested each time, most recently 2026-09-20: "24 horas y se borran
// definitivamente para que dejan el espacio a otros" — make room for new
// items sooner rather than let the homepage/Instagram-eligible pool fill
// up with aging content.
const RETENTION_DAYS = 1;

async function main() {
  const { db } = await import("@/db/client");
  const { sourceItems, events, agentRuns } = await import("@/db/schema");
  const { lt, eq, and, inArray, sql } = await import("drizzle-orm");

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deletedItems = await db
    .delete(sourceItems)
    .where(lt(sourceItems.fetchedAt, cutoff))
    .returning({ id: sourceItems.id });

  const [remainingItemsRow] = await db.select({ count: sql<number>`count(*)` }).from(sourceItems);
  const remainingItems = remainingItemsRow?.count ?? 0;

  console.log(
    `[cleanup] deleted ${deletedItems.length} source_items older than ${RETENTION_DAYS} days ` +
      `(cutoff ${cutoff.toISOString()}). ${remainingItems} rows remain.`,
  );

  const staleCandidateIds = await db
    .select({ id: events.id })
    .from(events)
    .leftJoin(agentRuns, eq(agentRuns.eventId, events.id))
    .where(and(eq(events.status, "candidate"), lt(events.detectedAt, cutoff), sql`${agentRuns.id} is null`));

  let deletedEvents = 0;
  if (staleCandidateIds.length > 0) {
    const deleted = await db
      .delete(events)
      .where(inArray(events.id, staleCandidateIds.map((e) => e.id)))
      .returning({ id: events.id });
    deletedEvents = deleted.length;
  }

  const [remainingCandidatesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.status, "candidate"));
  const remainingCandidates = remainingCandidatesRow?.count ?? 0;

  console.log(
    `[cleanup] deleted ${deletedEvents} stale (>${RETENTION_DAYS}d, never analyzed) candidate events. ` +
      `${remainingCandidates} candidate events remain (includes any still within retention or with real agent spend).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cleanup] fatal:", err);
    process.exit(1);
  });
