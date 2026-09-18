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

// --- source lineage (architecture add-on Addition 1, 2026-09-18) -----------

export interface LineageCandidateItem {
  id: string;
  title: string;
  summary: string | null;
}

export type SourceLineageType = "original" | "same_wire_copy";

export interface SourceLineageClassification {
  lineageType: SourceLineageType;
  derivedFromSourceItemId: string | null;
}

function normalizeForLineage(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Corroboration must measure genuine source independence, not raw item
 * count (architecture add-on Addition 1: "two URLs must NOT automatically
 * count as two independent sources"). This is a deliberately conservative,
 * non-AI heuristic: it only flags an EXACT match (title + summary,
 * normalized) against an item already attached to the same event as a
 * likely wire copy or straight republish. It will miss a paraphrased
 * republish of the same wire story — that's a real limitation, not
 * silently claimed to be solved; a looser or AI-judged similarity check is
 * future work, not pretended to already exist. Everything that doesn't
 * exactly match is classified "original" — including two outlets that
 * independently reported the same real event in their own words, which
 * genuinely IS independent corroboration.
 */
export function classifySourceLineage(params: {
  newItem: { title: string; summary: string | null };
  existingItems: readonly LineageCandidateItem[];
}): SourceLineageClassification {
  const newNorm = normalizeForLineage(`${params.newItem.title} ${params.newItem.summary ?? ""}`);

  if (newNorm.length > 0) {
    for (const existing of params.existingItems) {
      const existingNorm = normalizeForLineage(`${existing.title} ${existing.summary ?? ""}`);
      if (existingNorm === newNorm) {
        return { lineageType: "same_wire_copy", derivedFromSourceItemId: existing.id };
      }
    }
  }

  return { lineageType: "original", derivedFromSourceItemId: null };
}
