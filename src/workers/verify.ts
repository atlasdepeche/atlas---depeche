import "dotenv/config";
import { fetchRssItems } from "@/ingest/rss";
import { runVerification } from "@/agents/verification";
import { runAdversarial, type AdversarialResult } from "@/agents/adversarial";
import { decideEventVerdict } from "@/agents/verdict";
import { estimateCostUsd, isUnderDailyCap, isUnderPerEventCap } from "@/agents/cost-guard";
import type { EvidenceInput } from "@/agents/types";

/**
 * Verification worker — Phase 2. Runs the Verification + Adversarial agents
 * over candidate events and their radar-collected source_items, then writes
 * claims/evidence/agent_runs/audit_logs and updates the event's status.
 * Never touches `articles` — that's Phase 3.
 *
 * Run modes:
 *   --dry-run   fetch a small real sample (live Hespress RSS) and run both
 *               agents against it for real, print everything, write nothing
 *               to any DB. Needs ANTHROPIC_API_KEY but not DATABASE_URL —
 *               useful to validate the agent prompts/schemas on their own.
 *   (default)   live mode: reads candidate events from the DB, needs both
 *               DATABASE_URL and ANTHROPIC_API_KEY.
 *   --limit N   (live mode only) process at most N candidate events this
 *               run — a safety valve independent of the cost caps, for
 *               "there are way more candidates than my remaining budget
 *               can safely try" (the cost caps alone only stop mid-run,
 *               after some spend; this stops before starting).
 */

const DAILY_CAP_USD = Number(process.env.AGENT_MAX_COST_USD_PER_DAY ?? 5);
const PER_EVENT_CAP_USD = Number(process.env.AGENT_MAX_COST_USD_PER_EVENT ?? 0.5);

async function dryRun() {
  console.log(
    "[verify] dry-run — fetching a small real sample from Hespress Français, calling the real Anthropic API, writing nothing to any DB",
  );

  const items = await fetchRssItems("https://fr.hespress.com/feed");
  const sample = items.slice(0, 3);
  const first = sample[0];
  if (!first) {
    console.log("[verify] no items fetched — nothing to verify.");
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

  console.log(`\n--- Verification Agent (${sample.length} real item(s)) ---`);
  const verificationOutcome = await runVerification({ event, sources: evidenceInputs });
  const verificationCost = estimateCostUsd({
    model: verificationOutcome.model,
    inputTokens: verificationOutcome.inputTokens,
    outputTokens: verificationOutcome.outputTokens,
  });
  console.log(
    `status=${verificationOutcome.status} model=${verificationOutcome.model} ` +
      `tokens=${verificationOutcome.inputTokens}in/${verificationOutcome.outputTokens}out cost~=$${verificationCost.toFixed(4)}`,
  );
  if (verificationOutcome.errorMessage) {
    console.log(`error: ${verificationOutcome.errorMessage}`);
  }
  if (!verificationOutcome.output) {
    console.log("[verify] dry-run stopped — no verification output to feed the adversarial pass.");
    return;
  }
  console.log(JSON.stringify(verificationOutcome.output, null, 2));

  console.log(`\n--- Adversarial Agent ---`);
  const adversarialOutcome = await runAdversarial({
    event,
    sources: evidenceInputs,
    verification: verificationOutcome.output,
  });
  const adversarialCost = estimateCostUsd({
    model: adversarialOutcome.model,
    inputTokens: adversarialOutcome.inputTokens,
    outputTokens: adversarialOutcome.outputTokens,
  });
  console.log(
    `status=${adversarialOutcome.status} tokens=${adversarialOutcome.inputTokens}in/${adversarialOutcome.outputTokens}out cost~=$${adversarialCost.toFixed(4)}`,
  );
  if (adversarialOutcome.errorMessage) {
    console.log(`error: ${adversarialOutcome.errorMessage}`);
  }
  if (adversarialOutcome.output) {
    console.log(JSON.stringify(adversarialOutcome.output, null, 2));
  }

  const verdict = decideEventVerdict({
    verification: verificationOutcome.output,
    adversarial: adversarialOutcome.output,
  });
  console.log(
    `\n[verify] final verdict: ${verdict.status} (confidence=${verdict.finalConfidence}), ` +
      `total cost~=$${(verificationCost + adversarialCost).toFixed(4)}. Nothing written to any DB.`,
  );
}

async function liveRun() {
  const { db } = await import("@/db/client");
  const { events, sourceItems, claims, evidence, agentRuns, auditLogs, sources } = await import(
    "@/db/schema"
  );
  const { eq, gte, sql } = await import("drizzle-orm");

  const allCandidates = await db.select().from(events).where(eq(events.status, "candidate"));
  if (allCandidates.length === 0) {
    console.log("[verify] no candidate events — run `npm run radar:once` first.");
    return;
  }

  const limitArgIndex = process.argv.indexOf("--limit");
  const limit =
    limitArgIndex !== -1 ? Number(process.argv[limitArgIndex + 1]) : undefined;
  const candidates =
    limit && Number.isFinite(limit) && limit > 0 ? allCandidates.slice(0, limit) : allCandidates;

  if (limit) {
    console.log(`[verify] --limit ${limit}: processing ${candidates.length} of ${allCandidates.length} candidate event(s)`);
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const spentRows = await db
    .select({ cost: agentRuns.costEstimateUsd })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, todayStart));
  let spentTodayUsd = spentRows.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);

  console.log(`[verify] ${candidates.length} candidate event(s), $${spentTodayUsd.toFixed(4)} spent today so far`);

  for (const event of candidates) {
    if (!isUnderDailyCap({ spentTodayUsd, capUsd: DAILY_CAP_USD })) {
      console.log(`[verify] daily cost cap ($${DAILY_CAP_USD}) reached — stopping.`);
      break;
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

    if (items.length === 0) {
      console.log(`[verify] event ${event.id} has no source_items — skipping`);
      continue;
    }

    const evidenceInputs: EvidenceInput[] = items.map((item, index) => ({
      index,
      sourceName: item.sourceName,
      title: item.title,
      summary: item.summary ?? "",
      url: item.url,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
    }));

    const verificationOutcome = await runVerification({
      event: { title: event.title, category: event.category },
      sources: evidenceInputs,
    });

    const verificationCost = estimateCostUsd({
      model: verificationOutcome.model,
      inputTokens: verificationOutcome.inputTokens,
      outputTokens: verificationOutcome.outputTokens,
    });
    spentTodayUsd += verificationCost;

    await db.insert(agentRuns).values({
      eventId: event.id,
      agentType: "verification",
      model: verificationOutcome.model,
      status: verificationOutcome.status,
      output: verificationOutcome.output,
      errorMessage: verificationOutcome.errorMessage,
      inputTokens: verificationOutcome.inputTokens,
      outputTokens: verificationOutcome.outputTokens,
      costEstimateUsd: verificationCost.toFixed(4),
      startedAt: verificationOutcome.startedAt,
      finishedAt: verificationOutcome.finishedAt,
    });

    await db.insert(auditLogs).values({
      entityType: "event",
      entityId: event.id,
      action: "verification_run",
      actorType: "agent",
      details: { status: verificationOutcome.status, errorMessage: verificationOutcome.errorMessage },
    });

    if (verificationOutcome.status === "error" || !verificationOutcome.output) {
      console.log(`[verify] event ${event.id} verification failed: ${verificationOutcome.errorMessage}`);
      continue; // stays 'candidate' — see MASTER_PROMPT section 34
    }

    const verification = verificationOutcome.output;

    for (const claim of verification.claims) {
      const [createdClaim] = await db
        .insert(claims)
        .values({
          eventId: event.id,
          text: claim.claimText,
          category: claim.category,
          status: claim.status,
          confidence: claim.confidence,
        })
        .returning({ id: claims.id });
      if (!createdClaim) continue;

      for (const ex of claim.supportingExcerpts) {
        const sourceItem = items[ex.sourceIndex];
        if (!sourceItem) continue; // model referenced an index we never provided — drop it, don't guess
        await db.insert(evidence).values({
          claimId: createdClaim.id,
          sourceItemId: sourceItem.id,
          excerpt: ex.excerpt,
          stance: ex.stance,
        });
      }
    }

    let adversarialOutput: AdversarialResult | null = null;

    if (
      isUnderPerEventCap({ spentOnEventUsd: verificationCost, capUsd: PER_EVENT_CAP_USD }) &&
      isUnderDailyCap({ spentTodayUsd, capUsd: DAILY_CAP_USD })
    ) {
      const adversarialOutcome = await runAdversarial({
        event: { title: event.title, category: event.category },
        sources: evidenceInputs,
        verification,
      });

      const adversarialCost = estimateCostUsd({
        model: adversarialOutcome.model,
        inputTokens: adversarialOutcome.inputTokens,
        outputTokens: adversarialOutcome.outputTokens,
      });
      spentTodayUsd += adversarialCost;

      await db.insert(agentRuns).values({
        eventId: event.id,
        agentType: "adversarial",
        model: adversarialOutcome.model,
        status: adversarialOutcome.status,
        output: adversarialOutcome.output,
        errorMessage: adversarialOutcome.errorMessage,
        inputTokens: adversarialOutcome.inputTokens,
        outputTokens: adversarialOutcome.outputTokens,
        costEstimateUsd: adversarialCost.toFixed(4),
        startedAt: adversarialOutcome.startedAt,
        finishedAt: adversarialOutcome.finishedAt,
      });

      if (adversarialOutcome.status === "success") {
        adversarialOutput = adversarialOutcome.output;
      }
    } else {
      console.log(`[verify] event ${event.id}: skipping adversarial pass — cost cap reached`);
    }

    const verdict = decideEventVerdict({
      verification: {
        overallConfidence: verification.overallConfidence,
        insufficientCorroboration: verification.insufficientCorroboration,
        claims: verification.claims,
      },
      adversarial: adversarialOutput,
    });

    await db
      .update(events)
      .set({ status: verdict.status, confidenceInternal: verdict.finalConfidence, updatedAt: sql`now()` })
      .where(eq(events.id, event.id));

    await db.insert(auditLogs).values({
      entityType: "event",
      entityId: event.id,
      action: "verdict_decided",
      actorType: "agent",
      details: {
        status: verdict.status,
        finalConfidence: verdict.finalConfidence,
        concerns: adversarialOutput?.concerns ?? [],
      },
    });

    console.log(`[verify] event ${event.id} -> ${verdict.status} (confidence=${verdict.finalConfidence})`);
  }

  console.log(`[verify] done. Spent today (est.): $${spentTodayUsd.toFixed(4)} / $${DAILY_CAP_USD} cap`);
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
    console.error("[verify] fatal:", err);
    process.exit(1);
  });
