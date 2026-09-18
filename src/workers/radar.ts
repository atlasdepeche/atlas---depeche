import "dotenv/config";
import { fetchRssItems } from "@/ingest/rss";
import { fetchHtmlChangeSignal } from "@/ingest/html";
import { eventFingerprint } from "@/ingest/normalize";
import { decideDedup, type DedupCandidateEvent } from "@/ingest/dedup";
import { SEED_SOURCES, type SeedSource } from "@/db/seed-sources";
import type { RawItem } from "@/ingest/types";

/**
 * Radar worker — Phase 1 (SHADOW only). Fetches active sources, normalizes
 * items, runs them through the dedup engine, and (in live mode) persists
 * `source_items` + `events`. It never touches `articles` or anything
 * publish-related — that's Phase 3+.
 *
 * Run modes:
 *   --dry-run   fetch + normalize + dedup in memory, print results, touch
 *               nothing in the DB. Works without DATABASE_URL. Useful to
 *               verify connectors/dedup logic and as a smoke test.
 *   (default)   live mode: reads `sources` from the DB, writes
 *               `source_items` and `events`. Requires DATABASE_URL and a
 *               seeded sources table (`npm run db:seed` first).
 */

async function fetchSourceItems(source: Pick<SeedSource, "type" | "url">): Promise<RawItem[]> {
  if (source.type === "rss") {
    return fetchRssItems(source.url);
  }
  return [await fetchHtmlChangeSignal(source.url)];
}

async function dryRun() {
  const active = SEED_SOURCES.filter((s) => s.status === "active");
  console.log(`[radar] dry-run — ${active.length} active seed source(s), nothing will be written`);

  const seenEvents: DedupCandidateEvent[] = [];
  let itemCount = 0;
  let createdCount = 0;
  let attachedCount = 0;
  let errorCount = 0;

  for (const source of active) {
    console.log(`\n--- ${source.name} (${source.type}, ${source.language}) ---`);
    try {
      const items = await fetchSourceItems(source);
      console.log(`  fetched ${items.length} item(s)`);

      for (const item of items.slice(0, 3)) {
        itemCount += 1;
        const fingerprint = eventFingerprint({ category: source.category, title: item.title });
        const now = new Date();
        const decision = decideDedup({ fingerprint, now, recentEvents: seenEvents });

        if (decision.action === "create") {
          createdCount += 1;
          seenEvents.push({ id: fingerprint, fingerprint, detectedAt: now });
          console.log(`  [new event]     "${item.title}"`);
        } else {
          attachedCount += 1;
          console.log(`  [attach->${decision.eventId.slice(0, 8)}] "${item.title}"`);
        }
      }
    } catch (err) {
      errorCount += 1;
      console.log(`  ERROR: ${(err as Error).message}`);
    }
  }

  console.log(
    `\n[radar] dry-run summary: ${itemCount} item(s) seen across ${active.length} source(s) ` +
      `(${errorCount} source error(s)), ${createdCount} candidate event(s), ${attachedCount} attached. ` +
      `Publication mode: SHADOW — nothing published, nothing written to the DB.`,
  );
}

async function liveRun() {
  const { db } = await import("@/db/client");
  const { sources, events, sourceItems } = await import("@/db/schema");
  const { eq, and, gte, sql } = await import("drizzle-orm");

  const activeSources = await db.select().from(sources).where(eq(sources.status, "active"));

  if (activeSources.length === 0) {
    console.log("[radar] no active sources in DB — run `npm run db:seed` first.");
    return;
  }

  console.log(`[radar] live run — ${activeSources.length} active source(s)`);

  let itemCount = 0;
  let createdCount = 0;
  let attachedCount = 0;

  for (const source of activeSources) {
    try {
      const items = await fetchSourceItems({
        type: source.type as "rss" | "html",
        url: source.url,
      });

      for (const item of items) {
        const [existing] = await db
          .select({ id: sourceItems.id })
          .from(sourceItems)
          .where(
            and(eq(sourceItems.sourceId, source.id), eq(sourceItems.externalId, item.externalId)),
          )
          .limit(1);

        if (existing) {
          // Already seen this exact item/page state — just note we saw it
          // again, no new signal.
          await db
            .update(sourceItems)
            .set({ fetchedAt: sql`now()` })
            .where(eq(sourceItems.id, existing.id));
          continue;
        }

        itemCount += 1;
        const fingerprint = eventFingerprint({
          category: source.category ?? "news",
          title: item.title,
        });
        const now = new Date();
        const windowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        const recentEvents = await db
          .select({ id: events.id, fingerprint: events.fingerprint, detectedAt: events.detectedAt })
          .from(events)
          .where(and(eq(events.fingerprint, fingerprint), gte(events.detectedAt, windowStart)));

        const decision = decideDedup({
          fingerprint,
          now,
          recentEvents: recentEvents.map((e) => ({
            id: e.id,
            fingerprint: e.fingerprint ?? "",
            detectedAt: e.detectedAt,
          })),
        });

        let eventId: string;
        if (decision.action === "attach") {
          eventId = decision.eventId;
          await db.update(events).set({ updatedAt: sql`now()` }).where(eq(events.id, eventId));
          attachedCount += 1;
        } else {
          const [created] = await db
            .insert(events)
            .values({
              title: item.title,
              category: source.category ?? "news",
              fingerprint,
              status: "candidate",
            })
            .returning({ id: events.id });
          if (!created) {
            throw new Error("event insert returned no row");
          }
          eventId = created.id;
          createdCount += 1;
        }

        await db.insert(sourceItems).values({
          sourceId: source.id,
          externalId: item.externalId,
          url: item.url,
          title: item.title,
          summary: item.summary,
          publishedAt: item.publishedAt,
          eventId,
        });
      }

      await db
        .update(sources)
        .set({ lastSeenAt: sql`now()`, lastSuccessAt: sql`now()`, lastErrorMessage: null })
        .where(eq(sources.id, source.id));
    } catch (err) {
      console.log(`[radar] source "${source.name}" failed: ${(err as Error).message}`);
      await db
        .update(sources)
        .set({
          lastSeenAt: sql`now()`,
          lastErrorAt: sql`now()`,
          lastErrorMessage: (err as Error).message.slice(0, 500),
        })
        .where(eq(sources.id, source.id));
    }
  }

  console.log(
    `[radar] live run done: ${itemCount} new item(s), ${createdCount} candidate event(s), ` +
      `${attachedCount} attached. Publication mode: SHADOW — nothing published.`,
  );
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    await dryRun();
    return;
  }
  await liveRun();
}

main().catch((err) => {
  console.error("[radar] fatal:", err);
  process.exit(1);
});
