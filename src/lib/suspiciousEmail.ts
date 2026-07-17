import type { AdminFinding, AdminItem, EmailSafetyAssessment, EmailSafetyRiskBand } from "../types";

// Deterministic, local email safety assessor.
//
// It never decides whether an email is a scam or actually from the organisation. It only
// surfaces signals so the user can verify before acting.

const emailAddressPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const urgentPressurePattern =
  /\b(immediately|right away|act now|urgent(?:ly)?|within \d+ ?(?:hours|minutes)|today|as soon as possible|don'?t delay|final warning|failure to act now|click immediately)\b/i;

const accountThreatPattern =
  /\b(account (?:will be |is )?(?:locked|suspended|closed|disabled|deactivated)|permanent closure|avoid suspension|locked today|restricted access)\b/i;

const bankDetailsPattern = /\b(bank details|bank account|sort code|account number)\b/i;
const loginDetailsPattern = /\b(login details|password|one[- ]?time code|security code|pin number|sign in to verify)\b/i;
const cardDetailsPattern = /\b(card details|payment card|credit card|debit card|cvv|cvc)\b/i;
const verificationLinkPattern =
  /\b(click (?:this|the|here) link|click here|verify (?:now|your account|here)|update your details|confirm here|follow this link|sign in here|avoid suspension)\b/i;
const paymentPressurePattern =
  /\b(payment request|send payment|pay now|bank transfer|gift card|crypto|bitcoin|voucher)\b/i;
const attachmentPattern = /\b(attachment|attached file|invoice attached|open the attached|download attached)\b/i;
const spellingConcernPattern = /\b(dear customer,?\s+your account|kindly|dear valued customer)\b/i;

const knownProviderPattern =
  /\b(google play|google commerce limited|paypal|amazon|netflix|microsoft|apple|air mauritius|loveholidays|e\.?on)\b/i;
const normalReferencePattern =
  /\b(order number|booking reference|reference|receipt|invoice|item:|price:|subscription|charged|payment received)\b/i;
const officialAppPattern =
  /\b(official app|official website|manage subscriptions|open your app|visit our website directly|learn how to cancel)\b/i;

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

  const threatSignals = [
    accountThreatPattern.test(text) ? "Account locked or suspension threat" : undefined,
    bankDetailsPattern.test(text) ? "Asks for bank details" : undefined,
    loginDetailsPattern.test(text) ? "Asks for login details or one-time code" : undefined,
    cardDetailsPattern.test(text) ? "Asks for card details" : undefined,
    suspiciousSenderDomain ? "Suspicious sender domain" : undefined,
    replyToMismatch ? "Reply-to mismatch" : undefined,
    senderDoesNotMatchClaim ? "Sender does not match claimed organisation" : undefined,
    paymentPressurePattern.test(text) ? "Payment pressure or unusual payment request" : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const cautionSignals = [
    urgentPressurePattern.test(text) ? "Urgent pressure" : undefined,
    verificationLinkPattern.test(text) ? "Click/verify immediately wording" : undefined,
    attachmentPattern.test(text) ? "Unexpected attachment wording" : undefined,
    spellingConcernPattern.test(text) ? "Generic or unusual wording" : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const ordinarySignals = [
    knownProviderPattern.test(text) && !urgentPressurePattern.test(text)
      ? "Known provider wording without urgent pressure"
      : undefined,
    !bankDetailsPattern.test(text) && !loginDetailsPattern.test(text) && !cardDetailsPattern.test(text)
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
    !attachmentPattern.test(text) ? "No attachment request found" : undefined,
  ].filter((signal): signal is string => Boolean(signal));

  const threatScore = threatSignals.length * 3;
  const cautionScore = cautionSignals.length * 2 + (senderAddress ? 0 : 1);
  const riskBand = riskBandFromScores(cautionScore, threatScore, threatSignals);
  const bandContent = riskBandContent[riskBand];

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
      "AdminAvenger cannot determine whether this is a scam.",
      "AdminAvenger cannot confirm whether you owe money or whether an account is actually at risk.",
    ],
    nextAction: bandContent.nextAction,
    disclaimer:
      "AdminAvenger flags recognised signals only. It cannot confirm who sent the message, payment details, links, money owed, or account risk.",
  };
};

export const isSuspiciousEmail = (text: string) =>
  assessEmailSafety(text).riskBand === "high_risk_signals";

export const assessSuspiciousEmail = assessEmailSafety;

export const createEmailSafetyFinding = (
  item: AdminItem,
  assessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType),
): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title:
    getEmailSafetyRiskBand(assessment) === "high_risk_signals"
      ? "Email needs safety check"
      : "Email safety check",
  summary:
    getEmailSafetyRiskBand(assessment) === "high_risk_signals"
      ? "This message has warning signs. Check carefully before clicking links, replying, opening attachments, or sharing payment/login details."
      : "This message has signals worth recording. AdminAvenger cannot confirm who sent it or whether it actually came from the organisation.",
  whyItMatters:
    "Risky emails can pressure people into sharing sensitive information. This case records the safety signals so the user can decide what to do.",
  suggestedAction:
    getEmailSafetyRiskBand(assessment) === "high_risk_signals"
      ? "Use the email safety check. If unsure, open the provider's official website or app directly instead of using links in this email."
      : assessment.nextAction,
  urgency: getEmailSafetyRiskBand(assessment) === "high_risk_signals" ? "high" : "medium",
  confidence: getEmailSafetyRiskBand(assessment) === "lower_risk_verify" ? "low" : "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});
