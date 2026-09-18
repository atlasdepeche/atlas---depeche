import { describe, expect, it } from "vitest";
import { decideDedup, type DedupCandidateEvent } from "./dedup";

const HOUR = 60 * 60 * 1000;

describe("decideDedup", () => {
  it("creates a new event when there is no matching fingerprint", () => {
    const decision = decideDedup({
      fingerprint: "abc",
      now: new Date(),
      recentEvents: [],
    });
    expect(decision).toEqual({ action: "create" });
  });

  it("attaches to a recent event with the same fingerprint", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const recentEvents: DedupCandidateEvent[] = [
      { id: "event-1", fingerprint: "abc", detectedAt: new Date("2026-09-18T10:00:00Z") },
    ];
    const decision = decideDedup({ fingerprint: "abc", now, recentEvents });
    expect(decision).toEqual({ action: "attach", eventId: "event-1" });
  });

  it("does not attach to an event outside the dedup window", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const recentEvents: DedupCandidateEvent[] = [
      {
        id: "event-1",
        fingerprint: "abc",
        detectedAt: new Date(now.getTime() - 49 * HOUR), // just past 48h
      },
    ];
    const decision = decideDedup({ fingerprint: "abc", now, recentEvents });
    expect(decision).toEqual({ action: "create" });
  });

  it("attaches at exactly the window boundary", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const recentEvents: DedupCandidateEvent[] = [
      {
        id: "event-1",
        fingerprint: "abc",
        detectedAt: new Date(now.getTime() - 48 * HOUR),
      },
    ];
    const decision = decideDedup({ fingerprint: "abc", now, recentEvents });
    expect(decision).toEqual({ action: "attach", eventId: "event-1" });
  });

  it("ignores events with a different fingerprint", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    const recentEvents: DedupCandidateEvent[] = [
      { id: "event-1", fingerprint: "xyz", detectedAt: now },
    ];
    const decision = decideDedup({ fingerprint: "abc", now, recentEvents });
    expect(decision).toEqual({ action: "create" });
  });
});
