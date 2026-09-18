"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { articles } from "@/db/schema";

/**
 * ASSISTED mode's human-approval step (MASTER_PROMPT section 11) — and,
 * for v0, the publish gate itself: in ASSISTED mode "prepare content,
 * require human approval" IS the authorization to go live, so approving
 * here sets status "published" + publishedAt directly rather than adding a
 * separate manual publish click. Only moves articles still draft/review —
 * never re-touches anything already approved/published/rejected/archived.
 * No auth yet (see CLAUDE.md — Security): this is safe only because
 * nothing here is deployed.
 */
export async function approveEventArticles(eventId: string) {
  await db
    .update(articles)
    .set({ status: "published", publishedAt: sql`now()` })
    .where(and(eq(articles.eventId, eventId), inArray(articles.status, ["draft", "review"])));

  revalidatePath("/admin/articles");
  revalidatePath("/[locale]", "layout");
}
