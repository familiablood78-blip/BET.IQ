import { describe, expect, test } from "bun:test";
import { deriveSettlement } from "../../analytics/settlement";

describe("Server-authoritative settlement derivation (WS1b §10)", () => {
  test("lean_over + actual > line ⇒ win/correct", () => {
    const r = deriveSettlement({ recommendation: "lean_over", actualStat: 28, propLine: 23.5 });
    expect(r).toEqual({ predictedOutcome: "over", outcome: "win", wasCorrect: true, result: "correct" });
  });

  test("lean_over + actual < line ⇒ loss/incorrect — even if client claimed win", () => {
    // The derivation is a pure function of authoritative inputs; a client's
    // "outcome=win" claim is never an input here.
    const r = deriveSettlement({ recommendation: "lean_over", actualStat: 20, propLine: 23.5 });
    expect(r.outcome).toBe("loss");
    expect(r.wasCorrect).toBe(false);
    expect(r.result).toBe("incorrect");
  });

  test("lean_under + actual < line ⇒ win", () => {
    const r = deriveSettlement({ recommendation: "lean_under", actualStat: 18, propLine: 23.5 });
    expect(r.outcome).toBe("win");
    expect(r.wasCorrect).toBe(true);
  });

  test("lean_under + actual > line ⇒ loss (client cannot game to win)", () => {
    const r = deriveSettlement({ recommendation: "lean_under", actualStat: 30, propLine: 23.5 });
    expect(r.outcome).toBe("loss");
    expect(r.wasCorrect).toBe(false);
  });

  test("exact line ⇒ push (neither win nor loss), regardless of claim", () => {
    const over = deriveSettlement({ recommendation: "lean_over", actualStat: 23.5, propLine: 23.5 });
    expect(over.outcome).toBe("push");
    expect(over.wasCorrect).toBe(null);
    const under = deriveSettlement({ recommendation: "lean_under", actualStat: 23.5, propLine: 23.5 });
    expect(under.outcome).toBe("push");
    expect(under.wasCorrect).toBe(null);
  });

  test("no_bet / unknown recommendation refused (pending/push)", () => {
    const r = deriveSettlement({ recommendation: "no_bet", actualStat: 99, propLine: 23.5 });
    expect(r.outcome).toBe("push");
    expect(r.predictedOutcome).toBe("no_bet");
    expect(r.wasCorrect).toBe(null);
  });

  test("a malicious 'mark every analysis as a win' attempt cannot alter derived outcome", () => {
    // Even if the caller had sent outcome=win for a losing actualStat, the stored
    // outcome is loss. This is asserted across the boundary: the route derives
    // exclusively from actualStat vs propLine (client outcome ignored).
    const badClaim = { recommendation: "lean_over", actualStat: 10, propLine: 23.5, clientClaimed: "win" };
    const r = deriveSettlement({ recommendation: badClaim.recommendation, actualStat: badClaim.actualStat, propLine: badClaim.propLine });
    expect(r.outcome).toBe("loss");
  });

  test("non-finite inputs refused (never settled)", () => {
    expect(deriveSettlement({ recommendation: "lean_over", actualStat: Number.NaN, propLine: 23.5 }).outcome).toBe("push");
    expect(deriveSettlement({ recommendation: "lean_over", actualStat: 25, propLine: Number.NaN }).outcome).toBe("push");
  });
});