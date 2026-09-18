import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canAutomate,
  canAutomateByConfidence,
  getAutomatedCategoryAllowlist,
  getAutomatedMinConfidence,
  isAutomationKilled,
  isHumanOnlyCategory,
  shouldAutomate,
} from "./automation-policy";

const ENV_KEYS = [
  "AUTOMATION_KILL_SWITCH",
  "AUTOMATED_CATEGORIES",
  "AUTOMATED_MIN_CONFIDENCE",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("isAutomationKilled", () => {
  it("is killed (true) by default with nothing set", () => {
    expect(isAutomationKilled()).toBe(true);
  });

  it("is killed for any value other than the exact string 'false'", () => {
    process.env.AUTOMATION_KILL_SWITCH = "0";
    expect(isAutomationKilled()).toBe(true);
    process.env.AUTOMATION_KILL_SWITCH = "False";
    expect(isAutomationKilled()).toBe(true);
    process.env.AUTOMATION_KILL_SWITCH = "no";
    expect(isAutomationKilled()).toBe(true);
  });

  it("is un-killed only when set to exactly 'false'", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(isAutomationKilled()).toBe(false);
  });
});

describe("getAutomatedCategoryAllowlist", () => {
  it("is empty by default", () => {
    expect(getAutomatedCategoryAllowlist().size).toBe(0);
  });

  it("parses a comma-separated list, trimmed", () => {
    process.env.AUTOMATED_CATEGORIES = "weather, sports ,institutional";
    const allowlist = getAutomatedCategoryAllowlist();
    expect(allowlist.has("weather")).toBe(true);
    expect(allowlist.has("sports")).toBe(true);
    expect(allowlist.has("institutional")).toBe(true);
    expect(allowlist.size).toBe(3);
  });
});

describe("isHumanOnlyCategory", () => {
  it("flags the permanent hard-banned categories", () => {
    expect(isHumanOnlyCategory("politics")).toBe(true);
    expect(isHumanOnlyCategory("justice")).toBe(true);
    expect(isHumanOnlyCategory("security")).toBe(true);
    expect(isHumanOnlyCategory("diplomacy")).toBe(true);
  });

  it("does not flag an ordinary category", () => {
    expect(isHumanOnlyCategory("weather")).toBe(false);
    expect(isHumanOnlyCategory("sports")).toBe(false);
  });
});

describe("canAutomate", () => {
  it("is false for everything by default (kill switch on, empty allowlist)", () => {
    expect(canAutomate("weather")).toBe(false);
    expect(canAutomate("sports")).toBe(false);
  });

  it("stays false for an allowlisted category while the kill switch is on", () => {
    expect(canAutomate("weather", new Set(["weather"]))).toBe(false);
  });

  it("is true only once the kill switch is off AND the category is allowlisted", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(canAutomate("weather", new Set(["weather"]))).toBe(true);
    expect(canAutomate("sports", new Set(["weather"]))).toBe(false);
  });

  it("never allows a human-only category even with the kill switch off and category listed", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(canAutomate("politics", new Set(["politics"]))).toBe(false);
  });
});

describe("getAutomatedMinConfidence", () => {
  it("defaults to 90 when unset", () => {
    expect(getAutomatedMinConfidence()).toBe(90);
  });

  it("reads a numeric override from env", () => {
    process.env.AUTOMATED_MIN_CONFIDENCE = "95";
    expect(getAutomatedMinConfidence()).toBe(95);
  });

  it("falls back to the default for a non-numeric value", () => {
    process.env.AUTOMATED_MIN_CONFIDENCE = "not-a-number";
    expect(getAutomatedMinConfidence()).toBe(90);
  });
});

describe("canAutomateByConfidence", () => {
  it("is false by default (kill switch on) even with a perfect score", () => {
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 100,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });

  it("is true once killed switch is off, confidence clears the bar, and zero adversarial concerns", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 92,
        adversarialConcernCount: 0,
      }),
    ).toBe(true);
  });

  it("is false when confidence is below the threshold", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 89,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });

  it("is false when the adversarial agent raised even one concern", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 99,
        adversarialConcernCount: 1,
      }),
    ).toBe(false);
  });

  it("is false when the adversarial pass never ran (null), even with high confidence", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 99,
        adversarialConcernCount: null,
      }),
    ).toBe(false);
  });

  it("is false when confidence itself is null", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: null,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });

  it("never allows a human-only category regardless of confidence", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "politics",
        confidence: 100,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });

  it("respects an explicit minConfidence override over the env default", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    expect(
      canAutomateByConfidence({
        category: "culture",
        confidence: 85,
        adversarialConcernCount: 0,
        minConfidence: 80,
      }),
    ).toBe(true);
  });
});

describe("shouldAutomate", () => {
  it("is false by default", () => {
    expect(
      shouldAutomate({
        category: "weather",
        confidence: 99,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });

  it("is true via the category-allowlist path alone, even at low confidence", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    process.env.AUTOMATED_CATEGORIES = "weather";
    expect(
      shouldAutomate({
        category: "weather",
        confidence: 10,
        adversarialConcernCount: 3,
      }),
    ).toBe(true);
  });

  it("is true via the confidence path alone, for a category not on the allowlist", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    process.env.AUTOMATED_CATEGORIES = "weather";
    expect(
      shouldAutomate({
        category: "culture",
        confidence: 95,
        adversarialConcernCount: 0,
      }),
    ).toBe(true);
  });

  it("is false when neither path qualifies", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    process.env.AUTOMATED_CATEGORIES = "weather";
    expect(
      shouldAutomate({
        category: "culture",
        confidence: 50,
        adversarialConcernCount: 1,
      }),
    ).toBe(false);
  });

  it("never allows a human-only category via either path", () => {
    process.env.AUTOMATION_KILL_SWITCH = "false";
    process.env.AUTOMATED_CATEGORIES = "politics";
    expect(
      shouldAutomate({
        category: "politics",
        confidence: 100,
        adversarialConcernCount: 0,
      }),
    ).toBe(false);
  });
});
