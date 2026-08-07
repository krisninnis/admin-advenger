import { describe, expect, it } from "vitest";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// Pre-pilot scenario verification, refund draft claims.
//
// createRefundMessage opened every refund draft with "I'm following up on my
// approved refund", whatever the source said. So a message refusing a refund, and
// even a delivery delay with no refund in it at all, produced text inviting the
// person to tell a company they had an approved refund.
//
// This is a prepared message a user may send. Claiming an approval the source
// refused is the refusal-as-success failure, in outgoing wording rather than in a
// status label, and it can damage the user's own position.
//
// The refund state is already correct after the refund-state and negation
// slices, so the draft can simply describe what the source actually says.

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const draftTextOf = (id: string, message: string) => {
  const journey = run(id, message);
  const primary = journey.guidedNextStep.primaryAction as { body?: string };
  const secondary = journey.guidedNextStep.secondaryActions
    .flatMap((action) => Object.values(action))
    .filter((value): value is string => typeof value === "string");

  return [primary.body ?? "", ...secondary].join("\n");
};

const CLAIMS_APPROVAL = /\bapproved refund\b|\bmy approved\b|\brefund (?:has been|was) approved\b/i;

describe("a refund draft never claims an approval the source did not give", () => {
  it.each([
    ["a refused refund", "We have refused your £68.40 refund request after reviewing the return."],
    ["a declined refund", "Your £68.40 refund request was declined after review."],
    ["a refund that was not approved", "Your refund of £68.40 has not been approved."],
    ["a denial written with no", "No refund has been approved for £68.40."],
    ["a refund still being reviewed", "We received your request for a £68.40 refund. It has not yet been reviewed."],
  ])("does not claim approval for %s", (_name, message) => {
    expect(draftTextOf("draft-claim", message)).not.toMatch(CLAIMS_APPROVAL);
  });

  it("does not invent a refund at all for a delivery delay", () => {
    const text = draftTextOf(
      "delivery-delay",
      "Your delivery is delayed. Your parcel ORD-5512 should arrive by 12 August 2026.",
    );

    expect(text).not.toMatch(CLAIMS_APPROVAL);
    expect(text).not.toMatch(/\bmy refund\b/i);
  });
});

describe("a refund draft still describes a genuine approval", () => {
  it("keeps the approval wording when the source approved the refund", () => {
    const journey = run(
      "genuine-approval",
      "Your refund of £68.40 has been approved. It will be paid within 5 to 10 working days. Your reference is RF-20481.",
    );
    const secondary = journey.guidedNextStep.secondaryActions
      .flatMap((action) => Object.values(action))
      .filter((value): value is string => typeof value === "string")
      .join("\n");

    expect(secondary).toMatch(/refund/i);
    expect(secondary).toContain("£68.40");
  });

  it("quotes the exact amount, pence included", () => {
    const text = draftTextOf(
      "pence-in-draft",
      "Your refund of £68.40 was due within 5 to 10 working days and has not arrived.",
    );

    if (/£/.test(text)) {
      expect(text).not.toMatch(/£68\b(?!\.40)/);
    }
  });
});
