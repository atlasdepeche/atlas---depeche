const DEFAULT_CONFIDENCE_THRESHOLD = 50;

export interface VerdictVerificationInput {
  overallConfidence: number;
  insufficientCorroboration: boolean;
  claims: { status: string }[];
}

export interface VerdictAdversarialInput {
  concerns: { type: string; severity: string }[];
  confidenceAdjustment: number;
}

// "confirmed" is this project's spelling of the 2026-09-18 architecture
// add-on's CONFIRMED event state (src/lib/event-state-machine.ts) — was
// "verified" before that add-on; renamed for one consistent vocabulary
// across verdict.ts, the event state machine, and the DB.
export type EventVerdictStatus = "confirmed" | "conflicted" | "rejected" | "candidate";

export interface EventVerdict {
  status: EventVerdictStatus;
  finalConfidence: number;
}

const BREAKING_CONCERN_TYPES = new Set(["contradiction", "identity_mixup", "recycled_news"]);

/**
 * Combines the Verification Agent's read and the Adversarial Agent's
 * pushback into one event-level decision. Pure — no DB, no API — so the
 * decision logic is unit-testable on its own (see MASTER_PROMPT section 43:
 * "tests for ... claim linking, publication-mode guards").
 *
 *   rejected    a high-severity adversarial break (contradiction / identity
 *               mixup / recycled news) — the event is judged false or unsafe
 *   conflicted  most claims are contradicted by their own sources, but no
 *               single high-severity break explains it — sources disagree
 *               with each other, not necessarily that the event is false.
 *               Added 2026-09-18 (architecture add-on Addition 3, the
 *               Contradiction Engine's first slice): this used to collapse
 *               into "rejected", which conflated "this didn't happen" with
 *               "our sources don't agree" — a human should resolve this,
 *               not have it silently treated as a false story.
 *   confirmed   confidence at/above threshold AND corroboration is sufficient
 *   candidate   anything else — stays pending, more sourcing needed
 */
export function decideEventVerdict(params: {
  verification: VerdictVerificationInput;
  adversarial: VerdictAdversarialInput | null;
  confidenceThreshold?: number;
}): EventVerdict {
  const threshold = params.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const adjustment = params.adversarial?.confidenceAdjustment ?? 0;
  const finalConfidence = Math.max(
    0,
    Math.min(100, params.verification.overallConfidence + adjustment),
  );

  const hasHighSeverityBreak = (params.adversarial?.concerns ?? []).some(
    (c) => c.severity === "high" && BREAKING_CONCERN_TYPES.has(c.type),
  );

  if (hasHighSeverityBreak) {
    return { status: "rejected", finalConfidence };
  }

  const contradictedCount = params.verification.claims.filter(
    (c) => c.status === "contradicted",
  ).length;
  const mostlyContradicted =
    params.verification.claims.length > 0 &&
    contradictedCount > params.verification.claims.length / 2;

  if (mostlyContradicted) {
    return { status: "conflicted", finalConfidence };
  }

  if (!params.verification.insufficientCorroboration && finalConfidence >= threshold) {
    return { status: "confirmed", finalConfidence };
  }

  return { status: "candidate", finalConfidence };
}
