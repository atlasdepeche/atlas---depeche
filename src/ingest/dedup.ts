const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h — see MASTER_PROMPT section 8/10

export interface DedupCandidateEvent {
  id: string;
  fingerprint: string;
  detectedAt: Date;
}

export type DedupDecision =
  | { action: "attach"; eventId: string }
  | { action: "create" };

/**
 * Decides whether a newly-ingested item belongs to an existing recent event
 * (same fingerprint, still inside the dedup window) or should start a new
 * one. Pure function — the worker is responsible for fetching
 * `recentEvents` from the DB (same category, fingerprint set, detected
 * within the window) and for persisting the decision.
 */
export function decideDedup(params: {
  fingerprint: string;
  now: Date;
  recentEvents: readonly DedupCandidateEvent[];
}): DedupDecision {
  const match = params.recentEvents.find(
    (event) =>
      event.fingerprint === params.fingerprint &&
      params.now.getTime() - event.detectedAt.getTime() <= DEDUP_WINDOW_MS,
  );

  if (match) {
    return { action: "attach", eventId: match.id };
  }

  return { action: "create" };
}
