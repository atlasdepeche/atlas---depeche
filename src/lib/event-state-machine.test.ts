import { describe, expect, it } from "vitest";
import { EVENT_STATES, isValidEventTransition } from "./event-state-machine";

describe("isValidEventTransition", () => {
  it("allows the real pipeline path: candidate -> verifying -> confirmed -> published -> updated", () => {
    expect(isValidEventTransition("candidate", "verifying")).toBe(true);
    expect(isValidEventTransition("verifying", "confirmed")).toBe(true);
    expect(isValidEventTransition("confirmed", "published")).toBe(true);
    expect(isValidEventTransition("published", "updated")).toBe(true);
  });

  it("allows an event to be corrected more than once (updated -> updated)", () => {
    expect(isValidEventTransition("updated", "updated")).toBe(true);
  });

  it("allows inconclusive verification to return an event to the candidate pool", () => {
    expect(isValidEventTransition("verifying", "candidate")).toBe(true);
  });

  it("allows a mostly-contradicted event to land on conflicted, not just rejected", () => {
    expect(isValidEventTransition("verifying", "conflicted")).toBe(true);
    expect(isValidEventTransition("conflicted", "confirmed")).toBe(true);
    expect(isValidEventTransition("conflicted", "rejected")).toBe(true);
  });

  it("rejects skipping straight from candidate to confirmed or published", () => {
    expect(isValidEventTransition("candidate", "confirmed")).toBe(false);
    expect(isValidEventTransition("candidate", "published")).toBe(false);
  });

  it("rejects a no-op self-transition where it carries no meaning", () => {
    expect(isValidEventTransition("candidate", "candidate")).toBe(false);
    expect(isValidEventTransition("confirmed", "confirmed")).toBe(false);
  });

  it("treats archived as terminal — nothing transitions out of it", () => {
    for (const to of EVENT_STATES) {
      expect(isValidEventTransition("archived", to)).toBe(false);
    }
  });

  it("rejects resurrecting a rejected event back into the verification pool", () => {
    expect(isValidEventTransition("rejected", "candidate")).toBe(false);
    expect(isValidEventTransition("rejected", "verifying")).toBe(false);
  });
});
