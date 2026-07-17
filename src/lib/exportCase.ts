import type { TrustedGuidanceCard } from "../data/trustedGuidanceCards";
import type { AdminCase, AdminDraft, AdminFinding, AdminItem, ImpactEntry, MoneyImpact, OpportunityCard } from "../types";
import { formatMoneyImpact as formatOpportunityMoney } from "./opportunityCards";
import { formatMoneyImpact } from "./impactLedger";
import {
  getEmailSafetyOrdinarySignals,
  getEmailSafetyRiskBandExplanation,
  getEmailSafetyRiskBandLabel,
} from "./suspiciousEmail";

type ExportCaseOptions = {
  adminCase: AdminCase;
  item?: AdminItem;
  finding?: AdminFinding;
  drafts: AdminDraft[];
  impactEntries?: ImpactEntry[];
  opportunity?: OpportunityCard;
  guidanceCards?: TrustedGuidanceCard[];
};

const categoryLabels: Record<AdminCase["category"], string> = {
  refund: "Refund",
  complaint: "Complaint",
  subscription: "Subscription",
  deadline: "Deadline",
  job_application: "Job application",
  bill_increase: "Bill increase",
  warranty: "Warranty",
  important_reply: "Important reply",
  admin_dispute: "Admin/rights check",
  unknown: "Unknown",
};

const opportunityTypeLabels: Record<string, string> = {
  refund_expected: "Refund",
  travel_extra_cost_recovery: "Travel recovery",
  travel_evidence_check: "Travel evidence check",
  subscription_recurring_charge: "Subscription review",
  subscription_renewal: "Subscription",
  energy_price_change: "Energy price change",
  bill_or_price_increase: "Price increase",
  money_back: "Money back",
  delivery_issue: "Delivery issue",
  delivery_update: "Delivery update",
  receipt_guardian: "Proof saved",
  suspicious_email_risk: "Email safety",
  admin_dispute_check: "Admin/rights check",
  career_support: "Career preparation",
  no_action_needed: "No action needed",
};

const readable = (value: string) => value.replaceAll("_", " ");

const fallback = (value?: string) => value || "Not recorded";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const asMarkdownList = (items: string[]) =>
  items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None recorded";

const confidenceLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
  needs_more_info: "Needs more info",
  needs_review: "Needs review",
};

const sortNewestFirst = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );

const createOpportunitySection = (opportunity?: OpportunityCard) => {
  if (!opportunity) {
    return "";
  }

  const moneyRows =
    opportunity.moneyImpactRows && opportunity.moneyImpactRows.length > 0
      ? opportunity.moneyImpactRows
      : [
          opportunity.moneyAtStake,
          opportunity.potentialSaving,
          opportunity.potentialRecovery,
          opportunity.confirmedSaving,
          opportunity.confirmedRecovery,
          opportunity.annualisedAmount,
        ].filter((item): item is MoneyImpact => Boolean(item));

  return `## Opportunity Card

- **Type:** ${readable(opportunity.opportunityType)}
- **Title:** ${opportunity.title}
- **Summary:** ${opportunity.plainEnglishSummary}
- **Status:** ${opportunity.statusLabel ?? "Not recorded"}
- **Money at stake:** ${formatOpportunityMoney(opportunity.moneyAtStake)}
- **Potential saving:** ${formatOpportunityMoney(opportunity.potentialSaving)}
- **Potential recovery:** ${formatOpportunityMoney(opportunity.potentialRecovery)}
- **Annualised amount:** ${formatOpportunityMoney(opportunity.annualisedAmount)}
- **Deadline:** ${opportunity.deadline ? `${opportunity.deadlineLabel ?? "Deadline"}: ${opportunity.deadline}` : "Not recorded"}
- **Next best action:** ${opportunity.nextBestAction}

### Money Impact Rows

${asMarkdownList(moneyRows.map((row) => formatOpportunityMoney(row)))}

### Opportunity Evidence Found

${asMarkdownList(opportunity.evidenceFound)}

### Opportunity Missing Information

${asMarkdownList(opportunity.missingInformation)}

`;
};

const createImpactSection = (impactEntries: ImpactEntry[] = []) => {
  if (impactEntries.length === 0) {
    return `## Impact Ledger

No impact entries recorded.

`;
  }

  const lines = impactEntries.map((entry) => {
    const amount = entry.amount !== undefined
      ? formatMoneyImpact(entry.amount, entry.currency, entry.frequency)
      : "No amount recorded";
    const proof = entry.proofAttached
      ? ` Proof attached locally${entry.proofImageName ? `: ${entry.proofImageName}` : ""}.`
      : "";

    return `- **${readable(entry.type)}** (${readable(entry.status)}): ${amount}. ${entry.evidenceNote}.${proof}`;
  });

  return `## Impact Ledger

${lines.join("\n")}

`;
};

const createGuidanceSection = (guidanceCards: TrustedGuidanceCard[] = []) => {
  if (guidanceCards.length === 0) {
    return "";
  }

  return `## Trusted Guidance

AdminAvenger provides practical checklists and links to useful places to check. It does not replace legal, financial, or consumer advice.

${guidanceCards
  .map(
    (card) => `### ${card.title}

${card.shortSummary}

Checklist:
${asMarkdownList(card.safeChecklist)}

Common evidence:
${asMarkdownList(card.commonEvidence)}

Caution: ${card.caution}

Useful source links:
${asMarkdownList(card.usefulSourceLinks.map((link) => `${link.label}: ${link.url}`))}
`,
  )
  .join("\n")}
`;
};

const createDelayRepaySection = (adminCase: AdminCase) => {
  if (!adminCase.delayRepayAssessment) {
    return "";
  }

  const assessment = adminCase.delayRepayAssessment;
  const foundEvidence = assessment.evidenceFound.map(
    (evidence) => `- **${evidence.label}:** ${evidence.value}`,
  );
  const missingEvidence = assessment.evidenceMissing.map((item) => `- ${item}`);
  const unknowns = assessment.unknownInformation.map((item) => `- ${item}`);

  return `## Refund Avenger Train Delay Assessment

This is a UK train delay assessment. It does not decide eligibility.

- **Confidence score:** ${assessment.confidenceScore}%
- **Confidence explanation:** ${assessment.confidenceExplanation}
- **Operator rule caveat:** ${assessment.ruleCaveat}

### Evidence Found

${foundEvidence.length > 0 ? foundEvidence.join("\n") : "- None extracted"}

### Evidence Missing

${missingEvidence.length > 0 ? missingEvidence.join("\n") : "- No required evidence gaps detected"}

### Unknown Information

${unknowns.length > 0 ? unknowns.join("\n") : "- No unknowns recorded"}

`;
};

const createBroadbandPriceRiseSection = (adminCase: AdminCase) => {
  if (!adminCase.broadbandPriceRiseAssessment) {
    return "";
  }

  const assessment = adminCase.broadbandPriceRiseAssessment;
  const documentMatchConfidence = assessment.documentMatchConfidence ?? "medium";
  const actionConfidence = assessment.actionConfidence ?? "needs_more_info";
  const draftSafetyConfidence = assessment.draftSafetyConfidence ?? "needs_review";
  const optionsMentioned = assessment.optionsMentioned ?? [];
  const providerWordingFound = assessment.providerWordingFound ?? assessment.rightsConfirmed ?? [];
  const rightsNeedChecking = assessment.rightsNeedChecking ?? [
    "Cancellation/switching rights need checking",
  ];
  const contractDate = assessment.contractDate ?? assessment.contractStartOrRenewalDate;
  const contractTimingExplanation =
    assessment.contractTimingExplanation ??
    "Contract start or renewal date is needed. This affects which price-rise terms may apply and whether the increase was shown clearly when you signed or renewed.";

  return `## Broadband/Mobile Price-Rise Assessment

This is a broadband/mobile price-rise assessment. It does not decide legal or financial rights.

- **Document match:** ${confidenceLabels[documentMatchConfidence]}
- **Action confidence:** ${confidenceLabels[actionConfidence]}
- **Draft safety:** ${confidenceLabels[draftSafetyConfidence]}
- **Document match explanation:** ${fallback(assessment.documentMatchExplanation)}
- **Action confidence explanation:** ${fallback(assessment.actionConfidenceExplanation)}
- **Provider terms caveat:** ${assessment.caveat}
- **Provider:** ${assessment.providerName ?? "Not found yet"}
- **Service type:** ${fallback(assessment.serviceType?.replaceAll("_", " "))}
- **Current monthly price:** ${fallback(assessment.oldMonthlyPrice)}
- **New monthly price:** ${fallback(assessment.newMonthlyPrice)}
- **Potential cost increase:** ${assessment.monthlyIncrease ? `${assessment.monthlyIncrease}/month more` : "Not recorded"}
- **Annual increase if unchanged:** ${assessment.annualIncrease ? `${assessment.annualIncrease}/year if unchanged` : "Not recorded"}
- **Effective date:** ${fallback(assessment.effectiveDate)}
- **Response deadline clue:** ${fallback(assessment.responseDeadline)}
- **Contract start/renewal date:** ${contractDate ?? "Needed"}
- **Contract date type:** ${fallback(assessment.contractDateType)}
- **Contract date confidence:** ${fallback(assessment.contractDateConfidence)}
- **Contract timing:** ${fallback(assessment.contractDateRegime?.replaceAll("_", " "))}
- **Contract timing explanation:** ${contractTimingExplanation}

### Contract Clues

${asMarkdownList(assessment.contractClues ?? [])}

### Options Mentioned

${asMarkdownList(optionsMentioned)}

### Provider Wording Found

${providerWordingFound.length > 0 ? asMarkdownList(providerWordingFound) : "- No clear provider wording found"}

### Rights Need Checking

${asMarkdownList(rightsNeedChecking)}

### Evidence Found

${asMarkdownList(assessment.evidenceFound ?? [])}

### Evidence Missing

${asMarkdownList(assessment.evidenceMissing ?? [])}

### Unknowns

${asMarkdownList(assessment.unknowns ?? [])}

### What Not To Assume

- Provider wording is evidence to check with the provider, not a final legal decision from AdminAvenger.
- Confirm whether cancellation or switching rights apply to this account before acting.

`;
};

const createEmailSafetySection = (adminCase: AdminCase) => {
  if (!adminCase.emailSafetyAssessment) {
    return "";
  }

  const assessment = adminCase.emailSafetyAssessment;
  const cannotKnow = assessment.cannotKnow ?? [
    "AdminAvenger cannot confirm who sent the message.",
    "AdminAvenger cannot confirm whether links, payment details, or account warnings should be trusted.",
    "AdminAvenger cannot determine whether this is a scam.",
  ];

  return `## Email Safety Check

AdminAvenger does not determine whether a message is a scam. It flags recognised signals so the user can verify before acting.

- **Plain-language band:** ${getEmailSafetyRiskBandLabel(assessment)}
- **Band explanation:** ${getEmailSafetyRiskBandExplanation(assessment)}
- **Sender:** ${fallback(assessment.senderAddress)}
- **Reply-to:** ${fallback(assessment.replyToAddress)}
- **Next safety action:** ${assessment.nextAction}
- **Disclaimer:** ${assessment.disclaimer}

### Risk Signals

${asMarkdownList([...assessment.riskSignals, ...assessment.cautionSignals])}

### Ordinary Or Inconclusive Details

${asMarkdownList(getEmailSafetyOrdinarySignals(assessment))}

### What AdminAvenger Cannot Confirm

${asMarkdownList(cannotKnow)}

`;
};

export const createSafeMarkdownFilename = (title: string) => {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeTitle || "admin-avenger-case"}-evidence-pack.md`;
};

export const exportCaseToMarkdown = ({
  adminCase,
  item,
  finding,
  drafts,
  impactEntries = [],
  opportunity,
  guidanceCards = [],
}: ExportCaseOptions) => {
  const generatedAt = new Date().toISOString();
  const caseCategoryLabel = opportunity
    ? opportunityTypeLabels[opportunity.opportunityType] ?? categoryLabels[adminCase.category]
    : categoryLabels[adminCase.category];
  const evidenceLines = adminCase.evidence.map(
    (evidence) => `- **${evidence.label}** (${readable(evidence.source)}): ${evidence.value}`,
  );
  const timelineLines = sortNewestFirst(adminCase.timeline).map(
    (event) =>
      `- **${event.title}** - ${formatDate(event.createdAt)}\n  ${event.description}`,
  );
  const draftSections = sortNewestFirst(drafts).map(
    (draft, index) => `### Draft ${index + 1}: ${draft.subject}

Created: ${formatDate(draft.createdAt)}

Recommended next step: ${draft.recommendedNextStep}

Chase after: ${draft.chaseAfterDays} days

\`\`\`text
${draft.body}
\`\`\``,
  );

  return `# ${adminCase.title}

Generated: ${formatDate(generatedAt)}

This evidence pack is for personal organisation only and is not legal, financial, or professional advice.

## Case Summary

- **Category:** ${caseCategoryLabel}
- **Status:** ${readable(adminCase.status)}
- **Urgency:** ${adminCase.urgency}
- **Confidence:** ${adminCase.confidence}
- **Value label:** ${fallback(adminCase.valueLabel)}
- **Chase date:** ${fallback(adminCase.chaseDate)}
- **Outcome note:** ${fallback(adminCase.outcome)}

${adminCase.summary}

## Next Action

${adminCase.nextAction}

${createOpportunitySection(opportunity)}
${createImpactSection(impactEntries)}
${createGuidanceSection(guidanceCards)}
${createDelayRepaySection(adminCase)}
${createBroadbandPriceRiseSection(adminCase)}
${createEmailSafetySection(adminCase)}

## Evidence Locker

${asMarkdownList(evidenceLines)}

## Battle Log

${asMarkdownList(timelineLines)}

## Draft History

${draftSections.length > 0 ? draftSections.join("\n\n") : "No drafts recorded."}

## Linked Finding

- **Finding title:** ${fallback(finding?.title)}
- **Finding summary:** ${fallback(finding?.summary)}
- **Why it matters:** ${fallback(finding?.whyItMatters)}
- **Suggested action:** ${fallback(finding?.suggestedAction)}

## Original Pasted Text

Source title: ${fallback(item?.title)}

\`\`\`text
${item?.rawText ?? "No original source text recorded."}
\`\`\`
`;
};
