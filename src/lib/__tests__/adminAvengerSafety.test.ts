import { describe, expect, it } from "vitest";
import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  ImpactEntry,
  MoneyImpactFrequency,
  OutcomeConfirmationType,
  SourceType,
} from "../../types";
import { createAdminCase } from "../caseFactory";
import { getGuidedCaseMode } from "../guidedCaseMode";
import {
  calculateImpactTotals,
  createConfirmedImpactEntry,
  deriveImpactFromCase,
} from "../impactLedger";
import { createPreparedMessageDraft } from "../messageDrafts";
import { analyseAdminItem } from "../mockAnalysis";
import {
  extractCurrencyAmounts,
  extractRecoverableAmount,
  extractTotalCostMention,
  formatCurrency,
} from "../moneyParsers";
import { deriveOpportunityCard } from "../opportunityCards";

const now = "2026-07-04T09:00:00.000Z";

const outcomeTypesToReplace = new Set<ImpactEntry["type"]>([
  "confirmed_saved",
  "confirmed_recovered",
  "cost_increase_avoided",
  "deadline_protected",
  "no_saving",
  "rejected",
  "pending_recovery",
  "under_review",
]);

const makeItem = (
  title: string,
  rawText: string,
  sourceType: SourceType = "email",
): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
});

const analyseToCases = (item: AdminItem) => {
  const findings = analyseAdminItem(item);
  const cases = findings.map((finding) => createAdminCase(finding, item));

  return { item, findings, cases };
};

const firstCase = (item: AdminItem) => {
  const result = analyseToCases(item);
  const adminCase = result.cases[0];
  const finding = result.findings[0];

  if (!adminCase || !finding) {
    throw new Error("Expected at least one case");
  }

  return { ...result, adminCase, finding };
};

const impactsFor = (
  adminCase: AdminCase,
  item: AdminItem,
  finding?: AdminFinding,
) => deriveImpactFromCase(adminCase, item, finding);

const confirmOutcome = (
  currentEntries: ImpactEntry[],
  adminCase: AdminCase,
  values: {
    outcomeType: OutcomeConfirmationType;
    amount?: number;
    frequency?: MoneyImpactFrequency;
    note?: string;
  },
  item?: AdminItem,
  finding?: AdminFinding,
) => {
  const pendingEntryToPreserve =
    values.outcomeType === "still_waiting" && values.amount === undefined
      ? currentEntries.find(
          (entry) =>
            entry.caseId === adminCase.id &&
            entry.type === "pending_recovery" &&
            entry.amount !== undefined,
        ) ??
        impactsFor(adminCase, item ?? makeItem("fallback", ""), finding).find(
          (entry) => entry.type === "pending_recovery" && entry.amount !== undefined,
        )
      : undefined;
  const outcomeValues = {
    outcomeType: values.outcomeType,
    amount: pendingEntryToPreserve?.amount ?? values.amount,
    currency:
      pendingEntryToPreserve?.currency ??
      (values.amount === undefined ? "unknown" as const : "GBP" as const),
    frequency: pendingEntryToPreserve?.frequency ?? values.frequency ?? "one_off" as const,
    note: values.note ?? "",
    confirmedAt: now,
  };
  const entry = createConfirmedImpactEntry(adminCase, outcomeValues);

  return [
    entry,
    ...currentEntries.filter(
      (currentEntry) =>
        currentEntry.caseId !== adminCase.id ||
        !outcomeTypesToReplace.has(currentEntry.type),
    ),
  ];
};

const refundInput =
  "Your refund of £42.99 has been approved and will be returned to your original payment method within 5 to 10 working days. Reference RF12345.";

describe("AdminAvenger deterministic money safety", () => {
  it("keeps an approved refund as pending recovery until the user confirms receipt", () => {
    const { item, finding, adminCase } = firstCase(makeItem("Refund approved", refundInput));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.category).toBe("refund");
    expect(opportunity.opportunityType).toBe("refund_expected");
    expect(impacts).toContainEqual(
      expect.objectContaining({
        type: "pending_recovery",
        status: "pending",
        amount: 42.99,
      }),
    );
    expect(totals.pendingRecovery).toBe(42.99);
    expect(totals.confirmedSavedRecovered).toBe(0);
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Reference", value: "RF12345" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({
        label: "Refund status",
        value: "Approved, but not confirmed received yet",
      }),
    );
  });

  it("preserves pending refund amount when still waiting is recorded repeatedly", () => {
    const { item, finding, adminCase } = firstCase(makeItem("Refund approved", refundInput));
    const initialEntries = impactsFor(adminCase, item, finding);
    const once = confirmOutcome(
      initialEntries,
      adminCase,
      { outcomeType: "still_waiting", note: "Still waiting." },
      item,
      finding,
    );
    const twice = confirmOutcome(
      once,
      adminCase,
      { outcomeType: "still_waiting", note: "Still waiting again." },
      item,
      finding,
    );

    expect(calculateImpactTotals(once, [adminCase]).pendingRecovery).toBe(42.99);
    expect(calculateImpactTotals(twice, [adminCase]).pendingRecovery).toBe(42.99);
    expect(twice.filter((entry) => entry.type === "pending_recovery")).toHaveLength(1);
    expect(calculateImpactTotals(twice, [adminCase]).confirmedSavedRecovered).toBe(0);
  });

  it("does not auto-confirm money; money came back only counts with a user-entered amount", () => {
    const { item, finding, adminCase } = firstCase(makeItem("Refund approved", refundInput));
    const initialEntries = impactsFor(adminCase, item, finding);
    const noAmount = confirmOutcome(initialEntries, adminCase, { outcomeType: "got_money_back" });
    const withAmount = confirmOutcome(initialEntries, adminCase, {
      outcomeType: "got_money_back",
      amount: 42.99,
      note: "Money received.",
    });

    expect(calculateImpactTotals(noAmount, [adminCase]).confirmedSavedRecovered).toBe(0);
    expect(calculateImpactTotals(noAmount, [adminCase]).pendingRecovery).toBe(0);
    expect(calculateImpactTotals(withAmount, [adminCase]).confirmedSavedRecovered).toBe(42.99);
    expect(calculateImpactTotals(withAmount, [adminCase]).pendingRecovery).toBe(0);
  });

  it("treats recurring subscription receipts as review opportunities, not recoveries", () => {
    const text =
      "Google Play receipt for ChatGPT Plus. Price £18.99/month. Auto-renewing subscription. Charged automatically until cancelled. Learn how to cancel.";
    const { item, finding, adminCase } = firstCase(makeItem("Google Play subscription", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const stillReviewing = confirmOutcome(impacts, adminCase, {
      outcomeType: "still_waiting",
      note: "Still reviewing.",
    });

    expect(finding.category).toBe("subscription");
    expect(opportunity.opportunityType).toBe("subscription_recurring_charge");
    expect(getGuidedCaseMode(adminCase, opportunity)).toBe("saving_or_review");
    expect(opportunity.moneyImpactRows).toContainEqual(
      expect.objectContaining({ amount: 18.99, frequency: "monthly" }),
    );
    expect(opportunity.moneyImpactRows).toContainEqual(
      expect.objectContaining({ amount: 227.88, frequency: "annual" }),
    );
    expect(impacts).toContainEqual(
      expect.objectContaining({
        type: "potential_saving",
        amount: 227.88,
        frequency: "annual",
      }),
    );
    expect(calculateImpactTotals(stillReviewing, [adminCase]).confirmedSavedRecovered).toBe(0);
    expect(calculateImpactTotals(stillReviewing, [adminCase]).pendingRecovery).toBe(0);
    expect(stillReviewing).toContainEqual(expect.objectContaining({ type: "under_review" }));
  });

  it("keeps energy price changes as review opportunities with no recovery or confirmed saving", () => {
    const text =
      "E.ON Next energy price change.\n\nFrom 1 July, Ofgem's price cap is going up.\n\nEstimated annual costs until 30 June 2026:\nElectricity: £234.52\nGas: £150.33\n\nEstimated annual costs from 1 July 2026:\nElectricity: £235.79\nGas: £162.04\n\nPrice difference:\nElectricity: £1.27 increase\nGas: £11.71 increase";
    const { item, finding, adminCase } = firstCase(makeItem("E.ON Next energy price change", text, "bill"));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.category).toBe("bill_increase");
    expect(opportunity.opportunityType).toBe("energy_price_change");
    expect(getGuidedCaseMode(adminCase, opportunity)).toBe("saving_or_review");
    expect(opportunity.annualisedAmount).toEqual(
      expect.objectContaining({ amount: 12.98, frequency: "annual" }),
    );
    expect(impacts).toContainEqual(
      expect.objectContaining({
        type: "potential_saving",
        amount: 12.98,
        frequency: "annual",
      }),
    );
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("treats high-risk emails as safety cases with no money impact or reply draft", () => {
    const text =
      "Sender: support@secure-bank-login-example.com\nReply-to: randomhelpdesk@example.net\nSubject: Your account will be locked today\n\nYour account will be locked today. Click this link immediately to verify your bank details and avoid suspension. Failure to act now will result in permanent closure.";
    const { item, finding, adminCase } = firstCase(makeItem("Your account will be locked today", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });

    expect(opportunity.opportunityType).toBe("suspicious_email_risk");
    expect(getGuidedCaseMode(adminCase, opportunity)).toBe("safety");
    expect(impacts).toContainEqual(expect.objectContaining({ type: "no_saving" }));
    expect(calculateImpactTotals(impacts, [adminCase]).pendingRecovery).toBe(0);
    expect(calculateImpactTotals(impacts, [adminCase]).confirmedSavedRecovered).toBe(0);
    expect(draft.messageType).toBe("email_safety_checklist");
    expect(draft.fullText).not.toContain("Hello,");
    expect(draft.safetyNote).toContain("cannot determine whether this is a scam");
  });

  it("keeps generic cancelled travel total costs as evidence only", () => {
    const text =
      "My flight was cancelled. The total holiday cost was £1,200. I need to ask the airline what evidence they need.";
    const { item, finding, adminCase } = firstCase(makeItem("Cancelled flight evidence", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });

    expect(finding.title).toBe("Travel evidence check");
    expect(opportunity.opportunityType).toBe("travel_evidence_check");
    expect(extractTotalCostMention(text)?.amount).toBe(1200);
    expect(extractRecoverableAmount(text)).toBeUndefined();
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(calculateImpactTotals(impacts, [adminCase]).pendingRecovery).toBe(0);
    expect(draft.fullText).toContain("what evidence you need");
    expect(draft.fullText).not.toContain("£1,200");
  });

  it("recognises valid travel extra cost recovery using supported facts only", () => {
    const text =
      "Air Mauritius / loveholidays flight cancellation extra hotel night claim. Booking reference U4FP9V. Extra hotel night cost £219.69. Air Mauritius asked for bank statement proof of payment. loveholidays confirmed £219.69 was added to the payment schedule.";
    const { item, finding, adminCase } = firstCase(makeItem("Travel extra hotel night", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });

    expect(opportunity.opportunityType).toBe("travel_extra_cost_recovery");
    expect(opportunity.title).toBe("Possible money recovery found");
    expect(opportunity.potentialRecovery).toEqual(expect.objectContaining({ amount: 219.69 }));
    expect(impacts).toContainEqual(
      expect.objectContaining({ type: "pending_recovery", amount: 219.69 }),
    );
    expect(adminCase.title).not.toMatch(/refund approved/i);
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Booking reference", value: "U4FP9V" }),
    );
    expect(draft.fullText).toContain("£219.69");
    expect(draft.fullText).toContain("U4FP9V");
    expect(draft.safetyNote).toContain("not a claim that reimbursement is assured");
  });

  it("does not invent money for cancelled appointments", () => {
    const { item, finding, adminCase } = firstCase(
      makeItem("Cancelled dentist appointment", "My dentist cancelled my appointment and asked me to rebook.", "note"),
    );
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.title).toBe("Appointment to rebook");
    expect(adminCase.nextAction).toBe("Rebook the appointment and save the confirmation.");
    expect(finding.category).not.toBe("refund");
    expect(opportunity.opportunityType).not.toBe("money_back");
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("parses comma amounts and keeps total-cost phrases out of recoverable money", () => {
    const amounts = extractCurrencyAmounts("Refund of £1,200 and invoice of £12,500.50.");

    expect(amounts.map((amount) => amount.amount)).toEqual([1200, 12500.5]);
    expect(formatCurrency(1200)).toBe("£1,200");
    expect(extractTotalCostMention("The total holiday cost was £1,200.")?.amount).toBe(1200);
    expect(extractRecoverableAmount("The total holiday cost was £1,200.")).toBeUndefined();
  });

  it.each([
    "You owe us £1,200.",
    "Your balance due is £89.99.",
    "Payment required: £45.",
  ])("does not turn directional payment wording into money back: %s", (text) => {
    const { item, finding, adminCase } = firstCase(makeItem("Payment notice", text, "bill"));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.category).not.toBe("refund");
    expect(opportunity.opportunityType).not.toBe("money_back");
    expect(opportunity.opportunityType).not.toBe("refund_expected");
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("recognises a dated payment reminder without treating money owed as a saving", () => {
    const text = [
      "Greenfield Water Services",
      "Payment reminder",
      "Date: 14 July 2026",
      "Account reference: GW-48291",
      "Our records show an unpaid balance of \u00a384.60.",
      "Payment was due on 10 July 2026.",
      "Please pay the balance or contact us by 24 July 2026.",
      "If you have already paid, send us proof of payment.",
      "We have not added a late fee.",
    ].join("\n");

    const { item, finding, adminCase } = firstCase(
      makeItem("Payment reminder", text, "bill"),
    );
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = impactsFor(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });
    const draftText = draft.fullText.toLowerCase();

    expect(finding.title).toBe("Payment reminder to check");
    expect(finding.category).toBe("important_reply");
    expect(finding.deadline).toBe("24 July 2026");
    expect(finding.suggestedAction).toContain("24 July 2026");
    expect(finding.suggestedAction).toContain("\u00a384.60");
    expect(finding.suggestedAction).toContain("correct or already paid");
    expect(finding.category).not.toBe("refund");
    expect(opportunity.opportunityType).not.toBe("no_action_needed");
    expect(opportunity.opportunityType).not.toBe("money_back");
    expect(opportunity.deadline).toBe("24 July 2026");
    expect(opportunity.moneyAtStake).toEqual(
      expect.objectContaining({
        amount: 84.6,
        label: "Amount being requested",
        status: "unknown",
      }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Account reference", value: "GW-48291" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Amount due", value: "\u00a384.60" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Payment due date", value: "10 July 2026" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Response/contact deadline", value: "24 July 2026" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Letter date", value: "14 July 2026" }),
    );
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Sender/provider clue", value: "Greenfield Water Services" }),
    );
    expect(draft.messageType).toBe("payment_reminder_query");
    expect(draft.suggestedSubject).toContain("GW-48291");
    expect(draft.recipientHint).toContain("Greenfield Water Services");
    expect(draft.fullText).toContain("GW-48291");
    expect(draft.fullText).toContain("\u00a384.60");
    expect(draft.fullText).toContain("24 July 2026");
    expect(draftText).toMatch(/already been received|already paid/);
    expect(draftText).toContain("please confirm");
    expect(draft.safetyNote).toContain("has not confirmed whether the amount is correct or owed");
    for (const forbidden of ["you owe", "i owe", "admit", "late fee", "disconnection", "legal action", "click"]) {
      expect(draftText).not.toContain(forbidden);
    }
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("keeps non-payment important replies on the generic draft path", () => {
    const { item, finding, adminCase } = firstCase(
      makeItem(
        "Important update",
        "Important: please confirm whether you received the updated contact form. We are awaiting your response.",
        "email",
      ),
    );
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });

    expect(finding.title).toBe("Important reply needed");
    expect(draft.messageType).toBe("generic_important_reply");
    expect(draft.fullText).toContain("I'm following up on the message below");
  });

  it.each([
    {
      name: "payment confirmation",
      title: "Payment received",
      text: "Thank you for your payment. Your balance is now \u00a30.00.",
      sourceType: "bill" as SourceType,
    },
    {
      name: "purchase receipt",
      title: "Order receipt",
      text: "Receipt. Retailer: Example Shop. Order number: AB12345. Payment by card. Total: \u00a384.60.",
      sourceType: "receipt" as SourceType,
    },
    {
      name: "refund approved",
      title: "Refund approved",
      text: "Your refund of \u00a384.60 has been approved and will be returned to your original payment method within 5 to 10 working days.",
      sourceType: "email" as SourceType,
    },
    {
      name: "vague payment mention",
      title: "Payment note",
      text: "I need to check a payment message later.",
      sourceType: "note" as SourceType,
    },
  ])("does not turn $name into a payment-reminder action case", ({ title, text, sourceType }) => {
    const { finding, adminCase, item } = firstCase(makeItem(title, text, sourceType));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);

    expect(finding.title).not.toBe("Payment reminder to check");
    expect(opportunity.title).not.toBe("Payment reminder to check");
  });
});
