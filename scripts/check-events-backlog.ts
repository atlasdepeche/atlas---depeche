import "dotenv/config";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const byStatus = await db
    .select({ status: events.status, count: sql<number>`count(*)::int` })
    .from(events)
    .groupBy(events.status);

  console.log("=== events by status ===");
  for (const row of byStatus) console.log(`${row.status}: ${row.count}`);

  const oldestCandidates = await db
    .select({ id: events.id, title: events.title, detectedAt: events.detectedAt, category: events.category })
    .from(events)
    .where(sql`status = 'candidate'`)
    .orderBy(sql`detected_at asc`)
    .limit(5);

  console.log("\n=== 5 oldest still-candidate events ===");
  for (const e of oldestCandidates) {
    console.log(`detected=${e.detectedAt.toISOString()} [${e.category}] ${e.title}`);
  }

  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
