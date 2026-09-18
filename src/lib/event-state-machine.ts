import { and, eq, sql } from "drizzle-orm";
import { events, auditLogs } from "@/db/schema";
import type { db as DbType } from "@/db/client";

/**
 * Event Event Model — extended per the 2026-09-18 architecture add-on,
 * Addition 2 ("Event State Machine"). Only `candidate`, `verifying`,
 * `confirmed` (this project's spelling of the add-on's CONFIRMED — was
 * "verified" before this add-on; renamed for one consistent vocabulary),
 * `conflicted`, and `rejected` are actually set by verify.ts today;
 * `published`/`updated` are set by the write/CMS layer. `resolved`,
 * `superseded`, and `archived` are real, intentional states with defined
 * transitions below, but no code path sets them yet — they're reserved for
 * the future Story Evolution Engine (add-on Addition 10) and Contradiction
 * Engine (Addition 3) follow-up work. Declaring them now (without faking
 * detection logic that doesn't exist) is the add-on's own Addition 15:
 * "architectural ownership is established now" — implementation is phased.
 *
 * No separate DETECTED state: `events.detectedAt` already timestamps the
 * moment a row is created, and every row's mere existence at status
 * "candidate" already means "detected" — a distinct DB state would carry
 * no information detectedAt doesn't already have. Documented deliberate
 * scope decision, not an oversight.
 */
export const EVENT_STATES = [
  "candidate",
  "verifying",
  "confirmed",
  "conflicted",
  "rejected",
  "published",
  "updated",
  "resolved",
  "superseded",
  "archived",
] as const;

export type EventState = (typeof EVENT_STATES)[number];

/**
 * The only legal transitions. Anything not listed here is refused by
 * `transitionEvent` — this is what Addition 2 means by "no silent
 * promotion from an unverified event to a confirmed or published event."
 * Self-loops are only listed where they carry real meaning (an event can
 * be updated more than once); everywhere else a no-op "transition" to the
 * same state is rejected on purpose, to force every status write to be a
 * deliberate decision.
 */
export const EVENT_TRANSITIONS: Record<EventState, readonly EventState[]> = {
  // candidate -> published (skipping verifying/confirmed) is the one
  // deliberate exception: MASTER_PROMPT's HUMAN_ONLY mode lets a human
  // write and publish directly from a raw event without the AI
  // verification pass — added 2026-09-18 for src/app/(admin)/admin/
  // articles/actions.ts's createManualArticle. Every other path still
  // goes candidate -> verifying -> confirmed -> published.
  candidate: ["verifying", "rejected", "archived", "published"],
  verifying: ["confirmed", "conflicted", "rejected", "candidate"],
  confirmed: ["published", "superseded", "archived", "rejected"],
  conflicted: ["confirmed", "rejected", "candidate", "archived"],
  rejected: ["archived"],
  published: ["updated", "superseded", "archived"],
  updated: ["updated", "superseded", "archived"],
  resolved: ["archived"],
  superseded: ["archived"],
  archived: [],
};

export function isValidEventTransition(from: EventState, to: EventState): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}

export type TransitionEventResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * The only sanctioned way to change `events.status`. Validates the edge
 * against EVENT_TRANSITIONS, then does a conditional update
 * (`WHERE status = from`) so a stale in-memory read can never silently
 * clobber a transition someone else already made — if the row didn't
 * match, `ok: false` comes back and the caller should treat that as "this
 * event was already handled," not retry blindly. Every successful
 * transition is recorded in the existing `audit_logs` table (entityType
 * "event", action "state_transition") — reusing that table on purpose,
 * per the add-on's own Addition 17: "do not create duplicate ...
 * observability systems."
 */
export async function transitionEvent(params: {
  db: typeof DbType;
  eventId: string;
  from: EventState;
  to: EventState;
  actorType: "agent" | "human" | "system";
  reason?: string;
  extraFields?: Record<string, unknown>;
}): Promise<TransitionEventResult> {
  const { db, eventId, from, to, actorType, reason, extraFields } = params;

  if (!isValidEventTransition(from, to)) {
    return { ok: false, error: `illegal event transition: ${from} -> ${to}` };
  }

  const updated = await db
    .update(events)
    .set({ status: to, updatedAt: sql`now()`, ...extraFields })
    .where(and(eq(events.id, eventId), eq(events.status, from)))
    .returning({ id: events.id });

  if (updated.length === 0) {
    return {
      ok: false,
      error: `event ${eventId} was not in status "${from}" when the transition to "${to}" was attempted — already handled elsewhere`,
    };
  }

  await db.insert(auditLogs).values({
    entityType: "event",
    entityId: eventId,
    action: "state_transition",
    actorType,
    details: { from, to, reason: reason ?? null },
  });

  return { ok: true };
}
