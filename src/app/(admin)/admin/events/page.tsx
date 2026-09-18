import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentRuns, claims, events, sourceItems, sources } from "@/db/schema";

/**
 * Internal ops view of radar + verification output. No auth yet (Phase 0's
 * `users`/`roles` work hasn't landed) — this is only safe because nothing
 * in this repo is deployed. Do not deploy this route before Phase 2's auth
 * lands (see CLAUDE.md — Security).
 */
export const dynamic = "force-dynamic";

async function getRecentEvents() {
  return db
    .select({
      id: events.id,
      title: events.title,
      category: events.category,
      status: events.status,
      priority: events.priority,
      confidenceInternal: events.confidenceInternal,
      detectedAt: events.detectedAt,
    })
    .from(events)
    .orderBy(desc(events.detectedAt))
    .limit(50);
}

async function getItemsFor(eventId: string) {
  return db
    .select({
      title: sourceItems.title,
      url: sourceItems.url,
      fetchedAt: sourceItems.fetchedAt,
      sourceName: sources.name,
    })
    .from(sourceItems)
    .innerJoin(sources, eq(sourceItems.sourceId, sources.id))
    .where(eq(sourceItems.eventId, eventId));
}

async function getClaimsFor(eventId: string) {
  return db
    .select({
      text: claims.text,
      status: claims.status,
      confidence: claims.confidence,
    })
    .from(claims)
    .where(eq(claims.eventId, eventId));
}

async function getAgentRunsFor(eventId: string) {
  return db
    .select({
      agentType: agentRuns.agentType,
      status: agentRuns.status,
      errorMessage: agentRuns.errorMessage,
      costEstimateUsd: agentRuns.costEstimateUsd,
    })
    .from(agentRuns)
    .where(eq(agentRuns.eventId, eventId));
}

export default async function AdminEventsPage() {
  const recentEvents = await getRecentEvents();
  const rows = await Promise.all(
    recentEvents.map(async (event) => ({
      event,
      items: await getItemsFor(event.id),
      claims: await getClaimsFor(event.id),
      runs: await getAgentRunsFor(event.id),
    })),
  );

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <h1>Radar — candidate events</h1>
      <p>
        Dev-only, unauthenticated. SHADOW mode: nothing here is published.
        {" "}{recentEvents.length} most recent event(s).
      </p>
      {rows.length === 0 && (
        <p>No events yet — run `npm run radar:once`, then `npm run verify:once`.</p>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Detected</th>
            <th>Category</th>
            <th>Verdict</th>
            <th>Title</th>
            <th>Sources</th>
            <th>Claims (why)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ event, items, claims: eventClaims, runs }) => (
            <tr key={event.id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
              <td>{event.detectedAt.toISOString()}</td>
              <td>{event.category}</td>
              <td>
                {event.status}
                {event.confidenceInternal != null && ` (${event.confidenceInternal}%)`}
                {runs.length === 0 && <div><em>not verified yet</em></div>}
                {runs.map((run, i) => (
                  <div key={i} style={{ fontSize: "0.85em", color: run.status === "error" ? "#b00" : "#666" }}>
                    {run.agentType}: {run.status}
                    {run.errorMessage && ` — ${run.errorMessage}`}
                    {run.costEstimateUsd && ` ($${run.costEstimateUsd})`}
                  </div>
                ))}
              </td>
              <td>{event.title}</td>
              <td>
                {items.map((item) => (
                  <div key={item.url}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.sourceName}
                    </a>
                  </div>
                ))}
              </td>
              <td>
                {eventClaims.length === 0 && <em>none extracted yet</em>}
                {eventClaims.map((claim, i) => (
                  <div key={i} style={{ fontSize: "0.85em" }}>
                    [{claim.status}{claim.confidence != null ? ` ${claim.confidence}%` : ""}] {claim.text}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
