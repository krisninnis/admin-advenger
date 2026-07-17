import { describe, expect, it } from "vitest";
import type { AdminCase, AdminFinding } from "../../types";
import {
  createAdminDraftFromGuidedDraft,
  markSelectedCaseDrafted,
  markSelectedFindingDrafted,
} from "../guidedDraftSave";

const makeCase = (id: string, findingId: string): AdminCase => ({
  id,
  findingId,
  itemId: "item-1",
  title: `Case ${id}`,
  category: "important_reply",
  summary: "Summary",
  urgency: "medium",
  confidence: "medium",
  status: "new",
  nextAction: "Review before acting.",
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
  evidence: [],
  timeline: [],
});

const makeFinding = (id: string): AdminFinding => ({
  id,
  itemId: "item-1",
  category: "important_reply",
  title: `Finding ${id}`,
  summary: "Summary",
  whyItMatters: "It may need a reply.",
  suggestedAction: "Review before acting.",
  urgency: "medium",
  confidence: "medium",
  status: "new",
  createdAt: "2026-07-17T10:00:00.000Z",
});

describe("guided draft save helpers", () => {
  it("converts the reviewed guided draft to the existing AdminDraft shape", () => {
    const adminCase = makeCase("case-1", "finding-1");
    const draft = createAdminDraftFromGuidedDraft(
      adminCase,
      {
        subject: "Payment reminder query",
        body: "Edited body exactly as reviewed.",
        safetyNote: "AdminAvenger does not send this.",
      },
      "2026-07-17T11:00:00.000Z",
    );

    expect(draft).toMatchObject({
      findingId: "finding-1",
      subject: "Payment reminder query",
      body: "Edited body exactly as reviewed.",
      recommendedNextStep: "AdminAvenger does not send this.",
      chaseAfterDays: 7,
      createdAt: "2026-07-17T11:00:00.000Z",
    });
    expect(draft.id).toMatch(/^draft-/);
  });

  it("marks only the selected case and finding as drafted", () => {
    const cases = [makeCase("case-1", "finding-1"), makeCase("case-2", "finding-2")];
    const findings = [makeFinding("finding-1"), makeFinding("finding-2")];

    const updatedCases = cases.map((adminCase) =>
      adminCase.id === "case-1"
        ? markSelectedCaseDrafted(adminCase, "2026-07-17T11:00:00.000Z")
        : adminCase,
    );
    const updatedFindings = findings.map((finding) =>
      finding.id === "finding-1" ? markSelectedFindingDrafted(finding) : finding,
    );

    expect(updatedCases.find((adminCase) => adminCase.id === "case-1")?.status).toBe("drafted");
    expect(updatedCases.find((adminCase) => adminCase.id === "case-2")?.status).toBe("new");
    expect(updatedFindings.find((finding) => finding.id === "finding-1")?.status).toBe("drafted");
    expect(updatedFindings.find((finding) => finding.id === "finding-2")?.status).toBe("new");
  });
});
