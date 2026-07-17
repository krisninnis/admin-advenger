import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { createAdminCase } from "../caseFactory";
import { deriveImpactFromCase } from "../impactLedger";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { exportCaseToMarkdown } from "../exportCase";
import { getTrustedGuidanceForOpportunity } from "../trustedGuidanceMatcher";
import { createAdminDraftFromGuidedDraft } from "../guidedDraftSave";

const makePaymentReminderItem = (): AdminItem => ({
  id: "item-payment-reminder",
  title: "journey-2-payment-reminder.pdf",
  sourceType: "bill",
  rawText: [
    "Greenfield Water Services",
    "Payment reminder",
    "Date: 14 July 2026",
    "Account reference: GW-48291",
    "Our records show an unpaid balance of \u00a384.60.",
    "Payment was due on 10 July 2026.",
    "Please pay the balance or contact us by 24 July 2026.",
    "If you have already paid, send us proof of payment so we can update the account.",
  ].join("\n"),
  createdAt: "2026-07-17T10:00:00.000Z",
  analysedAt: "2026-07-17T10:00:00.000Z",
});

describe("exportCaseToMarkdown", () => {
  it("exports payment reminder evidence cleanly with saved draft history and no refund guidance", () => {
    const item = makePaymentReminderItem();
    const [finding] = analyseAdminItem(item);

    if (!finding) {
      throw new Error("Expected payment reminder finding");
    }

    const adminCase = createAdminCase(finding, item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impactEntries = deriveImpactFromCase(adminCase, item, finding);
    const draft = createAdminDraftFromGuidedDraft(
      adminCase,
      {
        subject: "Payment reminder query",
        body: "Edited body saved from guided panel.",
        safetyNote: "AdminAvenger does not send this.",
      },
      "2026-07-17T11:00:00.000Z",
    );
    const guidanceCards = getTrustedGuidanceForOpportunity(opportunity);
    const markdown = exportCaseToMarkdown({
      adminCase,
      item,
      finding,
      drafts: [draft],
      impactEntries,
      opportunity,
      guidanceCards,
    });

    expect(markdown).toContain("- **Letter date** (detected): 14 July 2026");
    expect(markdown).toContain("- **Case opened** - ");
    expect(markdown).not.toContain("- - **");
    expect(markdown).not.toContain("tracked..");
    expect(markdown).toContain("### Draft 1: Payment reminder query");
    expect(markdown).toContain("Edited body saved from guided panel.");
    expect(markdown).toContain("Source title: journey-2-payment-reminder.pdf");
    expect(markdown).not.toContain("Refund or recovery checklist");
    expect(impactEntries.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(impactEntries.some((entry) => entry.type === "confirmed_recovered")).toBe(false);
    expect(impactEntries.some((entry) => entry.type === "confirmed_saved")).toBe(false);
  });
});
