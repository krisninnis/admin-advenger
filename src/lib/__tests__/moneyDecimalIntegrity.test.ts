import { describe, expect, it } from "vitest";
import { extractRecoverableAmount, extractTotalCostMention } from "../moneyParsers";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// Pre-pilot scenario verification, money decimal integrity.
//
// splitSentences in moneyParsers split on every period, and a decimal point is a
// period. "Your refund of £68.40 was due..." became two sentences, "Your refund
// of £68." and "40 was due...", so the first amount in the sentence read as 68.
//
// The result then showed "GBP 68.00" and the prepared draft said "my approved
// refund of £68". A figure the user might send to a company was 40 pence short of
// what the source said, which is an invented money value.
//
// This is the same decimal-point class as the refund-stage defect, in a second
// helper that the earlier slice did not touch.

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

describe("money extraction keeps pence", () => {
  // recoverableTravelSignalPattern requires wording such as "extra hotel night",
  // "compensation" or "reimbursement", so each fixture uses a phrase it accepts.
  it.each([
    ["a recoverable travel amount", "The extra hotel night cost £68.40 after the cancellation.", 68.4],
    ["thousands and pence", "The extra hotel night cost £1,234.56 after the cancellation.", 1234.56],
    ["a whole-pound amount", "The extra hotel night cost £68 after the cancellation.", 68],
    ["a compensation amount", "We will pay compensation of £249.99 for the delay.", 249.99],
  ])("reads %s exactly", (_name, message, expected) => {
    expect(extractRecoverableAmount(message)).toBe(expected);
  });

  it("keeps pence in a total-cost mention", () => {
    expect(extractTotalCostMention("The total holiday cost was £2,480.75 in all.")?.amount).toBe(
      2480.75,
    );
  });
});

describe("a refund amount with pence survives into the result and the draft", () => {
  const WITH_PENCE = "Your refund of £68.40 was due within 5 to 10 working days and has not arrived.";

  it("never shows a rounded or truncated amount", () => {
    const journey = run("pence-money", WITH_PENCE);

    for (const line of journey.resultViewModel.moneyMentioned) {
      expect(line.amountText).not.toMatch(/68\.00\b/);
      expect(line.amountText).not.toMatch(/\b68\s*$/);
    }
  });

  it("never puts a truncated amount into a prepared draft", () => {
    const journey = run("pence-draft", WITH_PENCE);
    const primary = journey.guidedNextStep.primaryAction as { body?: string };
    const body = primary.body ?? "";

    if (/£/.test(body)) {
      expect(body).not.toMatch(/£68\b(?!\.40)/);
    }
  });

  it("keeps the source amount visible", () => {
    expect(run("pence-visible", WITH_PENCE).visibleText).toContain("68.40");
  });
});
