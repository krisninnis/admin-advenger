import { describe, expect, it } from "vitest";
import type { AdminCase, AdminItem } from "../../types";
import { buildCaseProgress, flattenCaseProgressText } from "../caseProgress";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { deriveGuidedNextStep } from "../guidedNextSteps";
import { deriveImpactFromCase } from "../impactLedger";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import {
  buildResultViewModel,
  flattenResultViewModelText,
  validateResultViewModelSafety,
} from "../resultViewModel";

const targetMessage = `Thank you for sending us the death certificate.

We have now closed the account. There was an outstanding final balance of £126.40, but after reviewing the circumstances our bereavement team has agreed to remove this charge.

You do not need to make a payment and no further bills will be issued.

Please keep this email for your records. If any further direct debit is collected, contact our bereavement team and quote reference BRV-48271.`;

const exactBrowserScenarios = {
  pendingWaiver: `Thank you for sending the death certificate. The account has been closed.

We have received your request for the final balance of £152.75 to be waived. Our bereavement team is still reviewing this request and has not yet made a decision.

You do not need to contact us again unless you have not heard from us within 21 days.

Reference: BR-10482.`,
  cleanResolved: `We have closed the account and cancelled the outstanding balance of £93.18.

No payment is required. No further bills or Direct Debits will be issued.

Please keep this confirmation for your records. Reference CLS-9318.`,
  closureNotCompleted: `Once we receive the death certificate, we will be able to close the account.

Until then, the account remains active and monthly charges will continue. Please send the document by 12 August 2026.

Reference DOC-12884.`,
  finalNotice: `FINAL NOTICE

The account has been closed, but an unpaid balance of £210.00 remains outstanding.

Unless payment is received by 7 August 2026, the balance may be referred for further collection activity.

If you believe this is incorrect, contact the bereavement team using reference COL-21077.`,
  futureLiability: `We have closed the account and no further bills will be issued.

The final balance is £58.90. You do not need to pay this amount today, but it may become payable after our bereavement review is completed.

We will write to you again with our decision.`,
} as const;

const buildPublicJourney = (rawText: string, reconstruct = false) => {
  const item: AdminItem = {
    id: "synthetic-account-outcome",
    title: "Provider account update",
    sourceType: "email",
    rawText,
    createdAt: "2026-07-30T09:00:00.000Z",
  };
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const stored = reconstruct
    ? JSON.parse(JSON.stringify({ item, findings, cases })) as {
        item: AdminItem;
        findings: typeof findings;
        cases: AdminCase[];
      }
    : { item, findings, cases };
  const adminCase = selectMostImportantCase(stored.cases);
  const finding = stored.findings.find((candidate) => candidate.id === adminCase.findingId)!;
  const opportunity = deriveOpportunityCard(adminCase, stored.item, finding);
  const resultViewModel = buildResultViewModel({
    opportunity,
    adminCase,
  });
  const progress = buildCaseProgress({ resultViewModel });
  const guidedNextStep = deriveGuidedNextStep(adminCase, stored.item, finding);
  const impactEntries = deriveImpactFromCase(adminCase, stored.item, finding);

  return {
    item: stored.item,
    findings,
    cases: stored.cases,
    finding,
    adminCase,
    opportunity,
    resultViewModel,
    progress,
    guidedNextStep,
    impactEntries,
  };
};

const journeyText = (journey: ReturnType<typeof buildPublicJourney>) =>
  [
    flattenResultViewModelText(journey.resultViewModel),
    flattenCaseProgressText(journey.progress),
    journey.guidedNextStep.primaryAction.label,
    "description" in journey.guidedNextStep.primaryAction
      ? journey.guidedNextStep.primaryAction.description
      : "",
  ].join("\n");

describe("public account outcome confirmation", () => {
  it("recognises a closed account and removed charge as a resolved provider confirmation", () => {
    const result = buildPublicJourney(targetMessage);
    const resultText = flattenResultViewModelText(result.resultViewModel);
    const progressText = flattenCaseProgressText(result.progress);

    expect(result.findings).toHaveLength(1);
    expect(result.finding.category).toBe("unknown");
    expect(result.finding.title).toBe("Account closure confirmed");
    expect(result.finding.status).toBe("resolved");
    expect(result.finding.documentStatus).toBe("completed_no_action");
    expect(result.adminCase.status).toBe("resolved");
    expect(result.adminCase.decisionResult).toBeUndefined();
    expect(result.opportunity.opportunityType).toBe("account_outcome_confirmation");
    expect(result.opportunity.statusLabel).toBe(
      "Provider confirmation - resolved, with conditional monitoring",
    );

    expect(result.resultViewModel.moneyMentioned).toEqual([
      expect.objectContaining({
        label: "Former balance",
        amountText: "GBP 126.40",
        countedInMoneyTracker: false,
      }),
    ]);
    expect(result.resultViewModel.keyDates).toHaveLength(0);
    expect(resultText).toContain("The provider says the account has been closed");
    expect(resultText).toContain("The provider says the £126.40 charge has been removed");
    expect(resultText).toContain("The provider says no payment is required");
    expect(resultText).toContain("The provider says no further bills should be issued");
    expect(resultText).toContain("Keep this confirmation with the relevant records");
    expect(resultText).toContain("only if a later Direct Debit is collected");
    expect(resultText).toContain("BRV-48271");
    expect(resultText).not.toContain("No obvious saving or action found");
    expect(resultText).not.toContain("Identify the sender, date, reference, and deadline");
    expect(resultText).not.toContain("make a payment through");
    expect(resultText).not.toContain("AdminAvenger contacted");
    expect(resultText).not.toContain("Estate Administration");

    expect(result.guidedNextStep.primaryAction.kind).toBe("evidence_checklist");
    expect(result.progress.items.find((item) => item.id === "account-outcome")?.status).toBe(
      "complete",
    );
    expect(progressText).not.toContain("No actionable date has been gathered yet");
    expect(progressText).not.toContain("No draft or checklist was prepared");

    expect(
      validateResultViewModelSafety(result.resultViewModel, {
        sourceText: targetMessage,
      }).safe,
    ).toBe(true);
  });

  it("does not turn a closed account with a payable balance into a waived charge", () => {
    const result = buildPublicJourney(
      "We have closed the account. The final balance of £45.20 remains payable. Please quote reference ACCT-9Z82 when contacting us.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.finding.title).toBe("Account closed - balance needs checking");
    expect(result.finding.status).toBe("to_do");
    expect(result.adminCase.status).toBe("ready_to_act");
    expect(result.opportunity.moneyAtStake).toEqual(
      expect.objectContaining({
        amount: 45.2,
        label: "Final balance mentioned",
        status: "unknown",
      }),
    );
    expect(text).toContain("ACCT-9Z82");
    expect(text).not.toContain("charge has been removed");
    expect(text).not.toContain("no payment is required");
  });

  it("recognises a confirmed charge waiver without inventing account closure", () => {
    const result = buildPublicJourney(
      "Our support team has agreed to waive the £50.00 final charge. No payment is required. Keep this message for your records. Reference WVR-50A2.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.finding.title).toBe("Charge removal confirmed");
    expect(result.finding.status).toBe("resolved");
    expect(text).toContain("The provider says the £50.00 charge has been removed");
    expect(text).not.toContain("The provider says the account has been closed");
  });

  it("keeps a possible final Direct Debit pending rather than marking everything resolved", () => {
    const result = buildPublicJourney(
      "The account is now closed and no further bills will be issued. One final Direct Debit of £18.00 may still be collected. Keep this confirmation. Reference DD-18A7.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.finding.status).toBe("waiting");
    expect(result.adminCase.status).toBe("waiting");
    expect(result.opportunity.statusLabel).toBe(
      "Provider confirmation - final collection may still be pending",
    );
    expect(text).toContain("The provider says one final Direct Debit may still be collected");
    expect(text).not.toContain("The provider says no payment is required");
    expect(result.resultViewModel.keyDates).toHaveLength(0);
  });

  it("extracts an alphanumeric provider reference from the confirmation", () => {
    const result = buildPublicJourney(
      "We have now closed your account. Please keep this email for your records and quote reference ZX9-44AB if you contact us.",
    );

    expect(result.resultViewModel.evidenceFound).toContainEqual(
      expect.objectContaining({
        label: "Reference",
        value: "ZX9-44AB",
      }),
    );
  });

  it("does not activate from bereavement wording without a confirmed closure or waiver", () => {
    const result = buildPublicJourney(
      "Our bereavement team has received the death certificate and will review the account. We will write again when the review is complete.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.opportunity.opportunityType).not.toBe("account_outcome_confirmation");
    expect(result.finding.title).toBe("Decision or review update");
    expect(result.adminCase.status).toBe("waiting");
    expect(text).toContain("will write again when the review is complete");
    expect(text).not.toContain("account has been closed");
    expect(text).not.toContain("charge has been removed");
  });

  it("does not treat a requested or hypothetical closure and waiver as confirmed", () => {
    const result = buildPublicJourney(
      "Please close the account and review whether the final charge can be waived. Our support team will write again after it makes a decision.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.opportunity.opportunityType).not.toBe("account_outcome_confirmation");
    expect(result.finding.title).toBe("Payment or balance issue to review");
    expect(result.adminCase.status).toBe("ready_to_act");
    expect(text).toContain("review whether the final charge can be waived");
    expect(text).not.toContain("account has been closed");
    expect(text).not.toContain("charge has been removed");
  });

  it("keeps a closed account unresolved while a waiver request is under review", () => {
    const result = buildPublicJourney(
      "We have closed your account. Your request to waive the final balance of Â£62.00 is still under review. We will confirm our decision separately. Reference WVR-62P.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.finding.title).toBe("Account closed - balance needs checking");
    expect(result.finding.status).toBe("waiting");
    expect(result.adminCase.status).toBe("waiting");
    expect(text).toContain("still under review");
    expect(text).not.toContain("charge has been removed");
    expect(result.resultViewModel.moneyMentioned).toContainEqual(
      expect.objectContaining({
        amountText: "GBP 62.00",
        countedInMoneyTracker: false,
      }),
    );
  });

  it("does not resolve a closed account when the provider cannot remove a still-owed charge", () => {
    const result = buildPublicJourney(
      "We have closed your account, but we cannot remove the Â£50.00 charge and you still owe this amount. Reference OW-500A.",
    );
    const text = flattenResultViewModelText(result.resultViewModel);

    expect(result.finding.title).toBe("Account closed - balance needs checking");
    expect(result.finding.status).toBe("to_do");
    expect(result.adminCase.status).toBe("ready_to_act");
    expect(text).toContain("has not been removed");
    expect(text).not.toContain("charge has been removed");
    expect(result.resultViewModel.moneyMentioned).toContainEqual(
      expect.objectContaining({
        amountText: "GBP 50.00",
        countedInMoneyTracker: false,
      }),
    );
  });

  it("preserves a dated payment reminder as the stronger finding when closure is also confirmed", () => {
    const result = buildPublicJourney(
      "We have closed your account. Payment reminder. Amount due: Â£74.20. Please pay by 15 August 2026 using your usual method. Account reference PAY-74A2.",
    );

    expect(result.finding.title).toBe("Payment reminder to check");
    expect(result.finding.status).not.toBe("resolved");
    expect(result.finding.deadline).toBe("15 August 2026");
    expect(result.opportunity.opportunityType).not.toBe(
      "account_outcome_confirmation",
    );
    expect(result.opportunity.deadline).toBe("15 August 2026");
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        title: "Account closed - balance needs checking",
      }),
    );
  });

  it("preserves an unresolved complaint ahead of closure context", () => {
    const result = buildPublicJourney(
      "We have closed your account. Your complaint about poor service is still open and you have received no response. A response is required.",
    );

    expect(result.finding.category).toBe("complaint");
    expect(result.finding.status).not.toBe("resolved");
    expect(result.finding.title).toBe("Complaint opportunity");
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        title: "Account closure confirmed",
        status: "to_do",
      }),
    );
  });

  it("keeps the exact pending-waiver message waiting with its follow-up period", () => {
    const result = buildPublicJourney(exactBrowserScenarios.pendingWaiver);
    const text = journeyText(result);

    expect(result.finding.title).toBe("Account closed - balance needs checking");
    expect(result.finding.status).toBe("waiting");
    expect(result.adminCase.status).toBe("waiting");
    expect(result.opportunity.opportunityType).toBe("account_outcome_confirmation");
    expect(text).toContain("account has been closed");
    expect(text).toContain("still under review");
    expect(text).toContain("no decision has been made yet");
    expect(text).toContain("does not confirm that the balance is cancelled or payable now");
    expect(text).toContain("within 21 days");
    expect(text).toContain("BR-10482");
    expect(text).not.toMatch(/\bresolved\b/i);
    expect(text).not.toContain("No later collection or conditional follow-up is stated");
    expect(result.resultViewModel.moneyMentioned).toContainEqual(
      expect.objectContaining({
        label: "Balance under review",
        amountText: "GBP 152.75",
        countedInMoneyTracker: false,
      }),
    );
    expect(result.impactEntries).toEqual([]);
  });

  it("keeps the exact clean closure in the public resolved account-outcome flow", () => {
    const result = buildPublicJourney(exactBrowserScenarios.cleanResolved);
    const text = journeyText(result);

    expect(result.finding.title).toBe("Account closure confirmed");
    expect(result.finding.status).toBe("resolved");
    expect(result.adminCase.status).toBe("resolved");
    expect(result.opportunity.opportunityType).toBe("account_outcome_confirmation");
    expect(text).toContain("account has been closed");
    expect(text).toContain("£93.18 charge has been removed");
    expect(text).toContain("no payment is required");
    expect(text).toContain("no further bills");
    expect(text).toContain("no further Direct Debits");
    expect(text).toContain("Keep this confirmation");
    expect(text).toContain("CLS-9318");
    expect(text).not.toContain("outside the public Check a message scope");
    expect(result.impactEntries).toEqual([]);
  });

  it("keeps the exact conditional closure actionable with its document deadline", () => {
    const result = buildPublicJourney(exactBrowserScenarios.closureNotCompleted);
    const text = journeyText(result);

    expect(result.finding.title).toBe("Account closure needs a document");
    expect(result.finding.status).toBe("to_do");
    expect(result.adminCase.status).toBe("ready_to_act");
    expect(result.opportunity.opportunityType).toBe("account_outcome_confirmation");
    expect(text).toContain("account remains active");
    expect(text).toContain("monthly charges will continue");
    expect(text).toContain("death certificate");
    expect(text).toContain("12 August 2026");
    expect(text).toContain("DOC-12884");
    expect(text).not.toContain("No obvious saving or action found");
    expect(text).not.toContain("No actionable date has been gathered yet");
    expect(result.resultViewModel.keyDates).toContainEqual(
      expect.objectContaining({ value: "12 August 2026" }),
    );
  });

  it("keeps the exact final notice as an urgent dated payment finding", () => {
    const result = buildPublicJourney(exactBrowserScenarios.finalNotice);
    const text = journeyText(result);

    expect(result.finding.title).toBe("Payment reminder to check");
    expect(result.finding.status).not.toBe("resolved");
    expect(result.adminCase.status).toBe("ready_to_act");
    expect(result.finding.deadline).toBe("7 August 2026");
    expect(result.opportunity.deadline).toBe("7 August 2026");
    expect(text).toContain("£210.00");
    expect(text).toContain("further collection activity");
    expect(text).toContain("COL-21077");
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        title: "Account closed - balance needs checking",
        status: "to_do",
      }),
    );
    expect(result.resultViewModel.keyDates).toContainEqual(
      expect.objectContaining({ value: "7 August 2026" }),
    );
    expect(result.impactEntries).toContainEqual(
      expect.objectContaining({
        type: "deadline_protected",
        amount: undefined,
      }),
    );
    expect(
      result.impactEntries.some((entry) => /saving|recover/i.test(entry.type)),
    ).toBe(false);
  });

  it("keeps the exact not-payable-today message waiting for the later decision", () => {
    const result = buildPublicJourney(exactBrowserScenarios.futureLiability);
    const text = journeyText(result);

    expect(result.finding.title).toBe("Account closed - balance needs checking");
    expect(result.finding.status).toBe("waiting");
    expect(result.adminCase.status).toBe("waiting");
    expect(result.opportunity.opportunityType).toBe("account_outcome_confirmation");
    expect(text).toContain("GBP 58.90");
    expect(text).toContain("not requested today");
    expect(text).toContain("may become payable");
    expect(text).toContain("review is pending");
    expect(text).toContain("will write again");
    expect(text).not.toContain("The provider says no payment is required");
    expect(text).not.toMatch(/\bresolved\b/i);
    expect(text).not.toContain("charge has been removed");
    expect(text).not.toContain("No later collection or conditional follow-up is stated");
    expect(result.impactEntries).toEqual([]);
  });

  it.each(Object.entries(exactBrowserScenarios))(
    "preserves the %s result after persisted-case reconstruction",
    (_name, rawText) => {
      const fresh = buildPublicJourney(rawText);
      const reconstructed = buildPublicJourney(rawText, true);

      expect({
        findingTitle: reconstructed.finding.title,
        findingStatus: reconstructed.finding.status,
        caseStatus: reconstructed.adminCase.status,
        opportunityType: reconstructed.opportunity.opportunityType,
        opportunityDeadline: reconstructed.opportunity.deadline,
        resultTitle: reconstructed.resultViewModel.title,
        resultSummary: reconstructed.resultViewModel.summary,
        resultStatus: reconstructed.resultViewModel.primaryStatusLabel,
        resultText: journeyText(reconstructed),
      }).toEqual({
        findingTitle: fresh.finding.title,
        findingStatus: fresh.finding.status,
        caseStatus: fresh.adminCase.status,
        opportunityType: fresh.opportunity.opportunityType,
        opportunityDeadline: fresh.opportunity.deadline,
        resultTitle: fresh.resultViewModel.title,
        resultSummary: fresh.resultViewModel.summary,
        resultStatus: fresh.resultViewModel.primaryStatusLabel,
        resultText: journeyText(fresh),
      });
    },
  );

});
