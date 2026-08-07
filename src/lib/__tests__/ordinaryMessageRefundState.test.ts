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
