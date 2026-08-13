import { describe, expect, it } from "vitest";
import { assessRefundState } from "../generalAdminExtraction";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// Received-refund action calibration.
//
// A refund the source says has already arrived was still routed to the generic
// money-back card: title "Money back to chase", pending recovery, a chase
// deadline label, and "Create complaint draft" as the immediate action. So a
// person telling AdminAvenger their money had come back was advised to complain
// about it.
//
// The refund stage already reads `received` correctly, so this is an action and
// composition problem rather than a parsing one. Only the received state loses
// chase behaviour: refused, not-approved, negated receipt and approved-but-waiting
// all keep exactly what they had.

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const view = (id: string, message: string) => {
  const journey = run(id, message);
  const primary = journey.guidedNextStep.primaryAction as {
    kind: string;
    label?: string;
    body?: string;
    evidenceNeeded?: string[];
    checklist?: string[];
  };

  return {
    journey,
    title: journey.resultViewModel.title,
    primaryKind: primary.kind,
    primaryLabel: primary.label ?? "",
    allActionText: [
      primary.label,
      primary.body,
      ...(primary.evidenceNeeded ?? []),
      ...(primary.checklist ?? []),
      ...journey.guidedNextStep.secondaryActions
        .flatMap((action) => Object.values(action))
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string"),
    ]
      .filter((part): part is string => typeof part === "string")
      .join("\n"),
    hasDraft:
      primary.kind === "draft_message" ||
      journey.guidedNextStep.secondaryActions.some((action) => action.kind === "draft_message"),
    visible: journey.visibleText,
  };
};

const RECEIVED_PLAIN = "Thank you for confirming that the £68.40 refund reached your account.";
const RECEIVED_WITH_REFERENCE =
  "Your refund of £68.40 has been received in your original payment account. Reference RF-20481.";

// --- 1 and 2: the received state ------------------------------------------

describe("a refund the source confirms has arrived", () => {
  it("reads the stage as received", () => {
    expect(assessRefundState(RECEIVED_PLAIN).stage).toBe("received");
    expect(assessRefundState(RECEIVED_WITH_REFERENCE).stage).toBe("received");
  });

  it.each([
    ["without a reference", RECEIVED_PLAIN],
    ["with a reference", RECEIVED_WITH_REFERENCE],
  ])("is not titled as money to chase %s", (_name, message) => {
    expect(view("received-title", message).title).not.toMatch(/money back to chase/i);
  });

  it.each([
    ["without a reference", RECEIVED_PLAIN],
    ["with a reference", RECEIVED_WITH_REFERENCE],
  ])("does not make a complaint the immediate action %s", (_name, message) => {
    const { primaryKind, primaryLabel } = view("received-action", message);

    expect(primaryLabel).not.toMatch(/complaint/i);
    expect(primaryKind).not.toBe("draft_message");
  });

  it("offers no complaint or chase draft at all", () => {
    expect(view("received-draft", RECEIVED_PLAIN).hasDraft).toBe(false);
  });

  it("does not imply the money is still pending or needs chasing", () => {
    const { visible, allActionText } = view("received-pending", RECEIVED_PLAIN);

    expect(visible).not.toMatch(/pending recovery/i);
    expect(visible).not.toMatch(/chase if not received/i);
    expect(visible).not.toMatch(/has not confirmed receipt yet/i);
    // No instruction to chase or complain. Reassurance that nothing is needed is
    // fine, so the copy avoids those words entirely and this stays strict.
    expect(allActionText).not.toMatch(/chase|complain|follow up on my refund/i);
  });

  it("uses calm completed wording from the existing vocabulary", () => {
    const { primaryKind, primaryLabel } = view("received-calm", RECEIVED_PLAIN);

    expect(primaryKind).toBe("evidence_checklist");
    expect(primaryLabel).toMatch(/keep|confirmation|record|no further action/i);
  });

  it("keeps the amount and the reference intact", () => {
    // Amounts render as "GBP 68.40" in the money panel, so the assertion is on the
    // value rather than a currency symbol.
    expect(view("received-facts", RECEIVED_PLAIN).visible).toContain("68.40");

    const withReference = view("received-reference", RECEIVED_WITH_REFERENCE);
    expect(withReference.visible).toContain("68.40");
    expect(withReference.visible).toContain("RF-20481");
  });

  it("does not count the money as recovered", () => {
    const { journey } = view("received-money", RECEIVED_PLAIN);

    for (const line of journey.resultViewModel.moneyMentioned) {
      expect(line.countedInMoneyTracker).toBe(false);
      expect(line.treatment).toBe("no_money_counted");
    }
    expect(journey.visibleText).not.toMatch(/money recovered|saved so far|counted as recovered/i);
  });

  it("logs no pending recovery in the impact ledger", () => {
    const { journey } = view("received-ledger", RECEIVED_PLAIN);

    expect(journey.impactEntries.map((entry) => entry.type)).not.toContain("pending_recovery");
  });

  it("takes no automatic action", () => {
    const { visible } = view("received-no-auto", RECEIVED_PLAIN);

    expect(visible).not.toMatch(/we have contacted|has been sent|we have claimed|we have applied/i);
    expect(visible).toMatch(/does not contact anyone|you decide/i);
  });
});

// --- 3 to 8: every other state keeps what it had ---------------------------

describe("other refund states are untouched", () => {
  it("approved and waiting still checks the stated window", () => {
    const { primaryKind, primaryLabel } = view(
      "approved-window",
      "Your refund of £68.40 has been approved. It will be paid within 5 to 10 working days. Your reference is RF-20481.",
    );

    expect(primaryKind).toBe("deadline_checklist");
    expect(primaryLabel).toMatch(/refund window/i);
  });

  it("approved with the window gone can still escalate", () => {
    const { hasDraft, allActionText } = view(
      "window-gone",
      "Your refund of £68.40 was due within 5 to 10 working days and has not arrived.",
    );

    expect(hasDraft).toBe(true);
    expect(allActionText).toMatch(/draft|complaint|follow/i);
  });

  it("a refused refund can still escalate", () => {
    const { hasDraft, primaryKind } = view(
      "refused",
      "We have refused your £68.40 refund request after reviewing the return.",
    );

    expect(primaryKind).toBe("draft_message");
    expect(hasDraft).toBe(true);
  });

  it("a refund that was not approved is not treated as received", () => {
    const message = "Your refund of £68.40 has not been approved.";

    expect(assessRefundState(message).stage).not.toBe("received");
    expect(view("not-approved", message).primaryKind).toBe("draft_message");
  });

  it("issued but not confirmed received keeps its existing semantics", () => {
    const message = "Your refund of £68.40 has been issued to the original payment method.";

    expect(assessRefundState(message).stage).toBe("issued");
    expect(view("issued", message).title).not.toMatch(/money back to chase/i);
  });

  it.each([
    ["the refund has not reached my account", "The refund has not reached my account."],
    ["I have not received the refund", "I have not received the refund of £68.40."],
  ])("negated receipt (%s) remains chaseable", (_name, message) => {
    expect(assessRefundState(message).stage).not.toBe("received");
    expect(view("negated", message).hasDraft).toBe(true);
  });
});

// --- 9 to 11: neighbouring journeys ---------------------------------------

describe("neighbouring journeys are unchanged", () => {
  it("a payment confirmation that is not a refund is unaffected", () => {
    const { title, visible } = view(
      "payment-confirmation",
      "Thank you for your payment. Your account balance is now GBP 0.00. No action is required.",
    );

    expect(title).toMatch(/information-only confirmation/i);
    expect(visible).not.toMatch(/money back to chase/i);
  });

  it("security precedence still wins over received-refund wording", () => {
    const journey = run(
      "security-received",
      "Your parcel is held. Pay a £1.50 redelivery fee using parcel-check.example/link. Your £12.00 refund reached your account.",
    );
    const primary = journey.guidedNextStep.primaryAction as { label?: string };

    expect(journey.adminCase.title).toMatch(/safety check|security alert/i);
    expect(primary.label ?? "").toMatch(/safety checklist/i);
  });

  it("keeps pence exactly in the received amount", () => {
    const { visible } = view("received-decimal", RECEIVED_WITH_REFERENCE);

    expect(visible).toContain("68.40");
    expect(visible).not.toMatch(/£68\b(?!\.40)/);
  });
});

// --- Remaining completed-refund lifecycle wording --------------------------

const COMPLETED_REFUND_WORDING = [
  "Your refund has arrived.",
  "Your refund has been received.",
  "Refund received.",
  "Refund successful.",
  "Refund complete.",
  "Your refund has been paid.",
  "We've paid your refund.",
  "We've sent the refund to your bank account.",
  "The refund has reached your account.",
  "The refund is back in your bank account.",
  "The money has been returned.",
  "The refund has been credited.",
  "The refund has been returned to your original payment method.",
  "The amount has been refunded to your card.",
  "We've processed your refund and the money is now in your account.",
  "Your £68.40 refund is now back in your bank account.",
  "£68.40 has been refunded.",
  "Refund issued and received.",
  "Refund deposited.",
  "Refund credited today.",
  "Money returned successfully.",
  "Refund now showing in your account.",
  "Your refund has arrived. No further action is required.",
] as const;

const PENDING_REFUND_WORDING = [
  "Refund approved.",
  "Refund authorised.",
  "Refund accepted.",
  "Refund initiated.",
  "Refund requested.",
  "Refund processing.",
  "Refund is being processed.",
  "Refund has been sent.",
  "Refund is on its way.",
  "Refund should arrive in 5 working days.",
  "Refund within 7 working days.",
  "Refund expected within 10 working days.",
  "Refund may take 3–5 business days.",
  "Refund released today.",
  "Refund scheduled.",
  "Refund queued.",
  "Money is on its way.",
] as const;

describe("completed refund lifecycle wording", () => {
  it.each(COMPLETED_REFUND_WORDING)("reads completed wording as received: %s", (message) => {
    expect(assessRefundState(message).stage).toBe("received");
  });

  it.each(COMPLETED_REFUND_WORDING)("uses the completed result and no chase action: %s", (message) => {
    const result = view(`completed-${message}`, message);

    expect(result.title).toBe("Refund confirmed as received");
    expect(result.primaryKind).toBe("evidence_checklist");
    expect(result.hasDraft).toBe(false);
    expect(`${result.visible}\n${result.allActionText}`).not.toMatch(
      /money back to chase|track refund|pending recovery|create complaint draft/i,
    );
  });

  it("preserves a completed amount and reference without counting recovery", () => {
    const result = view(
      "completed-amount-reference",
      "Your £68.40 refund is now back in your bank account. Reference RF-20481.",
    );

    expect(result.visible).toContain("68.40");
    expect(result.visible).toContain("RF-20481");
    for (const line of result.journey.resultViewModel.moneyMentioned) {
      expect(line.countedInMoneyTracker).toBe(false);
    }
  });
});

describe("pending refund lifecycle wording", () => {
  it.each(PENDING_REFUND_WORDING)("never promotes pending wording to completed: %s", (message) => {
    expect(assessRefundState(message).stage).not.toBe("received");
    expect(view(`pending-${message}`, message).title).not.toBe("Refund confirmed as received");
  });
});

describe("completed-refund negative controls", () => {
  it.each([
    "Your refund was denied.",
    "Your refund was rejected.",
    "Your refund was declined.",
    "No refund has been approved.",
    "Your refund has not been received.",
    "Your refund was cancelled.",
    "A partial refund remains under review.",
    "Your chargeback is under review.",
    "A credit note has been added to the order.",
    "Store credit is available on your account.",
    "Your compensation request is under review.",
    "Cashback may be available.",
    "Your payment has been received.",
    "This is confirmation that your payment was received.",
    "Your subscription renews for £9.99 per month.",
    "Your broadband price will rise from £30 to £34 per month.",
  ])("does not create a completed refund for: %s", (message) => {
    expect(view(`non-completed-${message}`, message).title).not.toBe(
      "Refund confirmed as received",
    );
  });

  it("keeps mixed-message security precedence", () => {
    const result = view(
      "completed-security-precedence",
      "Your refund has arrived. Reply with your one-time passcode to confirm it.",
    );

    expect(result.journey.adminCase.title).toMatch(/safety check|security alert/i);
    expect(result.primaryLabel).toMatch(/safety checklist/i);
  });
});
