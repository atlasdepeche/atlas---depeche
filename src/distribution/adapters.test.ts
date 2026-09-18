import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { xAdapter } from "./x";
import { telegramAdapter } from "./telegram";

const ENV_KEYS = [
  "DISTRIBUTION_X_ENABLED",
  "X_API_KEY",
  "X_API_SECRET",
  "X_ACCESS_TOKEN",
  "X_ACCESS_SECRET",
  "DISTRIBUTION_TELEGRAM_ENABLED",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("xAdapter.isEnabled", () => {
  it("is disabled with nothing set", () => {
    expect(xAdapter.isEnabled()).toBe(false);
  });

  it("is disabled when the flag is off even with all credentials present", () => {
    process.env.X_API_KEY = "k";
    process.env.X_API_SECRET = "s";
    process.env.X_ACCESS_TOKEN = "t";
    process.env.X_ACCESS_SECRET = "ts";
    expect(xAdapter.isEnabled()).toBe(false);
  });

  it("is disabled when the flag is on but a credential is missing", () => {
    process.env.DISTRIBUTION_X_ENABLED = "true";
    process.env.X_API_KEY = "k";
    process.env.X_API_SECRET = "s";
    process.env.X_ACCESS_TOKEN = "t";
    // X_ACCESS_SECRET missing
    expect(xAdapter.isEnabled()).toBe(false);
  });

  it("is enabled only with the flag on AND all four credentials present", () => {
    process.env.DISTRIBUTION_X_ENABLED = "true";
    process.env.X_API_KEY = "k";
    process.env.X_API_SECRET = "s";
    process.env.X_ACCESS_TOKEN = "t";
    process.env.X_ACCESS_SECRET = "ts";
    expect(xAdapter.isEnabled()).toBe(true);
  });
});

describe("telegramAdapter.isEnabled", () => {
  it("is disabled with nothing set", () => {
    expect(telegramAdapter.isEnabled()).toBe(false);
  });

  it("is disabled when the flag is on but the token is missing", () => {
    process.env.DISTRIBUTION_TELEGRAM_ENABLED = "true";
    process.env.TELEGRAM_CHAT_ID = "123";
    expect(telegramAdapter.isEnabled()).toBe(false);
  });

  it("is enabled only with the flag on AND both token+chat id present", () => {
    process.env.DISTRIBUTION_TELEGRAM_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "abc";
    process.env.TELEGRAM_CHAT_ID = "123";
    expect(telegramAdapter.isEnabled()).toBe(true);
  });
});

describe("post() when disabled", () => {
  it("xAdapter.post returns disabled without making a network call", async () => {
    const result = await xAdapter.post({ title: "t", slug: "s", locale: "fr" }, "http://x");
    expect(result).toEqual({ status: "disabled" });
  });

  it("telegramAdapter.post returns disabled without making a network call", async () => {
    const result = await telegramAdapter.post({ title: "t", slug: "s", locale: "fr" }, "http://x");
    expect(result).toEqual({ status: "disabled" });
  });
});
