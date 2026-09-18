/**
 * Phase 6 — careful automation. MASTER_PROMPT section 41 is explicit:
 * "allowlist categories only ... HUMAN-ONLY matrix enforced in code, kill
 * switch" and "Never skip to Phase 6 to look fast." As of 2026-09-18 this
 * product has never published a single real verified article, so every
 * gate below defaults to OFF — flipping AUTOMATED mode on for real is a
 * deliberate operator decision (env vars), not a code change.
 */

// Section 35 hard bans + section 40 out-of-scope: these topics can NEVER
// be automated, no matter what the category allowlist says below. This is
// a permanent list, not operator-configurable via env — changing it is a
// code change, on purpose.
export const HUMAN_ONLY_CATEGORIES: ReadonlySet<string> = new Set([
  "politics",
  "justice",
  "security",
  "diplomacy",
]);

/**
 * The only categories AUTOMATED mode may ever apply to, e.g. "weather".
 * Per MASTER_PROMPT section 41: "weather bulletin, official agenda,
 * sports score from official federation" — deliberately boring, deliberately
 * not politics. Empty (nothing automated) unless the operator explicitly
 * sets AUTOMATED_CATEGORIES in the environment.
 */
export function getAutomatedCategoryAllowlist(): ReadonlySet<string> {
  return new Set(
    (process.env.AUTOMATED_CATEGORIES ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  );
}

/**
 * The master kill switch. Automation is OFF unless this env var is set to
 * exactly "false" — an unset, misspelled, or empty value all mean killed.
 * This is the one flag to flip (or never flip) regardless of what the
 * category allowlist says.
 */
export function isAutomationKilled(): boolean {
  return process.env.AUTOMATION_KILL_SWITCH !== "false";
}

export function isHumanOnlyCategory(category: string): boolean {
  return HUMAN_ONLY_CATEGORIES.has(category);
}

/**
 * The actual Phase 6 decision. All three gates must pass: kill switch
 * off, category not permanently human-only, category on the allowlist.
 */
export function canAutomate(
  category: string,
  allowlist: ReadonlySet<string> = getAutomatedCategoryAllowlist(),
): boolean {
  if (isAutomationKilled()) return false;
  if (isHumanOnlyCategory(category)) return false;
  return allowlist.has(category);
}
