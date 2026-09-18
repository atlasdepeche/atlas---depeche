import { describe, expect, it } from "vitest";
import { decideEventVerdict } from "./verdict";

const goodVerification = {
  overallConfidence: 80,
  insufficientCorroboration: false,
  claims: [{ status: "supported" }, { status: "supported" }],
};

describe("decideEventVerdict", () => {
  it("verifies a well-corroborated, high-confidence event with no adversarial concerns", () => {
    const verdict = decideEventVerdict({
      verification: goodVerification,
      adversarial: { concerns: [], confidenceAdjustment: 0 },
    });
    expect(verdict).toEqual({ status: "verified", finalConfidence: 80 });
  });

  it("stays candidate when corroboration is insufficient even at high confidence", () => {
    const verdict = decideEventVerdict({
      verification: { ...goodVerification, insufficientCorroboration: true },
      adversarial: { concerns: [], confidenceAdjustment: 0 },
    });
    expect(verdict.status).toBe("candidate");
  });

  it("stays candidate when confidence is below threshold", () => {
    const verdict = decideEventVerdict({
      verification: { ...goodVerification, overallConfidence: 40 },
      adversarial: { concerns: [], confidenceAdjustment: 0 },
    });
    expect(verdict.status).toBe("candidate");
  });

  it("rejects on a high-severity contradiction concern even if confidence is high", () => {
    const verdict = decideEventVerdict({
      verification: goodVerification,
      adversarial: {
        concerns: [{ type: "contradiction", severity: "high" }],
        confidenceAdjustment: -10,
      },
    });
    expect(verdict.status).toBe("rejected");
  });

  it("does not reject on a low-severity concern", () => {
    const verdict = decideEventVerdict({
      verification: goodVerification,
      adversarial: {
        concerns: [{ type: "weak_source", severity: "low" }],
        confidenceAdjustment: -5,
      },
    });
    expect(verdict.status).toBe("verified");
    expect(verdict.finalConfidence).toBe(75);
  });

  it("rejects when most claims are contradicted, with no adversarial pass", () => {
    const verdict = decideEventVerdict({
      verification: {
        overallConfidence: 70,
        insufficientCorroboration: false,
        claims: [{ status: "contradicted" }, { status: "contradicted" }, { status: "supported" }],
      },
      adversarial: null,
    });
    expect(verdict.status).toBe("rejected");
  });

  it("clamps final confidence to [0, 100]", () => {
    const high = decideEventVerdict({
      verification: { ...goodVerification, overallConfidence: 95 },
      adversarial: { concerns: [], confidenceAdjustment: 20 as never }, // schema forbids positive, but clamp defends anyway
    });
    expect(high.finalConfidence).toBeLessThanOrEqual(100);

    const low = decideEventVerdict({
      verification: { ...goodVerification, overallConfidence: 10 },
      adversarial: { concerns: [], confidenceAdjustment: -50 },
    });
    expect(low.finalConfidence).toBeGreaterThanOrEqual(0);
  });

  it("handles no adversarial pass at all (e.g. skipped for cost)", () => {
    const verdict = decideEventVerdict({ verification: goodVerification, adversarial: null });
    expect(verdict).toEqual({ status: "verified", finalConfidence: 80 });
  });
});
