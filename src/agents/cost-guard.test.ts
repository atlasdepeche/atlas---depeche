import { describe, expect, it } from "vitest";
import { estimateCostUsd, isUnderDailyCap, isUnderPerEventCap } from "./cost-guard";

describe("estimateCostUsd", () => {
  it("computes cost for a known model", () => {
    const cost = estimateCostUsd({
      model: "claude-opus-5",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(5 + 25, 5);
  });

  it("returns 0 for an unrecognized model rather than guessing", () => {
    const cost = estimateCostUsd({
      model: "some-future-model",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBe(0);
  });

  it("scales linearly with token count", () => {
    const cost = estimateCostUsd({
      model: "claude-sonnet-5",
      inputTokens: 500_000,
      outputTokens: 0,
    });
    expect(cost).toBeCloseTo(1, 5);
  });
});

describe("isUnderDailyCap", () => {
  it("is true when under the cap", () => {
    expect(isUnderDailyCap({ spentTodayUsd: 5, capUsd: 10 })).toBe(true);
  });

  it("is false at or above the cap", () => {
    expect(isUnderDailyCap({ spentTodayUsd: 10, capUsd: 10 })).toBe(false);
    expect(isUnderDailyCap({ spentTodayUsd: 11, capUsd: 10 })).toBe(false);
  });
});

describe("isUnderPerEventCap", () => {
  it("is true when under the cap", () => {
    expect(isUnderPerEventCap({ spentOnEventUsd: 0.1, capUsd: 0.5 })).toBe(true);
  });

  it("is false at or above the cap", () => {
    expect(isUnderPerEventCap({ spentOnEventUsd: 0.5, capUsd: 0.5 })).toBe(false);
  });
});
