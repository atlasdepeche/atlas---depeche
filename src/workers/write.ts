import "dotenv/config";
import { fetchRssItems } from "@/ingest/rss";
import { runVerification } from "@/agents/verification";
import { writeArticle, type Locale } from "@/agents/writer";
import { estimateCostUsd, isUnderDailyCap } from "@/agents/cost-guard";
import type { EvidenceInput } from "@/agents/types";

/**
 * Writer worker — Phase 3. For each VERIFIED event with no article yet,
 * generates matching `ar` + `fr` drafts (title, 5 headline variants, body,
 * slug) via the Writer Agent, and persists them as `articles` in status
 * "draft" under publicationMode "assisted" — a human still has to approve
 * them in `/admin/articles` before anything counts as published (Phase 4
 * does actual publishing).
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
  } = await import("@/db/schema");
  const { eq, gte } = await import("drizzle-orm");

  const verifiedEvents = await db.select().from(events).where(eq(events.status, "verified"));
  if (verifiedEvents.length === 0) {
    console.log("[write] no verified events — run `npm run verify:once` first.");
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

  for (const event of verifiedEvents) {
    const missingLocales = LOCALES.filter((l) => !hasArticle.has(`${event.id}:${l}`));
    if (missingLocales.length === 0) continue;

    if (!isUnderDailyCap({ spentTodayUsd, capUsd: DAILY_CAP_USD })) {
      console.log(`[write] daily cost cap ($${DAILY_CAP_USD}) reached — stopping.`);
      break;
    }

    const eventClaims = await db
      .select({ text: claimsTable.text, status: claimsTable.status, confidence: claimsTable.confidence })
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

    const evidenceInputs: EvidenceInput[] = items.map((item, index) => ({
      index,
      sourceName: item.sourceName,
      title: item.title,
      summary: item.summary ?? "",
      url: item.url,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    }));

    for (const locale of missingLocales) {
      const outcome = await writeArticle({
        locale,
        event: { title: event.title, category: event.category },
        claims: eventClaims,
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

      const [article] = await db
        .insert(articles)
        .values({
          eventId: event.id,
          locale,
          status: "draft",
          title: draft.title,
          headlines: draft.headlines,
          slug,
          body: draft.body,
          publicationMode: "assisted",
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

      console.log(`[write] event ${event.id} (${locale}) -> article ${article.id} (draft, assisted)`);
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

main().catch((err) => {
  console.error("[write] fatal:", err);
  process.exit(1);
});
