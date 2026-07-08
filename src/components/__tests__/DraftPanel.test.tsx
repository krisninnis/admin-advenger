import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DraftPanel } from "../DraftPanel";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";
import type { AdminCase, AdminDraft } from "../../types";

const adminCase: AdminCase = {
  id: "case-1",
  findingId: "finding-1",
  itemId: "item-1",
  title: "Refund approved",
  category: "refund",
  summary: "A refund was approved.",
  urgency: "medium",
  confidence: "high",
  status: "drafted",
  nextAction: "Chase if not received in 10 days.",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  evidence: [],
  timeline: [],
};

const draft: AdminDraft = {
  id: "draft-1",
  findingId: "finding-1",
  subject: "Chasing my refund",
  body: "Hello, I am following up on my refund of GBP 42.99. Could you confirm when it will arrive?",
  recommendedNextStep: "Send this if the refund has not arrived within 10 working days.",
  chaseAfterDays: 10,
  createdAt: "2026-07-01T00:00:00.000Z",
};

describe("DraftPanel", () => {
  it("shows a 'Copy' button beside the prepared message once a draft exists", () => {
    const html = renderToStaticMarkup(
      <DraftPanel
        adminCase={adminCase}
        draft={draft}
        onGenerateDraft={async () => undefined}
        isGeneratingDraft={false}
      />,
    );

    expect(html).toContain('aria-label="Copy message"');
    expect(html).toContain(">Copy<");
    expect(html).toContain(draft.subject);
    expect(html).toContain(draft.body);
  });

  it("does not show a copy button when no draft has been prepared yet", () => {
    const html = renderToStaticMarkup(
      <DraftPanel
        adminCase={adminCase}
        draft={undefined}
        onGenerateDraft={async () => undefined}
        isGeneratingDraft={false}
      />,
    );

    expect(html).not.toContain("aria-label=\"Copy message\"");
    expect(html).toContain("No message prepared yet.");
  });

  it("never sends, submits, or contacts anyone - and uses no forbidden safety wording", () => {
    const html = renderToStaticMarkup(
      <DraftPanel
        adminCase={adminCase}
        draft={draft}
        onGenerateDraft={async () => undefined}
        isGeneratingDraft={false}
      />,
    );

    expect(html).toContain("You review and approve before anything is sent.");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });
});
