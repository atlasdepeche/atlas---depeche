import "dotenv/config";
import { db } from "@/db/client";
import { sourceItems, sources } from "@/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  const now = new Date();
  console.log("Now:", now.toISOString());

  const recent = await db
    .select({
      id: sourceItems.id,
      title: sourceItems.title,
      fetchedAt: sourceItems.fetchedAt,
      publishedAt: sourceItems.publishedAt,
      sourceId: sourceItems.sourceId,
    })
    .from(sourceItems)
    .orderBy(desc(sourceItems.fetchedAt))
    .limit(10);

  console.log("\n=== 10 most recently fetched source_items ===");
  for (const r of recent) {
    console.log(`fetchedAt=${r.fetchedAt?.toISOString()} published=${r.publishedAt?.toISOString() ?? "null"} title="${r.title}"`);
  }

  const srcs = await db
    .select({
      id: sources.id,
      name: sources.name,
      status: sources.status,
      lastSuccessAt: sources.lastSuccessAt,
      lastErrorAt: sources.lastErrorAt,
      lastErrorMessage: sources.lastErrorMessage,
    })
    .from(sources);

  console.log("\n=== sources status ===");
  for (const s of srcs) {
    console.log(
      `[${s.status}] ${s.name} — lastSuccess=${s.lastSuccessAt?.toISOString() ?? "never"} lastError=${s.lastErrorAt?.toISOString() ?? "none"}${s.lastErrorMessage ? " (" + s.lastErrorMessage.slice(0, 80) + ")" : ""}`,
    );
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
