"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { sourceItems } from "@/db/schema";

/**
 * Removes one item from the public aggregator (and the Instagram-eligible
 * pool, since both read getFilteredRadarItems — src/lib/public-site.ts).
 * Sets hiddenAt rather than deleting the row: keeps history (including
 * any social_posts row if it was already posted to Instagram — that post
 * itself isn't retracted, only future eligibility) instead of losing the
 * record entirely.
 */
export async function hideSourceItem(id: string) {
  await db.update(sourceItems).set({ hiddenAt: sql`now()` }).where(eq(sourceItems.id, id));

  revalidatePath("/admin/moderate");
  revalidatePath("/[locale]", "layout");
}
