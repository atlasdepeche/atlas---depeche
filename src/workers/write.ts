import "dotenv/config";
import { fetchRssItems } from "@/ingest/rss";
import { runVerification } from "@/agents/verification";
import { writeArticle, type Locale } from "@/agents/writer";
import { estimateCostUsd, isUnderDailyCap } from "@/agents/cost-guard";
import { shouldAutomate } from "@/lib/automation-policy";
import { getOrCreateActiveFactPack, type FactPackClaim, type FactPackSource } from "@/lib/fact-pack";
import { transitionEvent } from "@/lib/event-state-machine";
import type { EvidenceInput } from "@/agents/types";

/**
 * Writer worker — Phase 3 (+ Phase 6 automation gate). For each CONFIRMED
 * event (this project's spelling of the 2026-09-18 architecture add-on's
 * CONFIRMED state — was "verified" before that add-on) with no article yet,
 * generates matching `ar` + `fr` drafts (title, 5 headline variants, body,
 * slug) via the Writer Agent. Both locale calls are built from the same
 * frozen `fact_packs` row (Addition 5 — see src/lib/fact-pack.ts), created
 * once per event and reused, not re-queried live per locale. By default they
 * land as `articles` in status "draft" under publicationMode "assisted" —
 * a human has to approve them in `/admin/articles` before anything counts
 * as published. If `canAutomate(event.category)` is true (Phase 6: kill
 * switch off AND category allowlisted AND not a permanent human-only
 * category — see src/lib/automation-policy.ts), the article is instead
 * inserted directly as "published" with publicationMode "automated" and
 * an audit_logs entry recording that a human did NOT review it — this
 * only ever fires if the operator explicitly configured it via env vars.
 * A second, independent path (`shouldAutomate`, Phase 6 confidence-based
 * automation, added 2026-09-18) also automates ANY non-human-only category
 * when the event's verification confidence is very high AND the
 * Adversarial Agent found zero concerns — either path qualifies.
 *
 * Run modes:
 *   --dry-run   fetch a real live sample, run Verification for real, then
 *               Writer for both locales for real, print everything, write
 *               nothing to any DB. Needs ANTHROPIC_API_KEY, not DATABASE_URL.
 *   (default)   live mode: reads verified events from the DB, needs both
 *               DATABASE_URL and ANTHROPIC_API_KEY.
 */

const DAILY_CAP_USD = Number(process.env.AGENT_MAX_COST_USD_PER_DAY ?? 5);
const LOCALES: Locale[] = ["ar", "fr"];

async function dryRun() {
  console.log(
    "[write] dry-run — fetching a small real sample, verifying it for real, then writing ar+fr drafts for real. Nothing is written to any DB.",
  );

  const items = await fetchRssItems("https://fr.hespress.com/feed");
  const sample = items.slice(0, 3);
  const first = sample[0];
  if (!first) {
    console.log("[write] no items fetched — nothing to write about.");
    return;
  }

  const evidenceInputs: EvidenceInput[] = sample.map((item, index) => ({
    index,
    sourceName: "Hespress Français",
    title: item.title,
    summary: item.summary ?? "",
    url: item.url,
    publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
  }));
  const event = { title: first.title, category: "news" };

  console.log(`\n--- Verification Agent ---`);
  const verificationOutcome = await runVerification({ event, sources: evidenceInputs });
  if (!verificationOutcome.output) {
    console.log(`verification failed: ${verificationOutcome.errorMessage} — cannot write without claims.`);
    return;
  }
  console.log(
    `overallConfidence=${verificationOutcome.output.overallConfidence} ` +
      `insufficientCorroboration=${verificationOutcome.output.insufficientCorroboration} ` +
      `claims=${verificationOutcome.output.claims.length}`,
  );

  const claims = verificationOutcome.output.claims.map((c) => ({
    text: c.claimText,
    status: c.status,
    confidence: c.confidence,
  }));

  for (const locale of LOCALES) {
    console.log(`\n--- Writer Agent (${locale}) ---`);
    const outcome = await writeArticle({ locale, event, claims, sources: evidenceInputs });
    const cost = estimateCostUsd({
      model: outcome.model,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
    });
    console.log(
      `status=${outcome.status} model=${outcome.model} tokens=${outcome.inputTokens}in/${outcome.outputTokens}out cost~=$${cost.toFixed(4)}`,
    );
    if (outcome.errorMessage) console.log(`error: ${outcome.errorMessage}`);
    if (outcome.output) {
      console.log(JSON.stringify(outcome.output, null, 2));
    }
  }

  console.log("\n[write] dry-run done — nothing written to any DB.");
}

async function liveRun() {
  const { db } = await import("@/db/client");
  const {
    events,
    sourceItems,
    sources,
    claims: claimsTable,
    articles,
    articleVersions,
    articleSources,
    agentRuns,
    auditLogs,
  } = await import("@/db/schema");
  const { eq, gte, sql } = await import("drizzle-orm");

  const confirmedEvents = await db.select().from(events).where(eq(events.status, "confirmed"));
  if (confirmedEvents.length === 0) {
    console.log("[write] no confirmed events — run `npm run verify:once` first.");
    return;
  }

  const existing = await db
    .select({ eventId: articles.eventId, locale: articles.locale })
    .from(articles);
  const hasArticle = new Set(existing.map((a) => `${a.eventId}:${a.locale}`));

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const spentRows = await db
    .select({ cost: agentRuns.costEstimateUsd })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, todayStart));
  let spentTodayUsd = spentRows.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);

  for (const event of confirmedEvents) {
    const missingLocales = LOCALES.filter((l) => !hasArticle.has(`${event.id}:${l}`));
    if (missingLocales.length === 0) continue;

    if (!isUnderDailyCap({ spentTodayUsd, capUsd: DAILY_CAP_USD })) {
      console.log(`[write] daily cost cap ($${DAILY_CAP_USD}) reached — stopping.`);
      break;
    }

    const eventClaims = await db
      .select({
        text: claimsTable.text,
        category: claimsTable.category,
        status: claimsTable.status,
        confidence: claimsTable.confidence,
      })
      .from(claimsTable)
      .where(eq(claimsTable.eventId, event.id));

    if (eventClaims.length === 0) {
      console.log(`[write] event ${event.id} has no claims — skipping (run verify first)`);
      continue;
    }

    const items = await db
      .select({
        id: sourceItems.id,
        title: sourceItems.title,
        summary: sourceItems.summary,
        url: sourceItems.url,
        publishedAt: sourceItems.publishedAt,
        sourceName: sources.name,
      })
      .from(sourceItems)
      .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
      .where(eq(sourceItems.eventId, event.id));

    // Freeze claims+sources into a durable Fact Pack once per event (or
    // reuse the existing one) — both locale Writer Agent calls below read
    // from this same frozen snapshot, not two independently-live queries.
    // See src/lib/fact-pack.ts (architecture add-on Addition 5).
    const factPack = await getOrCreateActiveFactPack({
      db,
      eventId: event.id,
      buildContent: async () => ({
        claims: eventClaims as FactPackClaim[],
        sources: items.map(
          (item, index): FactPackSource => ({
            index,
            sourceItemId: item.id,
            sourceName: item.sourceName,
            title: item.title,
            summary: item.summary ?? "",
            url: item.url,
            publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
          }),
        ),
        confidence: event.confidenceInternal,
        unresolvedNotes: null,
      }),
    });

    const evidenceInputs: EvidenceInput[] = factPack.content.sources;

    for (const locale of missingLocales) {
      const outcome = await writeArticle({
        locale,
        event: { title: event.title, category: event.category },
        claims: factPack.content.claims,
        sources: evidenceInputs,
      });

      const cost = estimateCostUsd({
        model: outcome.model,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
      });
      spentTodayUsd += cost;

      await db.insert(agentRuns).values({
        eventId: event.id,
        agentType: `writer_${locale}`,
        model: outcome.model,
        status: outcome.status,
        output: outcome.output,
        errorMessage: outcome.errorMessage,
        inputTokens: outcome.inputTokens,
        outputTokens: outcome.outputTokens,
        costEstimateUsd: cost.toFixed(4),
        startedAt: outcome.startedAt,
        finishedAt: outcome.finishedAt,
      });

      if (outcome.status === "error" || !outcome.output) {
        console.log(`[write] event ${event.id} (${locale}) failed: ${outcome.errorMessage}`);
        continue;
      }

      const draft = outcome.output;
      const slug = `${draft.slug}-${event.id.slice(0, 8)}`;
      const automated = shouldAutomate({
        category: event.category,
        confidence: event.confidenceInternal,
        adversarialConcernCount: event.adversarialConcernCount,
      });

      const [article] = await db
        .insert(articles)
        .values({
          eventId: event.id,
          locale,
          status: automated ? "published" : "draft",
          title: draft.title,
          headlines: draft.headlines,
          slug,
          body: draft.body,
          publicationMode: automated ? "automated" : "assisted",
          publishedAt: automated ? sql`now()` : null,
        })
        .returning({ id: articles.id });

      if (!article) continue;

      await db.insert(articleVersions).values({
        articleId: article.id,
        version: 1,
        title: draft.title,
        body: draft.body,
        editedBy: "agent:writer",
      });

      for (const item of items) {
        await db.insert(articleSources).values({ articleId: article.id, sourceItemId: item.id });
      }

      if (automated) {
        await db.insert(auditLogs).values({
          entityType: "article",
          entityId: article.id,
          action: "auto_published",
          actorType: "system",
          details: {
            category: event.category,
            eventId: event.id,
            locale,
            confidenceInternal: event.confidenceInternal,
            adversarialConcernCount: event.adversarialConcernCount,
          },
        });
        // confirmed -> published on the event itself the first time any
        // locale actually goes live; the second locale's attempt correctly
        // no-ops (transitionEvent's conditional WHERE won't match "from:
        // confirmed" anymore) — that's expected, not an error.
        await transitionEvent({
          db,
          eventId: event.id,
          from: "confirmed",
          to: "published",
          actorType: "system",
          reason: `first article auto-published (${locale})`,
        });
        console.log(`[write] event ${event.id} (${locale}) -> article ${article.id} (PUBLISHED, automated, no human review)`);
      } else {
        console.log(`[write] event ${event.id} (${locale}) -> article ${article.id} (draft, assisted)`);
      }
    }
  }

  console.log(`[write] done. Spent today (est.): $${spentTodayUsd.toFixed(4)} / $${DAILY_CAP_USD} cap`);
}

async function main() {
  if (process.argv.includes("--dry-run")) {
    await dryRun();
    return;
  }
  await liveRun();
}

main()
  .then(() => process.exit(0)) // postgres.js keeps the pool open otherwise
  .catch((err) => {
    console.error("[write] fatal:", err);
    process.exit(1);
  });
