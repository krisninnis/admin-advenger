// Inbox Scan prototype — local mock only.
//
// This builds preview-only results from built-in sample emails. It does NOT
// connect to Gmail, Outlook, or any real inbox. Nothing is sent, deleted, or
// changed. Previews are not saved until the user explicitly saves a case.
//
// Saving a preview reuses the exact same analysis pipeline as pasting the
// email manually (analyseAdminItem -> createAdminCase), so savings and impact
// behaviour follow the existing rules.

import { createAdminCase } from "./caseFactory";
import { deriveImpactFromCase } from "./impactLedger";
import { analyseAdminItem } from "./mockAnalysis";
import { deriveOpportunityCard } from "./opportunityCards";
import { assessEmailSafety, createEmailSafetyFinding, getEmailSafetyRiskBand } from "./suspiciousEmail";
import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  ImpactEntry,
  OpportunityCard,
  SourceType,
} from "../types";

export type InboxScanSample = {
  id: string;
  title: string;
  sourceType: SourceType;
  rawText: string;
};

export type InboxScanPreview = {
  sampleId: string;
  item: AdminItem;
  findings: AdminFinding[];
  cases: AdminCase[];
  primaryCase: AdminCase;
  primaryFinding?: AdminFinding;
  opportunity: OpportunityCard;
  impactEntries: ImpactEntry[];
  headline: string;
  isRisk: boolean;
  isMoney: boolean;
};

export type InboxScanSummary = {
  total: number;
  moneyCount: number;
  riskCount: number;
  totalPotential: number;
};

const pound = String.fromCharCode(163);

const formatPounds = (amount?: number, suffix = "") =>
  amount === undefined ? "" : `${pound}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}${suffix}`;

// These sample emails are illustrative text only. They are bundled with the
// prototype so the inbox-scan flow can be demonstrated without a real inbox.
export const inboxScanSamples: InboxScanSample[] = [
  {
    id: "refund-approved",
    title: "Refund approved",
    sourceType: "email",
    rawText:
      "Your refund of " +
      pound +
      "42.99 has been approved and will be returned to your original payment method within 5 to 10 working days. Reference RF12345.",
  },
  {
    id: "google-play-subscription",
    title: "Google Play subscription",
    sourceType: "email",
    rawText:
      "Your subscription from Google Commerce Limited on Google Play continues and you've been charged. Item: ChatGPT Plus by OpenAI. Price: " +
      pound +
      "18.99/month. Auto-renewing subscription. Total: " +
      pound +
      "18.99/month. Learn how to cancel.",
  },
  {
    id: "energy-price-change",
    title: "Energy price change",
    sourceType: "email",
    rawText:
      "Your energy prices are changing from 1 July. Estimated annual costs until 30 June 2026: Electricity " +
      pound +
      "234.52, Gas " +
      pound +
      "150.33. Estimated annual costs from 1 July 2026: Electricity " +
      pound +
      "235.79, Gas " +
      pound +
      "162.04. Price difference: Electricity " +
      pound +
      "1.27 increase, Gas " +
      pound +
      "11.71 increase.",
  },
  {
    id: "travel-disruption-recovery",
    title: "Travel disruption recovery",
    sourceType: "email",
    rawText:
      "Air Mauritius / loveholidays flight cancellation extra hotel night claim. Booking reference U4FP9V. Extra hotel night cost " +
      pound +
      "219.69. Air Mauritius asked for bank statement proof of payment. loveholidays confirmed " +
      pound +
      "219.69 was added to the payment schedule.",
  },
  {
    id: "suspicious-email",
    title: "Account verification required",
    sourceType: "email",
    rawText:
      "Your account will be locked today. Click this link immediately to verify your bank details and avoid suspension. Sender: support@secure-bank-login-example.com. Reply-to: randomhelpdesk@example.net.",
  },
];

const buildHeadline = (opportunity: OpportunityCard): string => {
  switch (opportunity.opportunityType) {
    case "suspicious_email_risk":
      return "Risky email found";
    case "refund_expected":
    case "money_back": {
      const amount = opportunity.potentialRecovery?.amount ?? opportunity.moneyAtStake?.amount;
      return amount !== undefined ? `${formatPounds(amount)} refund to track` : "Refund to track";
    }
    case "subscription_recurring_charge":
    case "subscription_renewal": {
      const monthly = opportunity.potentialSaving?.amount;
      return monthly !== undefined
        ? `${formatPounds(monthly, "/month")} subscription found`
        : "Subscription found";
    }
    case "energy_price_change":
      return "Energy price increase found";
    case "bill_or_price_increase":
      return "Price increase found";
    case "travel_extra_cost_recovery": {
      const amount = opportunity.potentialRecovery?.amount;
      return amount !== undefined
        ? `${formatPounds(amount)} possible travel cost recovery`
        : "Possible travel cost recovery";
    }
    default:
      return opportunity.title;
  }
};

const buildPreview = (sample: InboxScanSample): InboxScanPreview => {
  const now = new Date().toISOString();
  const item: AdminItem = {
    id: `item-inbox-${sample.id}`,
    title: sample.title,
    sourceType: sample.sourceType,
    rawText: sample.rawText,
    createdAt: now,
    analysedAt: now,
  };

  // Reassign deterministic finding ids so re-building previews (e.g. after
  // navigating away and back) does not create duplicate saved cases.
  const emailSafety = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);
  const analysedFindings =
    getEmailSafetyRiskBand(emailSafety) === "high_risk_signals"
      ? [createEmailSafetyFinding(item, emailSafety)]
      : analyseAdminItem(item);
  const findings = analysedFindings.map((finding, index) => ({
    ...finding,
    id: `finding-inbox-${sample.id}-${index}`,
  }));
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const primaryCase = cases[0];
  const primaryFinding = findings[0];
  const opportunity = deriveOpportunityCard(primaryCase, item, primaryFinding);
  const impactEntries = cases.flatMap((adminCase) => {
    const finding = findings.find((current) => current.id === adminCase.findingId);
    return deriveImpactFromCase(adminCase, item, finding);
  });
  const isRisk = opportunity.opportunityType === "suspicious_email_risk";

  return {
    sampleId: sample.id,
    item,
    findings,
    cases,
    primaryCase,
    primaryFinding,
    opportunity,
    impactEntries,
    headline: buildHeadline(opportunity),
    isRisk,
    isMoney: !isRisk,
  };
};

export const buildInboxScanPreviews = (): InboxScanPreview[] =>
  inboxScanSamples.map(buildPreview);

const countableTypes = new Set(["potential_saving", "potential_recovery", "pending_recovery"]);

export const summariseInboxScan = (previews: InboxScanPreview[]): InboxScanSummary => {
  const totalPotential = previews.reduce(
    (runningTotal, preview) =>
      runningTotal +
      preview.impactEntries
        .filter((entry) => countableTypes.has(entry.type))
        .reduce((entryTotal, entry) => entryTotal + (entry.amount ?? 0), 0),
    0,
  );

  return {
    total: previews.length,
    moneyCount: previews.filter((preview) => preview.isMoney).length,
    riskCount: previews.filter((preview) => preview.isRisk).length,
    totalPotential: Number(totalPotential.toFixed(2)),
  };
};

export const formatInboxScanPotential = (amount: number) =>
  `${pound}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
