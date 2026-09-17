import { describe, expect, it } from "vitest";
import {
  canAutoPublish,
  parsePublicationMode,
  resolvePublicationMode,
} from "./publication-mode";

describe("parsePublicationMode", () => {
  it("defaults to shadow for undefined", () => {
    expect(parsePublicationMode(undefined)).toBe("shadow");
  });

  it("defaults to shadow for an unknown value", () => {
    expect(parsePublicationMode("yolo")).toBe("shadow");
  });

  it("accepts each valid mode", () => {
    expect(parsePublicationMode("shadow")).toBe("shadow");
    expect(parsePublicationMode("assisted")).toBe("assisted");
    expect(parsePublicationMode("automated")).toBe("automated");
    expect(parsePublicationMode("human_only")).toBe("human_only");
  });
});

describe("resolvePublicationMode", () => {
  it("never returns automated for a category not on the allowlist", () => {
    const mode = resolvePublicationMode({
      category: "politics",
      globalMode: "automated",
      automatedCategories: new Set(["weather"]),
    });
    expect(mode).toBe("assisted");
  });

  it("returns automated only for an allowlisted category", () => {
    const mode = resolvePublicationMode({
      category: "weather",
      globalMode: "automated",
      automatedCategories: new Set(["weather"]),
    });
    expect(mode).toBe("automated");
  });

  it("passes through shadow/assisted/human_only regardless of category", () => {
    for (const globalMode of ["shadow", "assisted", "human_only"] as const) {
      expect(
        resolvePublicationMode({
          category: "politics",
          globalMode,
          automatedCategories: new Set(),
        }),
      ).toBe(globalMode);
    }
  });
});

describe("canAutoPublish", () => {
  it("is true only for automated", () => {
    expect(canAutoPublish("automated")).toBe(true);
    expect(canAutoPublish("shadow")).toBe(false);
    expect(canAutoPublish("assisted")).toBe(false);
    expect(canAutoPublish("human_only")).toBe(false);
  });
});
