import { and, eq, desc } from "drizzle-orm";
import { factPacks } from "@/db/schema";
import type { db as DbType } from "@/db/client";

/**
 * Verified Fact Pack — architecture add-on Addition 5, added 2026-09-18.
 * The durable, frozen factual package between verification and writing.
 * Both the Arabic Fusha and French Writer Agent calls must consume the
 * exact same FactPackContent — see src/workers/write.ts.
 */
export interface FactPackClaim {
  text: string;
  category: string;
  status: string;
  confidence: number | null;
}

export interface FactPackSource {
  index: number;
  sourceItemId: string;
  sourceName: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string | null;
}

export interface FactPackContent {
  claims: FactPackClaim[];
  sources: FactPackSource[];
  confidence: number | null;
  unresolvedNotes: string | null;
}

/**
 * Returns the event's current active Fact Pack, or creates version 1 from
 * `buildContent()` if none exists yet. Reused (not rebuilt) on every call
 * for the same event — this is what guarantees the ar and fr Writer Agent
 * calls, whether in the same run or a rerun, see literally the same frozen
 * facts, not two independently-live-queried snapshots that could in theory
 * drift. Does not yet re-freeze on new evidence (Addition 10's Story
 * Evolution Engine is the natural home for "create version 2 when facts
 * change" — out of scope here, not silently pretended to exist).
 */
export async function getOrCreateActiveFactPack(params: {
  db: typeof DbType;
  eventId: string;
  buildContent: () => Promise<FactPackContent>;
}): Promise<{ id: string; content: FactPackContent }> {
  const { db, eventId, buildContent } = params;

  const [existing] = await db
    .select({
      id: factPacks.id,
      claims: factPacks.claims,
      sources: factPacks.sources,
      confidence: factPacks.confidence,
      unresolvedNotes: factPacks.unresolvedNotes,
    })
    .from(factPacks)
    .where(and(eq(factPacks.eventId, eventId), eq(factPacks.status, "active")))
    .orderBy(desc(factPacks.version))
    .limit(1);

  if (existing) {
    return {
      id: existing.id,
      content: {
        claims: existing.claims as FactPackClaim[],
        sources: existing.sources as FactPackSource[],
        confidence: existing.confidence,
        unresolvedNotes: existing.unresolvedNotes,
      },
    };
  }

  const content = await buildContent();

  const [created] = await db
    .insert(factPacks)
    .values({
      eventId,
      version: 1,
      status: "active",
      claims: content.claims,
      sources: content.sources,
      confidence: content.confidence,
      unresolvedNotes: content.unresolvedNotes,
    })
    .returning({ id: factPacks.id });

  if (!created) {
    throw new Error(`fact_packs insert for event ${eventId} returned no row`);
  }

  return { id: created.id, content };
}
