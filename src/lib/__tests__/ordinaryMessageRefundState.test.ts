import { describe, expect, it } from "vitest";
import { assessRefundState } from "../generalAdminExtraction";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// P0/P1 - Ordinary Message Refund State Correctness v1.
//
// Two invariants:
//
//   refund state must not depend on whether an amount contains pence;
//   a conditional sentence about what to do if a refund later fails must not be
//   read as evidence that it has already failed.
//
// The stage ladder in assessRefundState joined its keywords with `[^.\n]*`,
// which stops at any period. A decimal point is a period, so "£39 has been
// approved" reported `approved` while "£68.40 has been approved" reported
// `unknown`. Every rung was affected, not just approval.
//
// The same gap matcher also crossed negations, so "Your refund has not been
// approved." reported `approved`. That was not in the original defect report and
// is the more dangerous of the two.
//
// W4 had to route around the decimal bug by matching AdminAvenger's own finding
// titles. With the state correct, escalation can read the state again.

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const actionView = (id: string, message: string) => {
  const journey = run(id, message);
  const primary = journey.guidedNextStep.primaryAction as {
    kind: string;
    label?: string;
    deadlineText?: string;
    checklist?: string[];
  };

  return {
    journey,
    primaryKind: primary.kind,
    primaryLabel: primary.label ?? "",
    primaryText: [primary.label, primary.deadlineText]
      .concat(primary.checklist ?? [])
      .filter((part): part is string => typeof part === "string")
      .join("\n"),
    secondaryKinds: journey.guidedNextStep.secondaryActions.map((action) => action.kind),
    visible: journey.visibleText,
  };
};

// --- A: the amount format must not change the state -------------------------

describe("refund stage is independent of amount format", () => {
  it.each([
    ["integer pounds", "£39"],
    ["pounds and pence", "£39.00"],
    ["a decimal amount", "£68.40"],
    ["thousands and pence", "£1,234.56"],
    ["GBP before the amount", "GBP 68.40"],
    ["GBP after the amount", "68.40 GBP"],
  ])("reads approval with %s", (_name, amount) => {
    expect(assessRefundState(`Your refund of ${amount} has been approved.`).stage).toBe(
      "approved",
    );
  });

  it.each([
    ["issued", "Your refund of £68.40 has been issued.", "issued"],
    [
      "promised",
      "Your refund of £68.40 will be paid to your original payment method.",
      "promised",
    ],
    ["received", "Your refund of £68.40 has reached your account.", "received"],
  ])("reads %s through a decimal amount", (_name, message, expected) => {
    expect(assessRefundState(message).stage).toBe(expected);
  });
});

// --- B: reasonable phrase shapes --------------------------------------------

describe("refund approval phrasing", () => {
  it.each([
    "Your refund of £68.40 has been approved.",
    "We have approved your refund of £68.40.",
    "A refund of £68.40 is approved.",
    "Your £68.40 refund has been approved.",
  ])("reads approval from %s", (message) => {
    expect(assessRefundState(message).stage).toBe("approved");
  });
});

// --- C: negatives and refusals must not read as approval --------------------

describe("refund state does not overmatch", () => {
  it.each([
    "Your refund has not been approved.",
    "Your refund of £68.40 has not yet been approved.",
    "Your refund was refused.",
    "Your refund request was declined.",
    "Your refund request was rejected.",
    "Approval is still pending.",
  ])("never reports approved for %s", (message) => {
    expect(assessRefundState(message).stage).not.toBe("approved");
  });

  it.each([
    ["refused", "Your refund was refused."],
    ["declined", "Your refund request was declined."],
    ["rejected", "Your £68.40 refund was rejected after review."],
  ])("reports refused for %s", (_name, message) => {
    expect(assessRefundState(message).stage).toBe("refused");
  });

  it("does not report received when receipt is negated", () => {
    expect(assessRefundState("Your refund of £68.40 has not been received.").stage).not.toBe(
      "received",
    );
  });
});

// --- C2: a refusal written with the determiner "no" -------------------------
//
// The pilot-readiness recheck found the last hole in this family. The negation
// guard recognised `not`, `never` and `no longer`, which are adverbs sitting
// before the verb. It did not recognise `no` as a determiner governing the noun,
// so "No refund has been approved for £68.40." reported `approved` and rendered
// as "Refund approved" with an action telling the person to keep an approval that
// does not exist. That is a false reassurance about money, which is why it
// blocked the supervised pilot.
//
// The guard has to stay locally connected: an unrelated "No delay occurred." in
// another sentence must not suppress a genuine approval.

const SUCCESS_STAGES = ["approved", "issued", "received", "promised"];

describe("refusals written with the determiner no", () => {
  it.each([
    ["approval", "No refund has been approved for £68.40."],
    ["issue", "After review, no refund will be issued."],
    ["receipt", "No refund has been received."],
    ["issue, inverted clause", "There will be no refund issued."],
    ["payment", "No refund will be paid to your account."],
    ["approval with a following sentence", "No refund has been approved. Your complaint remains open."],
  ])("never reports a success stage for a denied %s", (_name, message) => {
    expect(SUCCESS_STAGES).not.toContain(assessRefundState(message).stage);
  });

  it.each([
    ["no further refund", "No further refund will be issued for this order."],
    ["no partial refund", "No partial refund has been approved."],
  ])("also covers %s", (_name, message) => {
    expect(SUCCESS_STAGES).not.toContain(assessRefundState(message).stage);
  });
});

describe("future-tense negation stays safe", () => {
  it.each([
    "Your refund will not be issued.",
    "Your refund will not be approved.",
    "Your refund will not be paid.",
  ])("never reports a success stage for %s", (message) => {
    expect(SUCCESS_STAGES).not.toContain(assessRefundState(message).stage);
  });
});

describe("the determiner guard does not overmatch", () => {
  it("keeps an approval when an unrelated sentence starts with No", () => {
    expect(
      assessRefundState("No delay occurred. Your refund has been approved.").stage,
    ).toBe("approved");
  });

  it.each([
    ["approved", "Your refund has been approved.", "approved"],
    ["issued", "Your refund will be issued within 5 working days.", "issued"],
    ["received", "Your refund has been received.", "received"],
    ["approved with pence", "Your refund of £68.40 has been approved.", "approved"],
  ])("still reads %s", (_name, message, expected) => {
    expect(assessRefundState(message).stage).toBe(expected);
  });
});

describe("amount-interposed determiner negation", () => {
  it.each([
    ["GBP receipt", "No GBP 68.40 refund has been received."],
    ["sterling receipt", "No \u00a368.40 refund has been received."],
    ["GBP approval", "No GBP 68.40 refund has been approved."],
    ["inverted GBP issue", "There will be no GBP 68.40 refund issued."],
    ["further GBP approval", "No further GBP 68.40 refund has been approved."],
    ["partial GBP issue", "No partial GBP 68.40 refund has been issued."],
    ["amount-only receipt", "No 68.40 refund has been received."],
    ["currency-token approval", "No GBP refund has been approved."],
    ["modifier after amount", "No GBP 68.40 partial refund has been issued."],
    ["plain receipt", "No refund has been received."],
    ["plain approval", "No refund has been approved."],
    ["not received", "Your refund has not been received."],
    ["not approved", "Your refund has not been approved."],
    ["will not be issued", "Your refund will not be issued."],
    ["refused", "Your refund was refused."],
    ["declined", "Your refund was declined."],
    ["rejected", "Your refund was rejected."],
  ])("never reports a success stage for %s", (_name, message) => {
    expect(SUCCESS_STAGES).not.toContain(assessRefundState(message).stage);
  });

  it.each([
    ["GBP receipt", "Your GBP 68.40 refund has been received.", "received"],
    ["sterling approval", "Your \u00a368.40 refund has been approved.", "approved"],
    ["GBP issue", "Your GBP 68.40 refund will be issued.", "issued"],
    ["refund of GBP", "Your refund of GBP 68.40 has been received.", "received"],
    ["refund of sterling", "Your refund of \u00a368.40 has been approved.", "approved"],
  ])("keeps the genuine positive state for %s", (_name, message, expected) => {
    expect(assessRefundState(message).stage).toBe(expected);
  });

  it("does not carry determiner negation into another sentence", () => {
    expect(
      assessRefundState("No delay occurred. Your GBP 68.40 refund has been approved.").stage,
    ).toBe("approved");
  });

  it.each([
    ["received", "No GBP 68.40 refund has been received."],
    ["approved", "No GBP 68.40 refund has been approved."],
    ["issued", "There will be no GBP 68.40 refund issued."],
  ])("does not expose a false %s result downstream", (state, message) => {
    const { journey, primaryLabel, primaryText, visible } = actionView(
      `amount-interposed-${state}`,
      message,
    );

    expect(journey.resultViewModel.title).not.toMatch(/refund approved|confirmed as received/i);
    expect(journey.resultViewModel.primaryStatusLabel ?? "").not.toMatch(/pending recovery/i);
    expect(`${primaryLabel}\n${primaryText}`).not.toMatch(
      /keep (?:the )?(?:approval|confirmation)|refund window/i,
    );
    expect(visible).not.toMatch(/refund (?:has been|is|was) (?:approved|issued|received)/i);
  });
});

describe("a denied refund is safe all the way to the visible result", () => {
  const DENIED = "No refund has been approved for £68.40.";

  it("does not title the result as an approved refund", () => {
    const journey = run("denied", DENIED);

    expect(journey.resultViewModel.title).not.toMatch(/refund approved/i);
  });

  it("does not claim a pending recovery on the strength of an approval", () => {
    const journey = run("denied-status", DENIED);

    expect(journey.resultViewModel.primaryStatusLabel ?? "").not.toMatch(
      /pending recovery/i,
    );
  });

  it("does not tell the person to keep or check an approval that does not exist", () => {
    const { primaryLabel, primaryText } = actionView("denied-action", DENIED);

    expect(primaryLabel).not.toMatch(/keep the approval|refund window/i);
    expect(primaryText).not.toMatch(/the provider stated/i);
  });

  it("does not present the amount as confirmed incoming refund money", () => {
    const journey = run("denied-money", DENIED);

    // The amount stays visible and source-grounded, but nothing may describe it
    // as money that is on its way. Every money line stays out of the tracker, and
    // no amount may be attached to a recovery or approval claim.
    for (const line of journey.resultViewModel.moneyMentioned) {
      expect(line.countedInMoneyTracker).toBe(false);

      if (/recovery|refund/i.test(line.label)) {
        expect(line.amountText).not.toMatch(/\d/);
      }
    }

    expect(journey.visibleText).not.toMatch(
      /refund (?:has been|is|was) (?:approved|issued|processed)/i,
    );
    expect(journey.visibleText).not.toMatch(/pending recovery\s*-\s*not confirmed/i);
  });
});

// --- D: conditional boilerplate is not present failure ----------------------

const CONDITIONAL_BOILERPLATE =
  "Your refund of £68.40 has been approved and will be paid within 5 to 10 working days. If it has not arrived by then, please contact us.";

describe("conditional provider boilerplate", () => {
  it("still reads the refund as approved", () => {
    expect(assessRefundState(CONDITIONAL_BOILERPLATE).stage).toBe("approved");
  });

  it("does not assert that the refund has failed", () => {
    expect(assessRefundState(CONDITIONAL_BOILERPLATE).failureAsserted).toBe(false);
  });

  it("keeps the stated window as the refund window", () => {
    expect(assessRefundState(CONDITIONAL_BOILERPLATE).relativePeriod?.value).toMatch(
      /5 to 10 working days/i,
    );
    expect(assessRefundState(CONDITIONAL_BOILERPLATE).relativePeriod?.role).toBe(
      "refund_window",
    );
  });

  it("does not make a complaint draft the immediate action", () => {
    const { primaryLabel } = actionView("conditional", CONDITIONAL_BOILERPLATE);

    expect(primaryLabel).not.toMatch(/complaint/i);
  });

  it("keeps the primary guidance on checking against the window", () => {
    const { primaryKind, primaryText } = actionView("conditional", CONDITIONAL_BOILERPLATE);

    expect(primaryKind).toBe("deadline_checklist");
    expect(primaryText).toMatch(/5 to 10 working days/i);
  });

  it("invents no arrival date and does not claim receipt", () => {
    const { primaryText, visible } = actionView("conditional", CONDITIONAL_BOILERPLATE);

    expect(primaryText).not.toMatch(
      /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/,
    );
    expect(visible).toMatch(/not confirmed received|pending/i);
  });
});

describe("conditional grammar variants are not present failure", () => {
  it.each([
    ["if it has not arrived", "If it has not arrived by then, please contact us."],
    ["if you have not received it", "If you have not received it after that, contact us."],
    ["should it not arrive", "Should it not arrive by then, please get in touch."],
    ["unless the refund arrives", "Unless the refund arrives within that period, contact us."],
  ])("treats %s as conditional", (_name, tail) => {
    const message = `Your refund of £68.40 has been approved and will be paid within 5 to 10 working days. ${tail}`;

    expect(assessRefundState(message).failureAsserted).toBe(false);
    expect(actionView("cond-variant", message).primaryLabel).not.toMatch(/complaint/i);
  });
});

// --- E: a real, current failure must still escalate --------------------------

describe("asserted failure still escalates", () => {
  it.each([
    ["window gone and nothing arrived", "Your refund was due within 5 to 10 working days and has not arrived."],
    [
      "window passed and not received",
      "The promised refund window has passed and the refund has not been received.",
    ],
    ["payment failed", "Your refund payment failed."],
  ])("asserts failure for %s", (_name, message) => {
    expect(assessRefundState(message).failureAsserted).toBe(true);
  });

  it.each([
    ["window gone", "Your refund of £68.40 was due within 5 to 10 working days and has not arrived."],
    ["refused", "We have refused your £68.40 refund request after reviewing the return."],
  ])("keeps a draft action available for %s", (_name, message) => {
    const { primaryKind, primaryLabel, secondaryKinds } = actionView("failure", message);

    expect(
      primaryKind === "draft_message" || secondaryKinds.includes("draft_message"),
    ).toBe(true);
    expect(`${primaryKind} ${primaryLabel}`).toMatch(/draft|complaint|follow/i);
  });
});

// --- Approved refund with no stated window ----------------------------------

const APPROVED_NO_WINDOW =
  "Your refund of £68.40 has been approved and will be returned to your original payment method.";

describe("approved refund with no stated window", () => {
  it("does not escalate to a complaint draft merely because no window is stated", () => {
    expect(actionView("no-window", APPROVED_NO_WINDOW).primaryLabel).not.toMatch(/complaint/i);
  });

  it("says the message gives no timescale rather than inventing one", () => {
    const { primaryText } = actionView("no-window", APPROVED_NO_WINDOW);

    expect(primaryText).toMatch(/no timescale|does not (?:give|state)/i);
    expect(primaryText).not.toMatch(/\d+\s*(?:to\s*\d+\s*)?working days/i);
  });

  it("keeps a follow-up draft available as a secondary action", () => {
    expect(actionView("no-window", APPROVED_NO_WINDOW).secondaryKinds).toContain(
      "draft_message",
    );
  });
});

// --- W1 to W4 regressions ---------------------------------------------------

const REFUND_WITH_REFERENCE =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.";

describe("earlier workstreams still hold", () => {
  it("keeps the W1 facts", () => {
    const { visible } = actionView("w1", REFUND_WITH_REFERENCE);

    expect(visible).toContain("£68.40");
    expect(visible).toContain("RF-20481");
  });

  it("keeps the W2 evidence set", () => {
    const { journey } = actionView("w2", REFUND_WITH_REFERENCE);

    expect([...journey.resultViewModel.evidenceFound.map((entry) => entry.label)].sort()).toEqual([
      "Expected refund window",
      "Reference",
      "Refund amount",
      "Refund status",
    ]);
  });

  it("keeps the W3 refund_window timing role", () => {
    const { journey } = actionView("w3", REFUND_WITH_REFERENCE);

    expect(
      journey.resultViewModel.keyDates.find((date) =>
        date.value.includes("5 to 10 working days"),
      )?.role,
    ).toBe("refund_window");
  });

  it("keeps the W4 window check as the primary action", () => {
    const { primaryLabel, primaryText } = actionView("w4", REFUND_WITH_REFERENCE);

    expect(primaryLabel).toMatch(/refund window/i);
    expect(primaryText).toMatch(/5 to 10 working days/i);
  });

  it("keeps security precedence untouched", () => {
    const journey = run(
      "security",
      "Your parcel is held. Pay a £1.50 redelivery fee using parcel-check.example/link or it will be returned.",
    );

    expect(journey.adminCase.title).toMatch(/safety check|security alert/i);
  });
});
