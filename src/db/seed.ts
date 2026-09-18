import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { sources } from "./schema";
import { SEED_SOURCES } from "./seed-sources";

async function main() {
  console.log(`[seed] upserting ${SEED_SOURCES.length} sources...`);

  for (const source of SEED_SOURCES) {
    await db
      .insert(sources)
      .values({
        name: source.name,
        type: source.type,
        url: source.url,
        language: source.language,
        category: source.category,
        status: source.status,
        robotsPolicy: source.robotsPolicy,
        tosNotes: source.tosNotes,
      })
      .onConflictDoUpdate({
        target: sources.url,
        set: {
          name: source.name,
          type: source.type,
          language: source.language,
          category: source.category,
          status: source.status,
          robotsPolicy: source.robotsPolicy,
          tosNotes: source.tosNotes,
          updatedAt: sql`now()`,
        },
      });
  }

  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
