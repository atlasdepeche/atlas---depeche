"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { articles, articleVersions, auditLogs, events } from "@/db/schema";
import { transitionEvent } from "@/lib/event-state-machine";

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

  // confirmed -> published on the event itself — the human-approval
  // equivalent of write.ts's automated-path transition. A second approval
  // click (nothing left to move) correctly no-ops here.
  await transitionEvent({
    db,
    eventId,
    from: "confirmed",
    to: "published",
    actorType: "human",
    reason: "approved in /admin/articles",
  });

  revalidatePath("/admin/articles");
  revalidatePath("/[locale]", "layout");
}

/**
 * Right-of-reply / corrections as a first-class CMS state — MASTER_PROMPT
 * section 36. Only touches an article that is already published/corrected
 * (never silently "corrects" a draft — that's just editing). Every
 * correction is versioned (article_versions) and logged (audit_logs) with
 * the previous text, so nothing is corrected silently — see
 * docs — legal/corrections page describes this same workflow publicly.
 */
export async function correctArticle(articleId: string, formData: FormData) {
  const newTitle = formData.get("title");
  const newBody = formData.get("body");
  if (typeof newTitle !== "string" || typeof newBody !== "string" || !newTitle.trim() || !newBody.trim()) {
    return;
  }

  const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!article || (article.status !== "published" && article.status !== "corrected")) {
    return;
  }

  const [versionRow] = await db
    .select({ maxVersion: sql<number>`coalesce(max(${articleVersions.version}), 0)` })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId));

  await db.insert(articleVersions).values({
    articleId,
    version: (versionRow?.maxVersion ?? 0) + 1,
    title: newTitle,
    body: newBody,
    editedBy: "human",
  });

  await db
    .update(articles)
    .set({ title: newTitle, body: newBody, status: "corrected", updatedAt: sql`now()` })
    .where(eq(articles.id, articleId));

  await db.insert(auditLogs).values({
    entityType: "article",
    entityId: articleId,
    action: "corrected",
    actorType: "human",
    details: { previousTitle: article.title, previousBody: article.body },
  });

  // published -> updated the first correction; updated -> updated (a valid
  // self-loop, see event-state-machine.ts) every correction after that —
  // read the event's current status rather than assume, since a second
  // correction on the same event would otherwise try an illegal
  // published -> updated transition it's no longer in.
  const [currentEvent] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, article.eventId))
    .limit(1);
  if (currentEvent) {
    await transitionEvent({
      db,
      eventId: article.eventId,
      from: currentEvent.status === "updated" ? "updated" : "published",
      to: "updated",
      actorType: "human",
      reason: "article corrected",
    });
  }

  revalidatePath("/admin/articles");
  revalidatePath("/[locale]", "layout");
}
