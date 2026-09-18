import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { agentRuns, articles, events, socialPosts } from "@/db/schema";
import {
  getAutomatedCategoryAllowlist,
  isAutomationKilled,
} from "@/lib/automation-policy";

/**
 * Cost + latency dashboard — MASTER_PROMPT section 32/33: answer "why
 * published / why not" and "what is this costing" from the DB. Dev-only,
 * unauthenticated (see CLAUDE.md — Security).
 */
export const dynamic = "force-dynamic";

async function getCostByAgentType() {
  return db
    .select({
      agentType: agentRuns.agentType,
      runs: sql<number>`count(*)`,
      errors: sql<number>`count(*) filter (where ${agentRuns.status} = 'error')`,
      totalCostUsd: sql<string>`coalesce(sum(${agentRuns.costEstimateUsd}), 0)`,
    })
    .from(agentRuns)
    .groupBy(agentRuns.agentType);
}

async function getEventDecisionLatencies() {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      status: events.status,
      confidenceInternal: events.confidenceInternal,
      detectedAt: events.detectedAt,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(sql`${events.status} != 'candidate'`)
    .orderBy(desc(events.updatedAt))
    .limit(50);

  return rows.map((r) => ({
    ...r,
    verificationLatencyMs: r.updatedAt.getTime() - r.detectedAt.getTime(),
  }));
}

async function getPublishedArticleLatencies() {
  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      locale: articles.locale,
      createdAt: articles.createdAt,
      publishedAt: articles.publishedAt,
      eventDetectedAt: events.detectedAt,
    })
    .from(articles)
    .innerJoin(events, eq(articles.eventId, events.id))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));

  return rows
    .filter((r) => r.publishedAt !== null)
    .map((r) => ({
      ...r,
      writingToPublishMs: r.publishedAt!.getTime() - r.createdAt.getTime(),
      totalLatencyMs: r.publishedAt!.getTime() - r.eventDetectedAt.getTime(),
    }));
}

async function getDistributionSummary() {
  return db
    .select({
      channel: socialPosts.channel,
      status: socialPosts.status,
      count: sql<number>`count(*)`,
    })
    .from(socialPosts)
    .groupBy(socialPosts.channel, socialPosts.status);
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

export default async function AnalyticsPage() {
  const [costs, eventLatencies, articleLatencies, distribution] = await Promise.all([
    getCostByAgentType(),
    getEventDecisionLatencies(),
    getPublishedArticleLatencies(),
    getDistributionSummary(),
  ]);

  const totalCost = costs.reduce((sum, c) => sum + Number(c.totalCostUsd), 0);
  const automationKilled = isAutomationKilled();
  const automatedCategories = Array.from(getAutomatedCategoryAllowlist());

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1000 }}>
      <h1>Analytics — cost &amp; latency</h1>
      <p>Dev-only, unauthenticated.</p>

      <h2>Automation (Phase 6)</h2>
      <p
        style={{
          padding: "0.75rem 1rem",
          borderRadius: 6,
          background: automationKilled ? "#e6f4ea" : "#fdecea",
          color: automationKilled ? "#1e7a34" : "#a01c1c",
          fontWeight: 600,
        }}
      >
        Kill switch: {automationKilled ? "ON — automation disabled" : "OFF — automation is live"}
      </p>
      <p>
        Allowlisted categories: {automatedCategories.length > 0 ? automatedCategories.join(", ") : "(none)"}
      </p>

      <h2>Agent cost (all-time)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Agent</th>
            <th>Runs</th>
            <th>Errors</th>
            <th>Total cost</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((c) => (
            <tr key={c.agentType} style={{ borderBottom: "1px solid #eee" }}>
              <td>{c.agentType}</td>
              <td>{c.runs}</td>
              <td>{c.errors}</td>
              <td>${Number(c.totalCostUsd).toFixed(4)}</td>
            </tr>
          ))}
          {costs.length === 0 && (
            <tr>
              <td colSpan={4}>No agent runs yet.</td>
            </tr>
          )}
        </tbody>
        {costs.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3} style={{ fontWeight: "bold" }}>
                Total
              </td>
              <td style={{ fontWeight: "bold" }}>${totalCost.toFixed(4)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      <h2 style={{ marginTop: "2rem" }}>Verification latency (detected → decided, last 50)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Event</th>
            <th>Status</th>
            <th>Confidence</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {eventLatencies.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{e.title}</td>
              <td>{e.status}</td>
              <td>{e.confidenceInternal ?? "?"}%</td>
              <td>{formatMs(e.verificationLatencyMs)}</td>
            </tr>
          ))}
          {eventLatencies.length === 0 && (
            <tr>
              <td colSpan={4}>No decided events yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Publication latency (published articles)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Article</th>
            <th>Locale</th>
            <th>Draft → published</th>
            <th>Detected → published (total)</th>
          </tr>
        </thead>
        <tbody>
          {articleLatencies.map((a) => (
            <tr key={a.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{a.title}</td>
              <td>{a.locale}</td>
              <td>{formatMs(a.writingToPublishMs)}</td>
              <td>{formatMs(a.totalLatencyMs)}</td>
            </tr>
          ))}
          {articleLatencies.length === 0 && (
            <tr>
              <td colSpan={4}>No published articles yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Distribution</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Channel</th>
            <th>Status</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {distribution.map((d) => (
            <tr key={`${d.channel}-${d.status}`} style={{ borderBottom: "1px solid #eee" }}>
              <td>{d.channel}</td>
              <td>{d.status}</td>
              <td>{d.count}</td>
            </tr>
          ))}
          {distribution.length === 0 && (
            <tr>
              <td colSpan={3}>No distribution attempts yet — run `npm run distribute:once`.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
