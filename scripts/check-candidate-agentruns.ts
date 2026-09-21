import "dotenv/config";
import { db } from "@/db/client";
import { events, agentRuns } from "@/db/schema";
import { sql, eq, and, lt } from "drizzle-orm";

async function main() {
  const [withRuns] = await db
    .select({ count: sql<number>`count(distinct ${events.id})::int` })
    .from(events)
    .innerJoin(agentRuns, eq(agentRuns.eventId, events.id))
    .where(eq(events.status, "candidate"));

  console.log("candidate events WITH agent_runs (real spend):", withRuns?.count ?? 0);

  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(eq(events.status, "candidate"));
  console.log("candidate events total:", total?.count ?? 0);

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [oldNoRuns] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(and(eq(events.status, "candidate"), lt(events.detectedAt, cutoff)));
  console.log(`candidate events older than 24h (cutoff ${cutoff.toISOString()}):`, oldNoRuns?.count ?? 0);

  const oldWithoutRuns = await db
    .select({ id: events.id })
    .from(events)
    .leftJoin(agentRuns, eq(agentRuns.eventId, events.id))
    .where(and(eq(events.status, "candidate"), lt(events.detectedAt, cutoff), sql`${agentRuns.id} is null`));
  console.log("candidate events older than 24h WITHOUT agent_runs (safe to delete):", oldWithoutRuns.length);

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
