"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { articles } from "@/db/schema";

/**
 * ASSISTED mode's human-approval step (MASTER_PROMPT section 11). Only
 * moves articles that are still draft/review — never re-approves something
 * already approved/published, and never touches a rejected/archived one.
 * No auth yet (see CLAUDE.md — Security): this is safe only because
 * nothing here is deployed.
 */
export async function approveEventArticles(eventId: string) {
  await db
    .update(articles)
    .set({ status: "approved" })
    .where(and(eq(articles.eventId, eventId), inArray(articles.status, ["draft", "review"])));

  revalidatePath("/admin/articles");
}
