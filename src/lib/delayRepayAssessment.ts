import type { AdminItem, DelayRepayAssessment } from "../types";
import { extractDelayRepayFactsLocally } from "../services/delayRepayExtractionService";

const hasTrainSignal = (text: string) =>
  /\b(train|rail|railway|station|platform|lner|avanti|northern|thameslink|scotrail|great western railway|gwr|southern railway|transpennine|crosscountry)\b/i.test(text);

const hasDelaySignal = (text: string) =>
  /\b(delay repay|delayed train|train delay|delayed service|delay|late|cancelled train|cancelled service)\b/i.test(text);

export const assessUkTrainDelayRefund = (item: AdminItem): DelayRepayAssessment => {
  const text = `${item.title}\n${item.rawText}`;
  const extractionResult = extractDelayRepayFactsLocally(text);
  const extracted = extractionResult.extracted;
  const isTrainDelayScenario = hasTrainSignal(text) && hasDelaySignal(text);
  const evidenceFound = [
    extracted.operator ? { label: "Operator", value: extracted.operator } : undefined,
    extracted.journey ? { label: "Journey", value: extracted.journey } : undefined,
    extracted.travelDate ? { label: "Travel date", value: extracted.travelDate } : undefined,
    extracted.delayDuration ? { label: "Delay duration", value: extracted.delayDuration } : undefined,
    extracted.ticketReference
      ? { label: "Ticket or booking reference", value: extracted.ticketReference }
      : undefined,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const evidenceMissing = [
    !extracted.operator ? "Train operator responsible for the delayed service" : undefined,
    !extracted.journey ? "Journey route, including origin and destination" : undefined,
    !extracted.travelDate ? "Travel date" : undefined,
    !extracted.delayDuration ? "Delay duration at arrival" : undefined,
    !extracted.ticketReference ? "Ticket, booking reference, or proof of travel" : undefined,
  ].filter((item): item is string => Boolean(item));
  const unknownInformation = [
    "The operator's current Delay Repay threshold and claim rules.",
    "Whether the ticket shown is valid proof for the claim.",
    "Whether the delay duration is measured at the final destination.",
    "Whether the claim is still inside the operator's claim window.",
  ];
  const scoreBase = isTrainDelayScenario ? 35 : 0;
  const confidenceScore = Math.min(95, scoreBase + evidenceFound.length * 12);
  const confidenceExplanation =
    evidenceMissing.length > 0
      ? `This looks like a UK train delay refund case, but confidence is limited because ${evidenceMissing.join(", ").toLowerCase()} still needs checking.`
      : "This looks like a strong train delay refund case pattern, but operator rules and proof of travel still need human checking before claiming.";

  return {
    workflow: "uk_train_delay_refund",
    isTrainDelayScenario,
    extracted,
    evidenceFound,
    evidenceMissing,
    unknownInformation,
    confidenceScore,
    confidenceExplanation,
    ruleCaveat:
      "Delay Repay thresholds, claim windows, payout levels, and evidence requirements can differ by operator and may change. Check the operator's current policy before submitting.",
    recommendedNextStep:
      evidenceMissing.length > 0
        ? "Fill in the missing journey evidence, then check the train operator's Delay Repay page before submitting."
        : "Check the train operator's current Delay Repay page, then submit the claim with ticket proof if the policy matches this journey.",
  };
};
