/**
 * MASTER_PROMPT section 38: "hard cap per event and per day... if budget
 * exhausted: stop generation, keep ingest + alerts." Pure functions so the
 * caps are testable without a live API key or DB.
 */

// USD per 1M tokens. Keep in sync with the Claude API pricing table — see
// the claude-api skill / https://www.anthropic.com/pricing for current
// rates; this can drift, so an unknown model returns 0 rather than a wrong
// guess (see estimateCostUsd).
const PRICING_USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Returns 0 for an unrecognized model — callers must not treat 0 as "free". */
export function estimateCostUsd(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): number {
  const pricing = PRICING_USD_PER_MTOK[params.model];
  if (!pricing) return 0;
  return (
    (params.inputTokens / 1_000_000) * pricing.input +
    (params.outputTokens / 1_000_000) * pricing.output
  );
}

export function isUnderDailyCap(params: { spentTodayUsd: number; capUsd: number }): boolean {
  return params.spentTodayUsd < params.capUsd;
}

export function isUnderPerEventCap(params: {
  spentOnEventUsd: number;
  capUsd: number;
}): boolean {
  return params.spentOnEventUsd < params.capUsd;
}
