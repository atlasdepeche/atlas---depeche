import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client";
import { gazetteerEntries, sources } from "./schema";
import { SEED_SOURCES } from "./seed-sources";
import { SEED_GAZETTEER } from "./seed-gazetteer";

async function seedSources() {
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
}

async function seedGazetteer() {
  console.log(`[seed] upserting ${SEED_GAZETTEER.length} gazetteer entries...`);
  for (const entry of SEED_GAZETTEER) {
    await db
      .insert(gazetteerEntries)
      .values({
        type: entry.type,
        nameAr: entry.nameAr,
        nameFr: entry.nameFr,
        aliases: entry.aliases ?? [],
        verified: entry.verified,
        notes: entry.notes,
      })
      .onConflictDoUpdate({
        target: [gazetteerEntries.type, gazetteerEntries.nameFr],
        set: {
          nameAr: entry.nameAr,
          aliases: entry.aliases ?? [],
          verified: entry.verified,
          notes: entry.notes,
        },
      });
  }
}

async function main() {
  await seedSources();
  await seedGazetteer();
  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
