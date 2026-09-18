/**
 * Phase 6 — careful automation. MASTER_PROMPT section 41 is explicit:
 * "allowlist categories only ... HUMAN-ONLY matrix enforced in code, kill
 * switch" and "Never skip to Phase 6 to look fast." As of 2026-09-18 this
 * product has never published a single real verified article, so every
 * gate below defaults to OFF — flipping AUTOMATED mode on for real is a
 * deliberate operator decision (env vars), not a code change.
 *
 * Two independent paths can qualify an event, both still subject to the
 * kill switch and the permanent human-only list:
 *   1. Category path  — the category itself is inherently low-stakes
 *      (weather, sports scores) — MASTER_PROMPT's own Phase 6 examples.
 *   2. Confidence path — ANY category (except human-only) where
 *      verification landed very high confidence AND the Adversarial Agent
 *      found zero concerns (not just no *high-severity* ones — zero).
 *      Added 2026-09-18 at the operator's request, to cut manual review
 *      load for the events the pipeline is most sure about, while still
 *      routing anything with real doubt to a human. See CLAUDE.md.
 */

// Section 35 hard bans + section 40 out-of-scope: these topics can NEVER
// be automated, no matter what the category allowlist or confidence says
// below. This is a permanent list, not operator-configurable via env —
// changing it is a code change, on purpose.
export const HUMAN_ONLY_CATEGORIES: ReadonlySet<string> = new Set([
  "politics",
  "justice",
  "security",
  "diplomacy",
]);

const DEFAULT_MIN_CONFIDENCE = 90;

/**
 * The only categories AUTOMATED mode may apply to regardless of
 * confidence, e.g. "weather". Empty (nothing automated via this path)
 * unless the operator explicitly sets AUTOMATED_CATEGORIES.
 */
export function getAutomatedCategoryAllowlist(): ReadonlySet<string> {
  return new Set(
    (process.env.AUTOMATED_CATEGORIES ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  );
}

/** Minimum confidence for the confidence-based path. Defaults high on purpose. */
export function getAutomatedMinConfidence(): number {
  const raw = Number(process.env.AUTOMATED_MIN_CONFIDENCE);
  return Number.isFinite(raw) ? raw : DEFAULT_MIN_CONFIDENCE;
}

/**
 * The master kill switch. Automation is OFF unless this env var is set to
 * exactly "false" — an unset, misspelled, or empty value all mean killed.
 * This is the one flag to flip (or never flip) regardless of what the
 * category allowlist or confidence path say.
 */
export function isAutomationKilled(): boolean {
  return process.env.AUTOMATION_KILL_SWITCH !== "false";
}

export function isHumanOnlyCategory(category: string): boolean {
  return HUMAN_ONLY_CATEGORIES.has(category);
}

/** Path 1: category itself is on the low-stakes allowlist. */
export function canAutomate(
  category: string,
  allowlist: ReadonlySet<string> = getAutomatedCategoryAllowlist(),
): boolean {
  if (isAutomationKilled()) return false;
  if (isHumanOnlyCategory(category)) return false;
  return allowlist.has(category);
}

/**
 * Path 2: any non-human-only category, but only with very high confidence
 * AND a clean adversarial pass. `adversarialConcernCount` must be exactly
 * 0 — `null` (adversarial never ran, e.g. skipped for cost) is NOT
 * treated as clean, it's treated as "unknown," which fails this path.
 */
export function canAutomateByConfidence(params: {
  category: string;
  confidence: number | null;
  adversarialConcernCount: number | null;
  minConfidence?: number;
}): boolean {
  if (isAutomationKilled()) return false;
  if (isHumanOnlyCategory(params.category)) return false;
  if (params.confidence == null) return false;
  if (params.adversarialConcernCount !== 0) return false;
  const threshold = params.minConfidence ?? getAutomatedMinConfidence();
  return params.confidence >= threshold;
}

/** The combined Phase 6 decision write.ts actually uses: either path qualifies. */
export function shouldAutomate(params: {
  category: string;
  confidence: number | null;
  adversarialConcernCount: number | null;
}): boolean {
  return canAutomate(params.category) || canAutomateByConfidence(params);
}
