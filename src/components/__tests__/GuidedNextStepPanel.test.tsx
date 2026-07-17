import { describe, expect, it } from "vitest";
import type { NextStepAction } from "../../lib/guidedNextSteps";
import { getGuidedDraftToSave } from "../../lib/guidedDraftSave";

describe("getGuidedDraftToSave", () => {
  it("uses the current edited draft text, subject, and safety note", () => {
    const action: NextStepAction = {
      kind: "draft_message",
      label: "Create draft message",
      title: "Payment reminder query",
      body: "Original body",
      copyButtonLabel: "Copy draft",
      safetyNote: "Review it. Nothing is sent.",
    };

    expect(getGuidedDraftToSave(action, "Edited body from the textarea")).toEqual({
      subject: "Payment reminder query",
      body: "Edited body from the textarea",
      safetyNote: "Review it. Nothing is sent.",
    });
  });

  it("keeps non-draft guided saves payload-free", () => {
    const action: NextStepAction = {
      kind: "evidence_checklist",
      label: "Add evidence",
      title: "Evidence to gather",
      evidenceNeeded: ["Proof of payment"],
    };

    expect(getGuidedDraftToSave(action, "Ignored text")).toBeUndefined();
  });
});
