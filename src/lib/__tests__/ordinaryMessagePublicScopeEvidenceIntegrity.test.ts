import { describe, expect, it } from "vitest";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

const COMMUNICATION_EVIDENCE_LABELS = [
  "Importance wording",
  "Urgency wording",
  "Reply request",
  "Action request",
] as const;

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const inspect = (id: string, message: string) => {
  const journey = run(id, message);
  const resultEvidence = journey.resultViewModel.evidenceFound;
  const communicationEvidence = resultEvidence.filter((entry) =>
    COMMUNICATION_EVIDENCE_LABELS.includes(
      entry.label as (typeof COMMUNICATION_EVIDENCE_LABELS)[number],
    ),
  );
  const actions = [journey.guidedNextStep.primaryAction, ...journey.guidedNextStep.secondaryActions];

  for (const entry of communicationEvidence) {
    expect(message.toLowerCase(), `${entry.label}: ${entry.value} must be source-grounded`).toContain(
      entry.value.toLowerCase(),
    );
  }

  return {
    journey,
    title: journey.resultViewModel.title,
    findingTitle: journey.finding?.title,
    urgency: journey.finding?.urgency,
    opportunityType: journey.opportunity.opportunityType,
    evidence: resultEvidence.map(({ label, value }) => ({ label, value })),
    communicationEvidence,
    dates: journey.resultViewModel.keyDates.map(({ label, value }) => ({ label, value })),
    actions,
    hasDraft: actions.some((action) => action.kind === "draft_message"),
    primaryKind: journey.guidedNextStep.primaryAction.kind,
    primaryLabel: journey.guidedNextStep.primaryAction.label,
    bestNextMove: journey.resultViewModel.bestNextMove?.label,
    visible: journey.visibleText,
  };
};

const expectNoReplySemantics = (result: ReturnType<typeof inspect>) => {
  expect(result.findingTitle).not.toBe("Important reply needed");
  expect(result.communicationEvidence).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ label: "Reply request" })]),
  );
  expect(result.hasDraft).toBe(false);
};

describe("ordinary-message-public-scope-evidence-integrity-v1", () => {
  it("1. preserves a genuine reply request, reply deadline and editable draft", () => {
    const result = inspect("genuine-reply", "Please reply by 20 August");

    expect(result.findingTitle).toBe("Important reply needed");
    expect(result.communicationEvidence).toContainEqual({
      id: expect.any(String),
      label: "Reply request",
      value: "reply",
      source: "case",
    });
    expect(result.dates).toContainEqual({ label: "Reply deadline", value: "20 August" });
    expect(result.hasDraft).toBe(true);
  });

  it("2. preserves standalone importance without inventing urgency or correspondence", () => {
    const result = inspect("standalone-important", "Important: your account needs attention");

    expect(result.title).toBe("Important message to check");
    expect(result.urgency).toBe("medium");
    expect(result.communicationEvidence).toContainEqual(
      expect.objectContaining({ label: "Importance wording", value: "Important" }),
    );
    expect(result.communicationEvidence).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Urgency wording" }),
        expect.objectContaining({ label: "Reply request" }),
        expect.objectContaining({ label: "Action request" }),
      ]),
    );
    expect(result.bestNextMove).toBe("Review what needs attention");
    expectNoReplySemantics(result);
  });

  it("3. treats a bare do-not-reply instruction as non-correspondence", () => {
    const result = inspect("bare-do-not-reply", "Please do not reply");

    expect(result.urgency).toBe("low");
    expect(result.communicationEvidence).toEqual([]);
    expectNoReplySemantics(result);
  });

  it("4. keeps no-reply-needed wording information-only", () => {
    const result = inspect("no-reply-needed", "No reply is needed");

    expect(result.title).toBe("Information-only confirmation");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryLabel).toBe("Keep confirmation");
    expectNoReplySemantics(result);
  });

  it("5. keeps do-not-need-to-reply wording information-only", () => {
    const result = inspect("do-not-need-reply", "You do not need to reply");

    expect(result.title).toBe("Information-only confirmation");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryLabel).toBe("Keep confirmation");
    expectNoReplySemantics(result);
  });

  it("6. treats do-not-need-to-respond like do-not-need-to-reply", () => {
    const result = inspect("do-not-need-respond", "You do not need to respond");

    expect(result.title).toBe("Information-only confirmation");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryLabel).toBe("Keep confirmation");
    expectNoReplySemantics(result);
  });

  it("7. treats no-response-required wording as information-only", () => {
    const result = inspect("no-response-required", "No response is required");

    expect(result.title).toBe("Information-only confirmation");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryLabel).toBe("Keep confirmation");
    expectNoReplySemantics(result);
  });

  it("8. suppresses reply semantics for please-do-not-respond", () => {
    const result = inspect("please-do-not-respond", "Please do not respond");

    expect(result.communicationEvidence).toEqual([]);
    expectNoReplySemantics(result);
  });

  it("9. preserves importance while suppressing the separate reply instruction", () => {
    const result = inspect("important-no-reply", "Important notice. Please do not reply.");

    expect(result.title).toBe("Important message to check");
    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Importance wording", value: "Important notice" }),
    ]);
    expect(result.bestNextMove).toBe("Review what needs attention");
    expectNoReplySemantics(result);
  });

  it("10. keeps security precedence authoritative over ordinary communication", () => {
    const result = inspect(
      "security-no-reply",
      "Urgent refund notice — send us your one-time passcode. Do not reply to this email.",
    );

    expect(result.title).toBe("Email needs safety check");
    expect(result.journey.adminCase.securityPrecedence).toBe(true);
    expect(result.primaryLabel).toBe("View safety checklist");
    expect(result.communicationEvidence).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Reply request" })]),
    );
  });

  it("11. preserves an independent payment date while suppressing reply", () => {
    const result = inspect(
      "no-reply-payment-date",
      "Please do not reply. Your payment is due on 20 August.",
    );

    expect(result.dates).toContainEqual({ label: "Payment due date", value: "20 August" });
    expectNoReplySemantics(result);
  });

  it("12. keeps a passive personal PIP review preparation-only", () => {
    const result = inspect("passive-pip-self", "My PIP is being reviewed.");

    expect(result.title).toBe("This needs a careful human review");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryKind).toBe("evidence_checklist");
    expectNoReplySemantics(result);
  });

  it("13. keeps a passive family-member PIP review preparation-only", () => {
    const result = inspect("passive-pip-wife", "My wife has a PIP review.");

    expect(result.title).toBe("This needs a careful human review");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryKind).toBe("evidence_checklist");
    expect(result.visible).not.toContain("Reply or action wording found");
    expectNoReplySemantics(result);
  });

  it("14. preserves importance on a public-scope PIP review without correspondence", () => {
    const result = inspect(
      "important-pip",
      "Important: this letter is about your PIP review.",
    );

    expect(result.title).toBe("This needs a careful human review");
    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Importance wording", value: "Important" }),
    ]);
    expectNoReplySemantics(result);
  });

  it("15. suppresses reply and generic drafting on a public-scope PIP review", () => {
    const result = inspect(
      "no-reply-pip",
      "Please do not reply. Your PIP is being reviewed.",
    );

    expect(result.title).toBe("This needs a careful human review");
    expect(result.communicationEvidence).toEqual([]);
    expectNoReplySemantics(result);
  });

  it("16. keeps payment action and timing after a reply-negation contrast boundary", () => {
    const result = inspect("no-reply-pay", "Do not reply, but please pay by 20 August.");

    expect(result.dates).toContainEqual({ label: "Payment due date", value: "20 August" });
    expect(result.communicationEvidence).toContainEqual(
      expect.objectContaining({ label: "Action request", value: "please pay" }),
    );
    expectNoReplySemantics(result);
  });

  it("17. preserves a later genuine response request after a closed negated sentence", () => {
    const result = inspect(
      "later-positive-response",
      "Do not reply to this email. Please respond through your secure account by 20 August.",
    );

    expect(result.communicationEvidence).toContainEqual(
      expect.objectContaining({ label: "Reply request", value: "respond" }),
    );
    expect(result.dates).toContainEqual({ label: "Reply deadline", value: "20 August" });
    expect(result.hasDraft).toBe(true);
  });

  it("18. preserves standalone urgency without inferring reply", () => {
    const result = inspect("standalone-urgent", "Urgent: check your account today.");

    expect(result.urgency).toBe("high");
    expect(result.journey.finding?.communicationEvidence).toEqual([
      {
        kind: "urgency",
        sourceQuote: "Urgent",
        start: 0,
        end: 6,
      },
    ]);
    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Urgency wording", value: "Urgent" }),
    ]);
    expectNoReplySemantics(result);
  });

  it("preserves source-grounded urgency alongside a genuine reply request", () => {
    const result = inspect("urgent-reply", "Urgent: please reply by 20 August.");

    expect(result.findingTitle).toBe("Important reply needed");
    expect(result.urgency).toBe("high");
    expect(result.journey.finding?.communicationEvidence).toEqual([
      expect.objectContaining({ kind: "urgency", sourceQuote: "Urgent" }),
      expect.objectContaining({ kind: "reply_request", sourceQuote: "reply" }),
    ]);
    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Urgency wording", value: "Urgent" }),
      expect.objectContaining({ label: "Reply request", value: "reply" }),
    ]);
  });

  it("19. keeps an explicit non-reply action on a checklist path", () => {
    const result = inspect(
      "action-required-upload",
      "Action required: upload the completed form through your account.",
    );

    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Action request", value: "Action required" }),
    ]);
    expect(result.primaryKind).toBe("evidence_checklist");
    expectNoReplySemantics(result);
  });

  it("also recognises a polite upload instruction as a non-reply action", () => {
    const result = inspect("please-upload", "Please upload the document by Friday.");

    expect(result.communicationEvidence).toEqual([
      expect.objectContaining({ label: "Action request", value: "Please upload" }),
    ]);
    expect(result.primaryKind).toBe("evidence_checklist");
    expectNoReplySemantics(result);
  });

  it("20. keeps no-action-required wording information-only", () => {
    const result = inspect("no-action-required", "No action is required.");

    expect(result.title).toBe("Information-only confirmation");
    expect(result.communicationEvidence).toEqual([]);
    expect(result.primaryLabel).toBe("Keep confirmation");
    expectNoReplySemantics(result);
  });
});
