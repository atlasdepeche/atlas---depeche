import "dotenv/config";
import { db } from "@/db/client";
import { socialPosts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const rows = await db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.channel, "facebook"))
    .orderBy(desc(socialPosts.createdAt));

  console.log(`=== ${rows.length} facebook social_posts rows ===`);
  for (const r of rows) {
    console.log(
      `status=${r.status} articleId=${r.articleId} postedAt=${r.postedAt?.toISOString() ?? "null"} ` +
        `url=${r.externalUrl ?? "none"} error=${r.errorMessage ?? "none"}`,
    );
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
