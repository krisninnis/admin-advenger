import type { DelayRepayExtractedFacts, DelayRepayExtractionResult } from "../types";

const knownOperators = [
  "Avanti West Coast",
  "Caledonian Sleeper",
  "Chiltern Railways",
  "CrossCountry",
  "East Midlands Railway",
  "Gatwick Express",
  "Grand Central",
  "Great Northern",
  "Great Western Railway",
  "Greater Anglia",
  "Heathrow Express",
  "Hull Trains",
  "LNER",
  "London Northwestern Railway",
  "Lumo",
  "Merseyrail",
  "Northern",
  "ScotRail",
  "South Western Railway",
  "Southeastern",
  "Southern",
  "Thameslink",
  "TransPennine Express",
  "Transport for Wales",
  "West Midlands Railway",
];

const requiredFields: Array<keyof DelayRepayExtractedFacts> = [
  "operator",
  "journey",
  "travelDate",
  "delayDuration",
  "ticketReference",
];

const getMatch = (text: string, pattern: RegExp) => text.match(pattern)?.[1]?.trim();

const normaliseSpaces = (value?: string) => value?.replace(/\s+/g, " ").trim();

const extractOperator = (text: string) => {
  const lowerText = text.toLowerCase();
  const knownOperator = knownOperators.find((operator) =>
    lowerText.includes(operator.toLowerCase()),
  );

  return (
    knownOperator ??
    normaliseSpaces(
      getMatch(
        text,
        /(?:operator|train company|with)\s*[:-]?\s*([A-Z][A-Za-z&\s]+?)(?:\.|,|\n|$)/i,
      ),
    )
  );
};

const extractJourney = (text: string) =>
  normaliseSpaces(
    getMatch(
      text,
      /(?:from\s+([A-Z][A-Za-z\s.'-]+?\s+to\s+[A-Z][A-Za-z\s.'-]+?))(?:\.|,|\son\s|\sat\s|\swas\s|\n|$)/i,
    ),
  );

const extractTravelDate = (text: string) =>
  normaliseSpaces(
    getMatch(
      text,
      /(?:on|travel date|journey date)\s*[:-]?\s*(\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    ),
  );

const extractDelayDuration = (text: string) =>
  normaliseSpaces(
    getMatch(text, /(?:delayed by|delay of|late by)\s*(\d+\s*(?:minutes|mins|minute|min|hours|hour))/i),
  ) ??
  normaliseSpaces(
    getMatch(text, /arrived\s+(\d+\s*(?:minutes|mins|minute|min|hours|hour))\s+late/i),
  ) ??
  normaliseSpaces(
    getMatch(text, /(\d+\s*(?:minutes|mins|minute|min|hours|hour))\s+(?:late|delay|delayed)/i),
  );

const extractTicketReference = (text: string) =>
  normaliseSpaces(
    getMatch(
      text,
      /(?:ticket reference|booking reference|ticket ref|booking ref|reference)\s*[:#-]?\s*([A-Z0-9-]{5,})/i,
    ),
  );

const getExtractionConfidence = (foundCount: number): DelayRepayExtractionResult["extractionConfidence"] => {
  if (foundCount >= 4) {
    return "high";
  }

  if (foundCount >= 2) {
    return "medium";
  }

  return "low";
};

export const extractDelayRepayFactsLocally = (text: string): DelayRepayExtractionResult => {
  const extracted: DelayRepayExtractedFacts = {
    operator: extractOperator(text),
    journey: extractJourney(text),
    travelDate: extractTravelDate(text),
    delayDuration: extractDelayDuration(text),
    ticketReference: extractTicketReference(text),
  };
  const missingFields = requiredFields.filter((field) => !extracted[field]);
  const foundCount = requiredFields.length - missingFields.length;

  return {
    extracted,
    missingFields,
    extractionConfidence: getExtractionConfidence(foundCount),
    extractionConfidenceScore: Math.min(95, foundCount * 18 + 5),
    source: "local_mock",
  };
};

export const extractDelayRepayFacts = async (
  text: string,
): Promise<DelayRepayExtractionResult> => {
  // Future real AI extraction belongs behind a backend/API route, never in browser code.
  // API keys must never be placed in the frontend.
  // AI should extract facts only; deterministic app code should still decide confidence,
  // case creation, warnings, and what the human needs to verify.
  return extractDelayRepayFactsLocally(text);
};
