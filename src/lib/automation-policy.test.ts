import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canAutomate,
  getAutomatedCategoryAllowlist,
  isAutomationKilled,
  isHumanOnlyCategory,
} from "./automation-policy";

const ENV_KEYS = ["AUTOMATION_KILL_SWITCH", "AUTOMATED_CATEGORIES"] as const;
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
