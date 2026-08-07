import type { AdminFinding, AdminItem, EmailSafetyAssessment, EmailSafetyRiskBand } from "../types";
import {
  detectSensitiveInformationRequest,
  SENSITIVE_INFORMATION_WARNING,
} from "./sensitiveInformationRequest";

// Deterministic, local email safety assessor.
//
// It never decides whether an email is a scam or actually from the organisation. It only
// surfaces signals so the user can verify before acting.

const emailAddressPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Short deadlines are written both as digits ("within 24 hours") and as words
// ("within two hours"). Only hour/minute windows count as pressure: ordinary
// admin messages routinely promise a response "within 10 working days", and
// that must never read as urgency.
const SHORT_DEADLINE_COUNT =
  String.raw`(?:\d+|a few|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty[- ]?four|forty[- ]?eight)`;
const urgentPressurePattern = new RegExp(
  String.raw`\b(immediately|right away|act now|urgent(?:ly)?|within ${SHORT_DEADLINE_COUNT} ?(?:hours?|minutes?)|today|as soon as possible|don'?t delay|final warning|failure to act now|click immediately)\b`,
  "i",
);

// A threat can be aimed at the account or at access to it. "Access will be
// suspended" is the same pressure as "your account will be suspended" and must
// be recognised as one signal, not ignored.
const accountThreatPattern =
  /\b(account (?:will be |is )?(?:locked|suspended|closed|disabled|deactivated)|permanent closure|avoid suspension|locked today|restricted access|(?:your |the )?(?:account )?access (?:will|may|could|shall) be (?:suspended|restricted|blocked|revoked|withdrawn|removed|disabled)|(?:your |the )?(?:account|service|access) (?:will|may|could) be (?:suspended|restricted|blocked|revoked|disabled|closed))\b/i;

const sensitiveDetailRequestPattern =
  /\b(?:send|share|provide|enter|reply with|tell us|confirm|verify|update)\s+(?:us\s+)?(?:your\s+|the\s+)?(?:bank details|bank account|sort code|account number|login details|password|one[- ]?time code|security code|verification code|pin number|card details|payment card|credit card|debit card|cvv|cvc)\b/gi;
const bankDetailRequestPattern =
  /\b(?:send|share|provide|enter|reply with|confirm|verify|update)\s+(?:us\s+)?(?:your\s+|the\s+)?(?:bank details|bank account|sort code|account number)\b/gi;
const loginDetailRequestPattern =
  /\b(?:send|share|provide|enter|reply with|tell us|confirm|verify|update)\s+(?:us\s+)?(?:your\s+|the\s+)?(?:login details|password|one[- ]?time code|security code|verification code|pin number)\b/gi;
const cardDetailRequestPattern =
  /\b(?:send|share|provide|enter|reply with|confirm|verify|update)\s+(?:us\s+)?(?:your\s+|the\s+)?(?:card details|payment card|credit card|debit card|cvv|cvc)\b/gi;
const verificationLinkPattern =
  /\b(?:click|follow|open|use|using|visit)\s+(?:this|the|a|message)?\s*(?:link|url)|\b(?:click here|confirm here|sign in here|verify here)\b/gi;
const suppliedUrlPattern = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|co\.uk|org|net|example)(?:\/\S*)?/gi;
const moneyDemandPattern =
  /\b(?:pay|send|transfer)\s+(?:a\s+|the\s+)?(?:GBP\s*)?[£$€]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\b/gi;
const unusualPaymentPattern =
  /\b(?:send payment|pay now|bank transfer|gift cards?|crypto|bitcoin|voucher|guaranteed investment return|double (?:it|your money)|avoid arrest)\b/i;
const changedBankDetailsPattern = /\bbank details (?:have|has) changed\b/i;
const verificationPaymentActionPattern = /\b(?:send|transfer|make)\b/i;
const verificationPaymentPurposePattern =
  /\b(?:to\s+verify|for\s+verification|verification\s+payment|verify(?:ing)?\s+(?:your|the)\s+details)\b/i;
const newBankDestinationPattern =
  /\b(?:(?:our|the|their)\s+)?(?:new|replacement)\s+(?:bank\s+account|account|bank\s+details|payment\s+details)\b/i;
const describedVerificationPaymentPattern =
  /\b(?:small|test|verification)\s+(?:verification\s+)?payment\b/i;
const attachmentPattern = /\b(?:open|download)\s+(?:the\s+)?attach(?:ment|ed file)|\benable (?:editing|macros|content)\b/gi;
const activeAttachmentPattern = /\b(?:enable (?:editing|macros|content)|run the attached)\b/i;
const impersonationPattern = /\b(?:this is|we are)\s+(?:the\s+)?(?:tax office|hmrc|police|your bank)|\byour manager\b/i;
const unrealisticReturnPattern = /\b(?:guaranteed (?:investment )?return|double (?:it|your money)(?: this month| today)?)\b/i;
const giftCardCodePattern = /\b(?:gift cards?|voucher)\b.*\b(?:send|share|provide)\b.*\bcodes?\b/i;
const spellingConcernPattern = /\b(dear customer,?\s+your account|kindly|dear valued customer)\b/i;

const knownProviderPattern =
  /\b(google play|google commerce limited|paypal|amazon|netflix|microsoft|apple|air mauritius|loveholidays|e\.?on)\b/i;
const normalReferencePattern =
  /\b(order number|booking reference|reference|receipt|invoice|item:|price:|subscription|charged|payment received)\b/i;
const officialAppPattern =
  /\b(official app|official website|manage subscriptions|open your app|visit our website directly|learn how to cancel)\b/i;

const isNegatedAt = (text: string, index: number) =>
  /(?:\bdo not|\bdon't|\bnever|\bnot to|\brather than)\s+(?:\w+\s+){0,4}$/i.test(
    text.slice(Math.max(0, index - 60), index),
  );

const hasUnnegatedMatch = (text: string, pattern: RegExp) => {
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (!isNegatedAt(text, match.index ?? 0)) {
      return true;
    }
  }
  return false;
};

// The canonical credential-request detector runs alongside the original
// patterns. It is strictly additive: it recognises wording the narrower
// patterns miss (for example "send us the six-digit verification code", where
// an adjective sits between the determiner and the noun) and it applies the
// same negation rule, so protective wording stays a safe negative.
const hasSensitiveDetailRequest = (text: string) =>
  hasUnnegatedMatch(text, sensitiveDetailRequestPattern) ||
  detectSensitiveInformationRequest(text).requested;
const hasBankDetailRequest = (text: string) =>
  hasUnnegatedMatch(text, bankDetailRequestPattern) ||
  detectSensitiveInformationRequest(text).kinds.includes("bank");
const hasLoginDetailRequest = (text: string) =>
  hasUnnegatedMatch(text, loginDetailRequestPattern) ||
  detectSensitiveInformationRequest(text).kinds.includes("login");
const hasCardDetailRequest = (text: string) =>
  hasUnnegatedMatch(text, cardDetailRequestPattern) ||
  detectSensitiveInformationRequest(text).kinds.includes("card");
const hasSuppliedActionLink = (text: string) =>
  hasUnnegatedMatch(text, verificationLinkPattern) || hasUnnegatedMatch(text, suppliedUrlPattern);
const hasMoneyDemand = (text: string) => hasUnnegatedMatch(text, moneyDemandPattern);
const hasNewBankVerificationPayment = (text: string) =>
  text
    .split(/\n+|(?<=[.!?])\s+(?!\d)/)
    .some(
      (sentence) =>
        verificationPaymentActionPattern.test(sentence) &&
        verificationPaymentPurposePattern.test(sentence) &&
        newBankDestinationPattern.test(sentence) &&
        (hasMoneyDemand(sentence) || describedVerificationPaymentPattern.test(sentence)),
    );
const hasUnexpectedAttachmentAction = (text: string) =>
  hasUnnegatedMatch(text, attachmentPattern);

const extractLabeledEmail = (text: string, label: RegExp) =>
  text.match(label)?.[1]?.replace(/[)>.,;]+$/g, "").trim();

const firstEmailAddress = (text: string) => text.match(emailAddressPattern)?.[0];

const domainOf = (address?: string) => {
  if (!address) {
    return undefined;
  }

  const at = address.lastIndexOf("@");
  return at === -1 ? undefined : address.slice(at + 1).toLowerCase();
};

const hasManyHyphens = (domain?: string) =>
  Boolean(domain && (domain.match(/-/g)?.length ?? 0) >= 2);

const claimedOrganisation = (text: string) =>
  text.match(/\b(Google Play|Google|Google Commerce Limited|Air Mauritius|loveholidays|E\.?ON|PayPal|Amazon|Netflix|Apple|Microsoft)\b/i)?.[0];

const likelyDomainForClaim = (claim?: string) => {
  if (!claim) {
    return undefined;
  }

  if (/google/i.test(claim)) {
    return "google.com";
  }

  if (/air mauritius/i.test(claim)) {
    return "airmauritius.com";
  }

  if (/loveholidays/i.test(claim)) {
    return "loveholidays.com";
  }

  return undefined;
};

export const isEmailLikeText = (text: string, sourceType?: AdminItem["sourceType"]) =>
  sourceType === "email" ||
  /^(from|sender|reply[- ]?to|to|subject|body):/im.test(text) ||
  /\bmailto:/i.test(text) ||
  (text.match(emailAddressPattern)?.length ?? 0) > 0;

type LegacyEmailSafetyLevel = "lower_risk" | "caution" | "high_risk";

const riskBandContent: Record<
  EmailSafetyRiskBand,
  {
    label: EmailSafetyAssessment["riskBandLabel"];
    explanation: string;
    nextAction: string;
  }
> = {
  high_risk_signals: {
    label: "High-risk signals found",
    explanation:
      "Several warning signs were found. Do not use links, phone numbers or payment details from this message until you have verified the organisation independently.",
    nextAction:
      "Do not use links, phone numbers, attachments, or payment details from this message. Verify through an official website, statement, trusted account, or another independently sourced contact route.",
  },
  verify_before_acting: {
    label: "Caution - verify before acting",
    explanation:
      "Some details need checking. Verify the sender using contact details from an official website, statement or trusted account before acting.",
    nextAction:
      "Do not rely on links or contact details in this message. Open the organisation's official website or app yourself, or use contact details from a trusted statement or account.",
  },
  lower_risk_verify: {
    label: "Looks lower risk, but still verify",
    explanation:
      "Fewer recognised warning signs were found, but AdminAvenger cannot confirm who actually sent the message. Verify important requests independently before acting.",
    nextAction:
      "Fewer warning signs were recognised, but still verify important requests through an official website, trusted account, or independent contact route before sharing personal, payment, or login details.",
  },
};

const riskBandFromScores = (
  cautionScore: number,
  threatScore: number,
  threatSignals: string[],
): EmailSafetyRiskBand => {
  if (threatScore >= 9 || threatSignals.length >= 4) {
    return "high_risk_signals";
  }

  if (threatScore >= 3 || cautionScore >= 4) {
    return "verify_before_acting";
  }

  return "lower_risk_verify";
};

const legacyLevelToRiskBand = (level?: LegacyEmailSafetyLevel): EmailSafetyRiskBand | undefined => {
  if (level === "high_risk") {
    return "high_risk_signals";
  }

  if (level === "caution") {
    return "verify_before_acting";
  }

  if (level === "lower_risk") {
    return "lower_risk_verify";
  }

  return undefined;
};

export const getEmailSafetyRiskBand = (assessment: EmailSafetyAssessment): EmailSafetyRiskBand =>
  assessment.riskBand ??
  legacyLevelToRiskBand((assessment as { overallLevel?: LegacyEmailSafetyLevel }).overallLevel) ??
  "verify_before_acting";

export const getEmailSafetyRiskBandLabel = (assessment: EmailSafetyAssessment) =>
  assessment.riskBandLabel ?? riskBandContent[getEmailSafetyRiskBand(assessment)].label;

export const getEmailSafetyRiskBandExplanation = (assessment: EmailSafetyAssessment) =>
  assessment.riskBandExplanation ?? riskBandContent[getEmailSafetyRiskBand(assessment)].explanation;

export const getEmailSafetyOrdinarySignals = (assessment: EmailSafetyAssessment) =>
  assessment.ordinarySignals ?? (assessment as { safeSignals?: string[] }).safeSignals ?? [];

export const assessEmailSafety = (
  text: string,
  sourceType?: AdminItem["sourceType"],
): EmailSafetyAssessment => {
  const senderAddress =
    extractLabeledEmail(text, /(?:from|sender)\s*:?\s*(?:\[[^\]]+\]\(mailto:)?([^\s<>()[\]]+@[^\s<>()[\]]+)/i) ??
    (isEmailLikeText(text, sourceType) ? firstEmailAddress(text) : undefined);
  const replyToAddress = extractLabeledEmail(
    text,
    /reply[- ]?to\s*:?\s*(?:\[[^\]]+\]\(mailto:)?([^\s<>()[\]]+@[^\s<>()[\]]+)/i,
  );
  const senderDomain = domainOf(senderAddress);
  const replyToDomain = domainOf(replyToAddress);
  const replyToMismatch = Boolean(
    senderDomain && replyToDomain && senderDomain !== replyToDomain,
  );
  const claim = claimedOrganisation(text);
  const expectedDomain = likelyDomainForClaim(claim);
  const senderMatchesClaim = Boolean(
    expectedDomain && senderDomain && senderDomain.endsWith(expectedDomain),
  );
  const senderDoesNotMatchClaim = Boolean(
    expectedDomain && senderDomain && !senderDomain.endsWith(expectedDomain),
  );
  const suspiciousSenderDomain = Boolean(
    senderDomain &&
      (/secure|login|verify|account|update|support|service|-bank|bank-/i.test(senderDomain) ||
        hasManyHyphens(senderDomain)),
  );
  const bankDetailRequest = hasBankDetailRequest(text);
  const loginDetailRequest = hasLoginDetailRequest(text);
  const cardDetailRequest = hasCardDetailRequest(text);
  const moneyDemand = hasMoneyDemand(text);
  const suppliedActionLink = hasSuppliedActionLink(text);
  const unexpectedAttachmentAction = hasUnexpectedAttachmentAction(text);
  const changedBankPaymentInstruction =
    changedBankDetailsPattern.test(text) &&
    (moneyDemand || /\b(?:send|make|redirect)\s+(?:the\s+|an?\s+)?(?:invoice\s+)?payment\b/i.test(text));
  const newBankVerificationPayment = hasNewBankVerificationPayment(text);

  const threatSignals = [
    accountThreatPattern.test(text) ? "Account locked or suspension threat" : undefined,
    bankDetailRequest ? "Asks for bank details" : undefined,
    loginDetailRequest ? "Asks for login details or one-time code" : undefined,
    cardDetailRequest ? "Asks for card details" : undefined,
    changedBankPaymentInstruction ? "Changed bank details with payment instruction" : undefined,
    newBankVerificationPayment ? "Verification payment to new bank details" : undefined,
    suspiciousSenderDomain ? "Suspicious sender domain" : undefined,
    replyToMismatch ? "Reply-to mismatch" : undefined,
    senderDoesNotMatchClaim ? "Sender does not match claimed organisation" : undefined,
    moneyDemand || unusualPaymentPattern.test(text)
      ? "Payment pressure or unusual payment request"
      : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const cautionSignals = [
    urgentPressurePattern.test(text) ? "Urgent pressure" : undefined,
    suppliedActionLink ? "Click/verify immediately wording" : undefined,
    unexpectedAttachmentAction ? "Unexpected attachment wording" : undefined,
    spellingConcernPattern.test(text) ? "Generic or unusual wording" : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const ordinarySignals = [
    knownProviderPattern.test(text) && !urgentPressurePattern.test(text)
      ? "Known provider wording without urgent pressure"
      : undefined,
    !bankDetailRequest && !loginDetailRequest && !cardDetailRequest
      ? "No bank, card, login, or one-time code request found"
      : undefined,
    !accountThreatPattern.test(text) && !urgentPressurePattern.test(text)
      ? "No urgent account threat found"
      : undefined,
    senderMatchesClaim ? "Sender domain appears to match the claimed organisation" : undefined,
    normalReferencePattern.test(text) ? "Contains normal order/reference information" : undefined,
    officialAppPattern.test(text)
      ? "Mentions managing through an app/site without aggressive link pressure"
      : undefined,
    !unexpectedAttachmentAction ? "No attachment request found" : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const threatScore = threatSignals.length * 3;
  const cautionScore = cautionSignals.length * 2 + (senderAddress ? 0 : 1);
  const riskBand = riskBandFromScores(cautionScore, threatScore, threatSignals);
  const bandContent = riskBandContent[riskBand];
  // A direct request for a code, password, PIN, or card/bank credential always
  // gets the explicit "do not share it" instruction, whichever band applies.
  // This states what must not be shared; it never says the sender is a scammer.
  const sensitiveInformationRequested =
    bankDetailRequest || loginDetailRequest || cardDetailRequest;

  return {
    isEmailLike: isEmailLikeText(text, sourceType),
    riskBand,
    riskBandLabel: bandContent.label,
    riskBandExplanation: bandContent.explanation,
    riskSignals: threatSignals,
    cautionSignals,
    ordinarySignals,
    senderAddress,
    replyToAddress,
    senderDomain,
    replyToDomain,
    replyToMismatch,
    cannotKnow: [
      "AdminAvenger cannot confirm the sender's identity.",
      "AdminAvenger cannot confirm whether an organisation actually sent this message.",
      "AdminAvenger cannot confirm whether any link is trustworthy.",
      "AdminAvenger cannot confirm whether payment details actually belong to the organisation.",
      "AdminAvenger cannot determine whether the message is fraudulent.",
      "AdminAvenger cannot confirm whether you owe money or whether an account is actually at risk.",
    ],
    nextAction: sensitiveInformationRequested
      ? `${SENSITIVE_INFORMATION_WARNING} ${bandContent.nextAction}`
      : bandContent.nextAction,
    disclaimer:
      "AdminAvenger flags recognised signals only. It cannot confirm who sent the message, payment details, links, money owed, or account risk.",
  };
};

/**
 * Decides whether email safety should become the primary public result.
 * Ordinary invoices, expected attachments and single weak cautions stay on
 * their normal route; strong requests or corroborating signal combinations
 * take precedence. This remains a signal policy, not a scam determination.
 */
export const shouldPrioritiseEmailSafety = (
  text: string,
  assessment = assessEmailSafety(text, "email"),
) => {
  if (!assessment.isEmailLike) {
    return false;
  }

  const sensitiveRequest = hasSensitiveDetailRequest(text);
  const moneyDemand = hasMoneyDemand(text) || unusualPaymentPattern.test(text);
  const actionLink = hasSuppliedActionLink(text);
  const urgent = urgentPressurePattern.test(text);
  const threat = accountThreatPattern.test(text) || /\b(?:avoid arrest|court action)\b/i.test(text);
  const changedBankPayment =
    changedBankDetailsPattern.test(text) &&
    (moneyDemand || /\b(?:send|make|redirect)\s+(?:the\s+|an?\s+)?(?:invoice\s+)?payment\b/i.test(text));
  const newBankVerificationPayment = hasNewBankVerificationPayment(text);
  const impersonationAction =
    impersonationPattern.test(text) && (moneyDemand || actionLink || sensitiveRequest);
  const activeAttachment =
    activeAttachmentPattern.test(text) && hasUnexpectedAttachmentAction(text);
  const corroboratedIdentitySignal =
    (assessment.replyToMismatch ||
      assessment.riskSignals.includes("Suspicious sender domain") ||
      assessment.riskSignals.includes("Sender does not match claimed organisation")) &&
    (urgent || actionLink || moneyDemand || sensitiveRequest);

  return (
    sensitiveRequest ||
    changedBankPayment ||
    newBankVerificationPayment ||
    (actionLink && (urgent || moneyDemand || threat)) ||
    impersonationAction ||
    unrealisticReturnPattern.test(text) ||
    giftCardCodePattern.test(text) ||
    (threat && (actionLink || moneyDemand || sensitiveRequest)) ||
    activeAttachment ||
    corroboratedIdentitySignal
  );
};

const firstSentenceMatching = (text: string, pattern: RegExp) =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .find((part) => pattern.test(part));

/**
 * The verbatim sentences that carry a stated consequence and a stated time
 * limit. Keeping the source's own words visible lets a person judge the
 * pressure themselves. AdminAvenger never asserts that the consequence will
 * actually happen; it only shows what the message said.
 */
export const describeStatedPressure = (text: string) => {
  const threatQuote = firstSentenceMatching(text, accountThreatPattern);
  const urgencyQuote = firstSentenceMatching(text, urgentPressurePattern);

  return {
    threatQuote,
    urgencyQuote: urgencyQuote === threatQuote ? undefined : urgencyQuote,
  };
};

export const isSuspiciousEmail = (text: string) =>
  assessEmailSafety(text).riskBand === "high_risk_signals";

export const assessSuspiciousEmail = assessEmailSafety;

export const createEmailSafetyFinding = (
  item: AdminItem,
  assessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType),
): AdminFinding => {
  const highRisk = getEmailSafetyRiskBand(assessment) === "high_risk_signals";
  const credentialRequest = detectSensitiveInformationRequest(
    `${item.title}\n${item.rawText}`,
  );

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: highRisk ? "Email needs safety check" : "Email safety check",
    summary: credentialRequest.requested
      ? "This message asks you to hand over a code, password, PIN, or card or bank details. Those are never needed by a genuine organisation in a reply, so do not send them. AdminAvenger cannot confirm who sent this message."
      : highRisk
        ? "This message has warning signs. Check carefully before clicking links, replying, opening attachments, or sharing payment/login details."
        : "This message has signals worth recording. AdminAvenger cannot confirm who sent it or whether it actually came from the organisation.",
    whyItMatters:
      "Risky emails can pressure people into sharing sensitive information. This case records the safety signals so the user can decide what to do.",
    suggestedAction: credentialRequest.requested
      ? SENSITIVE_INFORMATION_WARNING
      : highRisk
        ? "Use the email safety check. If unsure, open the provider's official website or app directly instead of using links in this email."
        : assessment.nextAction,
    urgency: highRisk || credentialRequest.requested ? "high" : "medium",
    // This finding only exists because shouldPrioritiseEmailSafety already found
    // security evidence, so it must never lose selection to a refund or delivery
    // finding produced by the same message.
    securityPrecedence: true,
    confidence: getEmailSafetyRiskBand(assessment) === "lower_risk_verify" ? "low" : "medium",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};
