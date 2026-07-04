import type {
  AiConfidenceLevel,
  AiDocumentType,
  AiExtractedAmount,
  AiExtractedDate,
  AiExtractedReference,
  AiExtractionResult,
  AiServiceType,
} from "../types";

export type OllamaExtractionErrorCode =
  | "not_running"
  | "model_not_found"
  | "invalid_json"
  | "request_failed";

export class OllamaExtractionError extends Error {
  code: OllamaExtractionErrorCode;

  constructor(code: OllamaExtractionErrorCode, message: string) {
    super(message);
    this.name = "OllamaExtractionError";
    this.code = code;
  }
}

type ExtractWithOllamaOptions = {
  text: string;
  ollamaUrl: string;
  model: string;
};

const documentTypes: AiDocumentType[] = [
  "broadband_price_rise",
  "subscription_renewal",
  "delivery_issue",
  "warranty_issue",
  "train_delay",
  "travel_disruption",
  "bill_or_price_increase",
  "deadline_or_important_reply",
  "unknown",
];

const serviceTypes: AiServiceType[] = [
  "broadband",
  "mobile",
  "broadband_and_mobile",
  "tv_subscription",
  "energy",
  "travel",
  "retail",
  "unknown",
];

const confidenceLevels: AiConfidenceLevel[] = ["low", "medium", "high"];

const extractionSystemPrompt = `You are the local extraction layer for AdminAvenger.

You extract facts from pasted admin text.
You are not an agent.
You do not decide legal rights.
You do not claim entitlement.
You do not submit claims.
You do not send messages.
You do not cancel services.
You do not invent missing facts.

Return only valid JSON matching this shape:
{
  "documentType": "broadband_price_rise | subscription_renewal | delivery_issue | warranty_issue | train_delay | travel_disruption | bill_or_price_increase | deadline_or_important_reply | unknown",
  "summary": "short factual summary",
  "providerName": "provider or null",
  "serviceType": "broadband | mobile | broadband_and_mobile | tv_subscription | energy | travel | retail | unknown | null",
  "amounts": [{"label":"", "value": 0, "currency":"GBP | unknown", "frequency":"one_off | monthly | annual | unknown", "sourceQuote":""}],
  "dates": [{"label":"", "value":"YYYY-MM-DD or original date wording or null", "sourceQuote":""}],
  "referenceNumbers": [{"label":"", "value":"", "sourceQuote":""}],
  "contractClues": [],
  "optionsMentioned": [],
  "rightsConfirmed": [],
  "rightsNeedChecking": [],
  "deadlines": [{"label":"", "value":"YYYY-MM-DD or original date wording or null", "sourceQuote":""}],
  "evidenceQuotes": [],
  "missingInformation": [],
  "confidence": {"documentType":"low | medium | high", "factExtraction":"low | medium | high", "actionability":"low | medium | high"},
  "warnings": []
}

For broadband/mobile price rises, extract provider name, current monthly price, new monthly price, effective date, contract start or renewal date, options mentioned, cancellation or switching wording, deadlines, and missing facts.

Rules:
- for travel disruption or extra cost recovery, extract booking reference, airline, travel company, extra cost amount, proof requested, proof available, missing proof, and suggested recipient. Do not decide entitlement or claim success.
- for approved refund emails, extract the refund amount, refund window, original payment method wording, and reference number. Do not turn "within 5 to 10 working days" into a hard deadline.
- dates and deadlines must be copied from the provided text or supported by an exact sourceQuote from the text.
- "confirm whether cancellation rights apply" means rightsNeedChecking, not rightsConfirmed.
- "check whether cancellation rights apply" means rightsNeedChecking, not rightsConfirmed.
- only use rightsConfirmed if text clearly says the user may cancel, may leave, can leave without paying an early termination charge, leave penalty-free, switch without charge, or exit without early termination fees.
- for delivery tracking updates, do not treat a delivery arrival window as a deadline unless there is a reply/action/problem cue such as failed delivery, missing parcel, action required, contact us before, claim before, refund, damaged, or not received.
- do not call a cost increase money recovered.
- do not invent dates or provider names.
- if uncertain, use nulls, missingInformation, warnings, and low confidence.`;

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const getNullableString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : null;

const getStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const getDocumentType = (value: unknown): AiDocumentType =>
  documentTypes.includes(value as AiDocumentType) ? (value as AiDocumentType) : "unknown";

const getServiceType = (value: unknown): AiServiceType | null => {
  if (value === null) {
    return null;
  }

  return serviceTypes.includes(value as AiServiceType) ? (value as AiServiceType) : "unknown";
};

const getConfidence = (value: unknown): AiConfidenceLevel =>
  confidenceLevels.includes(value as AiConfidenceLevel) ? (value as AiConfidenceLevel) : "low";

const getAmounts = (value: unknown): AiExtractedAmount[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((amount) => ({
    label: getString(amount.label, "Amount"),
    value: typeof amount.value === "number" ? amount.value : null,
    currency: amount.currency === "GBP" ? "GBP" : "unknown",
    frequency:
      amount.frequency === "one_off" ||
      amount.frequency === "monthly" ||
      amount.frequency === "annual"
        ? amount.frequency
        : "unknown",
    sourceQuote: getString(amount.sourceQuote),
  }));
};

const getDates = (value: unknown): AiExtractedDate[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((date) => ({
    label: getString(date.label, "Date"),
    value: getNullableString(date.value),
    sourceQuote: getString(date.sourceQuote),
  }));
};

const getReferences = (value: unknown): AiExtractedReference[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((reference) => ({
      label: getString(reference.label, "Reference"),
      value: getString(reference.value),
      sourceQuote: getString(reference.sourceQuote),
    }))
    .filter((reference) => reference.value.length > 0);
};

const extractJsonObject = (content: string) => {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new OllamaExtractionError(
        "invalid_json",
        "Local AI extraction returned an unreadable result. AdminAvenger used local rules instead.",
      );
    }

    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
  }
};

const toAiExtractionResult = (value: unknown): AiExtractionResult => {
  if (!isRecord(value)) {
    throw new OllamaExtractionError(
      "invalid_json",
      "Local AI extraction returned an unreadable result. AdminAvenger used local rules instead.",
    );
  }

  const confidence = isRecord(value.confidence) ? value.confidence : {};

  return {
    documentType: getDocumentType(value.documentType),
    summary: getString(value.summary, "Local AI extracted facts from the pasted text."),
    providerName: getNullableString(value.providerName),
    serviceType: getServiceType(value.serviceType),
    amounts: getAmounts(value.amounts),
    dates: getDates(value.dates),
    referenceNumbers: getReferences(value.referenceNumbers),
    contractClues: getStringArray(value.contractClues),
    optionsMentioned: getStringArray(value.optionsMentioned),
    rightsConfirmed: getStringArray(value.rightsConfirmed),
    rightsNeedChecking: getStringArray(value.rightsNeedChecking),
    deadlines: getDates(value.deadlines),
    evidenceQuotes: getStringArray(value.evidenceQuotes),
    missingInformation: getStringArray(value.missingInformation),
    confidence: {
      documentType: getConfidence(confidence.documentType),
      factExtraction: getConfidence(confidence.factExtraction),
      actionability: getConfidence(confidence.actionability),
    },
    warnings: getStringArray(value.warnings),
  };
};

const parseOllamaResponse = async (response: Response) => {
  const responseText = await response.text();

  if (!response.ok) {
    const lowerText = responseText.toLowerCase();

    if (response.status === 404 || (lowerText.includes("model") && lowerText.includes("not found"))) {
      throw new OllamaExtractionError(
        "model_not_found",
        "Local Ollama model not found. Check the model name in Settings or run `ollama pull llama3.2`.",
      );
    }

    throw new OllamaExtractionError(
      "request_failed",
      "Local Ollama extraction failed. AdminAvenger used local rules instead.",
    );
  }

  const parsed = JSON.parse(responseText) as unknown;

  if (!isRecord(parsed) || !isRecord(parsed.message) || typeof parsed.message.content !== "string") {
    throw new OllamaExtractionError(
      "invalid_json",
      "Local AI extraction returned an unreadable result. AdminAvenger used local rules instead.",
    );
  }

  return parsed.message.content;
};

export const extractAdminFactsWithOllama = async ({
  text,
  ollamaUrl,
  model,
}: ExtractWithOllamaOptions): Promise<AiExtractionResult> => {
  try {
    const response = await fetch(`${normalizeUrl(ollamaUrl)}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.trim() || "llama3.2",
        stream: false,
        format: "json",
        options: {
          temperature: 0,
        },
        messages: [
          {
            role: "system",
            content: extractionSystemPrompt,
          },
          {
            role: "user",
            content: `Extract structured facts from this pasted admin text. Return JSON only.\n\n${text}`,
          },
        ],
      }),
    });

    const content = await parseOllamaResponse(response);
    return toAiExtractionResult(extractJsonObject(content));
  } catch (error) {
    if (error instanceof OllamaExtractionError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new OllamaExtractionError(
        "invalid_json",
        "Local AI extraction returned an unreadable result. AdminAvenger used local rules instead.",
      );
    }

    throw new OllamaExtractionError(
      "not_running",
      "Local Ollama could not be reached, so AdminAvenger used local rules instead.",
    );
  }
};
