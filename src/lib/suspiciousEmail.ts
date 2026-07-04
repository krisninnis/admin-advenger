import type { AdminFinding, AdminItem, EmailSafetyAssessment } from "../types";

// Deterministic, local email safety assessor.
//
// It never says an email is definitely safe or definitely fraud. It only
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

const percentParts = (safeScore: number, cautionScore: number, threatScore: number) => {
  const total = Math.max(1, safeScore + cautionScore + threatScore);
  const safePercent = Math.round((safeScore / total) * 100);
  const cautionPercent = Math.round((cautionScore / total) * 100);
  const threatPercent = Math.max(0, 100 - safePercent - cautionPercent);

  return {
    safePercent,
    cautionPercent,
    threatPercent,
  };
};

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

  const safeSignals = [
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
  const safeScore = Math.max(1, safeSignals.length * 2);
  const { safePercent, cautionPercent, threatPercent } = percentParts(
    safeScore,
    cautionScore,
    threatScore,
  );
  const overallLevel =
    threatScore >= 9 || threatSignals.length >= 4
      ? "high_risk"
      : threatScore >= 3 || cautionScore >= 4
        ? "caution"
        : "lower_risk";
  const overallLabel =
    overallLevel === "high_risk"
      ? "High risk signals found"
      : overallLevel === "caution"
        ? "Caution - verify before acting"
        : "Looks lower risk";
  const nextAction =
    overallLevel === "high_risk"
      ? "Do not click links, open attachments, or share login/payment details from this email. Verify through the official website/app or contact the provider using a trusted number."
      : overallLevel === "caution"
        ? "Do not use links in the email if unsure. Open the provider's official website or app directly and check your account there."
        : "This email does not show obvious high-risk signals, but still check before sharing personal or payment details.";

  return {
    isEmailLike: isEmailLikeText(text, sourceType),
    overallLevel,
    overallLabel,
    safePercent,
    cautionPercent,
    threatPercent,
    riskSignals: threatSignals,
    cautionSignals,
    safeSignals,
    senderAddress,
    replyToAddress,
    senderDomain,
    replyToDomain,
    replyToMismatch,
    nextAction,
    disclaimer:
      "AdminAvenger flags risk signals only. It does not confirm fraud and does not confirm that an email is safe.",
  };
};

export const isSuspiciousEmail = (text: string) =>
  assessEmailSafety(text).overallLevel === "high_risk";

export const assessSuspiciousEmail = assessEmailSafety;

export const createEmailSafetyFinding = (
  item: AdminItem,
  assessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType),
): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title:
    assessment.overallLevel === "high_risk"
      ? "Email needs safety check"
      : "Email safety check",
  summary:
    assessment.overallLevel === "high_risk"
      ? "This message has warning signs. Check carefully before clicking links, replying, opening attachments, or sharing payment/login details."
      : "This email has safety signals worth recording. AdminAvenger does not confirm fraud or safety.",
  whyItMatters:
    "Risky emails can pressure people into sharing sensitive information. This case records the safety signals so the user can decide what to do.",
  suggestedAction:
    assessment.overallLevel === "high_risk"
      ? "Use the email safety check. If unsure, open the provider's official website or app directly instead of using links in this email."
      : assessment.nextAction,
  urgency: assessment.overallLevel === "high_risk" ? "high" : "medium",
  confidence: assessment.overallLevel === "lower_risk" ? "low" : "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});
