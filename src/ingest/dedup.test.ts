import { describe, expect, it } from "vitest";
import {
  classifySourceLineage,
  decideDedup,
  type DedupCandidateEvent,
  type LineageCandidateItem,
} from "./dedup";

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

describe("classifySourceLineage", () => {
  it("is always 'original' when there is nothing yet to compare against", () => {
    const result = classifySourceLineage({
      newItem: { title: "Le roi reçoit le ministre", summary: "Une rencontre officielle" },
      existingItems: [],
    });
    expect(result).toEqual({ lineageType: "original", derivedFromSourceItemId: null });
  });

  it("flags an exact republish (same title+summary, different casing/punctuation) as a wire copy", () => {
    const existingItems: LineageCandidateItem[] = [
      { id: "item-1", title: "Le Roi reçoit le Ministre.", summary: "Une rencontre officielle!" },
    ];
    const result = classifySourceLineage({
      newItem: { title: "le roi reçoit le ministre", summary: "une rencontre officielle" },
      existingItems,
    });
    expect(result).toEqual({ lineageType: "same_wire_copy", derivedFromSourceItemId: "item-1" });
  });

  it("treats independently-worded reporting on the same event as original", () => {
    const existingItems: LineageCandidateItem[] = [
      { id: "item-1", title: "Le Roi reçoit le Ministre", summary: "Une rencontre officielle" },
    ];
    const result = classifySourceLineage({
      newItem: {
        title: "Rencontre royale avec le ministre des Affaires étrangères",
        summary: "Le souverain a reçu son homologue ce matin",
      },
      existingItems,
    });
    expect(result).toEqual({ lineageType: "original", derivedFromSourceItemId: null });
  });

  it("matches against the correct item when several exist", () => {
    const existingItems: LineageCandidateItem[] = [
      { id: "item-1", title: "Première dépêche", summary: "Contenu A" },
      { id: "item-2", title: "Deuxième dépêche", summary: "Contenu B" },
    ];
    const result = classifySourceLineage({
      newItem: { title: "Deuxième dépêche", summary: "Contenu B" },
      existingItems,
    });
    expect(result).toEqual({ lineageType: "same_wire_copy", derivedFromSourceItemId: "item-2" });
  });
});
