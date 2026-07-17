import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmailSafetyModal } from "../../components/EmailSafetyModal";
import type { AdminItem, EmailSafetyAssessment } from "../../types";
import { createAdminCase } from "../caseFactory";
import { exportCaseToMarkdown } from "../exportCase";
import { createPreparedMessageDraft } from "../messageDrafts";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import {
  assessEmailSafety,
  createEmailSafetyFinding,
  getEmailSafetyOrdinarySignals,
  getEmailSafetyRiskBand,
  getEmailSafetyRiskBandLabel,
} from "../suspiciousEmail";

const now = "2026-07-17T10:00:00.000Z";

const makeItem = (title: string, rawText: string, sourceType: AdminItem["sourceType"] = "email"): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
});

const forbiddenScamScorePattern =
  /\b\d{1,3}%\b|safePercent|cautionPercent|threatPercent|overallLevel|overallLabel|safeSignals|percentage chance|likelihood percentage|score out of|probability/i;

const expectNoScamScores = (label: string, value: unknown) => {
  expect(JSON.stringify(value), label).not.toMatch(forbiddenScamScorePattern);
};

describe("email safety risk bands", () => {
  it("returns deterministic plain-language bands without public percentage fields", () => {
    const high = assessEmailSafety(
      "Sender: support@secure-bank-login-example.com\nReply-to: randomhelpdesk@example.net\nYour account will be locked today. Click this link immediately to verify your bank details.",
      "email",
    );
    const caution = assessEmailSafety(
      "From: billing@example.com\nSubject: Action required today\nPlease verify your account details through your usual account route.",
      "email",
    );
    const lower = assessEmailSafety(
      "From: noreply@google.com\nGoogle Play receipt. Order number GP123. Price: £18.99. Manage subscriptions in the official app.",
      "email",
    );

    expect(getEmailSafetyRiskBand(high)).toBe("high_risk_signals");
    expect(getEmailSafetyRiskBand(caution)).toBe("verify_before_acting");
    expect(getEmailSafetyRiskBand(lower)).toBe("lower_risk_verify");

    for (const assessment of [high, caution, lower]) {
      expect(Object.keys(assessment)).not.toEqual(expect.arrayContaining(["safePercent", "cautionPercent", "threatPercent"]));
      expectNoScamScores(assessment.riskBandLabel, assessment);
    }

    expect(assessEmailSafety(high.riskSignals.join(" "), "email").riskSignals).toEqual(
      assessEmailSafety(high.riskSignals.join(" "), "email").riskSignals,
    );
  });

  it("keeps case, opportunity, checklist, export, and modal output free of scam percentages", () => {
    const item = makeItem(
      "Your account will be locked today",
      "Sender: support@secure-bank-login-example.com\nReply-to: randomhelpdesk@example.net\nSubject: Your account will be locked today\n\nYour account will be locked today. Click this link immediately to verify your bank details and avoid suspension.",
    );
    const assessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);
    const finding = createEmailSafetyFinding(item, assessment);
    const adminCase = createAdminCase(finding, item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });
    const markdown = exportCaseToMarkdown({ adminCase, item, finding, drafts: [], opportunity });
    const modalHtml = renderToStaticMarkup(
      <EmailSafetyModal assessment={assessment} onClose={() => undefined} onSaveCase={() => undefined} />,
    );

    expect(adminCase.valueLabel).toBe("High-risk signals found");
    expect(adminCase.evidence.map((evidence) => evidence.label)).not.toContain("Threat signals");
    expect(adminCase.evidence.map((evidence) => evidence.label)).not.toContain("Normal/lower-risk signals");
    expect(opportunity.statusLabel).toBe("High-risk signals found");
    expect(draft.safetyNote).toContain("cannot determine whether this is a scam");
    expect(markdown).toContain("Plain-language band");
    expect(markdown).toContain("What AdminAvenger Cannot Confirm");
    expect(modalHtml).toContain("High-risk signals found");

    expectNoScamScores("case", adminCase);
    expectNoScamScores("opportunity", opportunity);
    expectNoScamScores("draft", draft);
    expectNoScamScores("export", markdown);
    expectNoScamScores("modal", modalHtml);
  });

  it("opens legacy saved assessments without surfacing legacy labels or percentage fields", () => {
    const legacyAssessment = {
      isEmailLike: true,
      overallLevel: "high_risk",
      overallLabel: "High risk 90%",
      safePercent: 5,
      cautionPercent: 15,
      threatPercent: 80,
      riskSignals: ["Reply-to mismatch"],
      cautionSignals: ["Urgent pressure"],
      safeSignals: ["Contains a reference number"],
      replyToMismatch: true,
      nextAction: "Verify independently.",
      disclaimer: "Legacy record.",
    } as unknown as EmailSafetyAssessment;
    const html = renderToStaticMarkup(
      <EmailSafetyModal assessment={legacyAssessment} onClose={() => undefined} />,
    );

    expect(getEmailSafetyRiskBandLabel(legacyAssessment)).toBe("High-risk signals found");
    expect(getEmailSafetyOrdinarySignals(legacyAssessment)).toEqual(["Contains a reference number"]);
    expect(html).toContain("High-risk signals found");
    expectNoScamScores("legacy modal", html);
  });

  it("does not remove unrelated source-backed percentages from non-scam exports", () => {
    const item = makeItem(
      "Broadband price rise",
      "Example Broadband says your monthly price will increase by 7.5% from 1 August 2026. Current monthly price £25.00. New monthly price £26.88.",
      "bill",
    );
    const [finding] = analyseAdminItem(item);

    if (!finding) {
      throw new Error("Expected a finding for broadband price-rise text");
    }

    const adminCase = createAdminCase(finding, item);
    const markdown = exportCaseToMarkdown({ adminCase, item, finding, drafts: [] });

    expect(markdown).toContain("7.5%");
  });
});
