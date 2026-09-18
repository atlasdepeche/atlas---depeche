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

export type EventVerdictStatus = "verified" | "rejected" | "candidate";

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
 *   rejected   a high-severity adversarial break, or most claims contradicted
 *   verified   confidence at/above threshold AND corroboration is sufficient
 *   candidate  anything else — stays pending, more sourcing needed
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

  const contradictedCount = params.verification.claims.filter(
    (c) => c.status === "contradicted",
  ).length;
  const mostlyContradicted =
    params.verification.claims.length > 0 &&
    contradictedCount > params.verification.claims.length / 2;

  if (hasHighSeverityBreak || mostlyContradicted) {
    return { status: "rejected", finalConfidence };
  }

  if (!params.verification.insufficientCorroboration && finalConfidence >= threshold) {
    return { status: "verified", finalConfidence };
  }

  return { status: "candidate", finalConfidence };
}
