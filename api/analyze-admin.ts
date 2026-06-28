import type { IncomingMessage, ServerResponse } from "node:http";
import OpenAI from "openai";
import type { AiExtractionResult } from "../src/types.js";

type AnalyzeAdminRequest = {
  inputType?: "text" | "image";
  text?: string;
  imageDataUrl?: string;
  filename?: string;
  focus?: "broadband_price_rise" | "general_money_back";
};

type ApiRequest = IncomingMessage & {
  body?: unknown;
  method?: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const MAX_TEXT_LENGTH = 80_000;
const MAX_IMAGE_DATA_URL_LENGTH = 4_500_000;
const MAX_BODY_BYTES = 5_000_000;

const documentTypes = [
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

const serviceTypes = [
  "broadband",
  "mobile",
  "broadband_and_mobile",
  "tv_subscription",
  "energy",
  "travel",
  "retail",
  "unknown",
];

const confidenceLevels = ["low", "medium", "high"];

const extractedDateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "value", "sourceQuote"],
  properties: {
    label: { type: "string" },
    value: { type: ["string", "null"] },
    sourceQuote: { type: "string" },
  },
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "summary",
    "providerName",
    "serviceType",
    "amounts",
    "dates",
    "referenceNumbers",
    "contractClues",
    "optionsMentioned",
    "rightsConfirmed",
    "rightsNeedChecking",
    "deadlines",
    "evidenceQuotes",
    "missingInformation",
    "confidence",
    "warnings",
  ],
  properties: {
    documentType: { type: "string", enum: documentTypes },
    summary: { type: "string" },
    providerName: { type: ["string", "null"] },
    serviceType: { type: ["string", "null"], enum: [...serviceTypes, null] },
    amounts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "currency", "frequency", "sourceQuote"],
        properties: {
          label: { type: "string" },
          value: { type: ["number", "null"] },
          currency: { type: "string", enum: ["GBP", "unknown"] },
          frequency: { type: "string", enum: ["one_off", "monthly", "annual", "unknown"] },
          sourceQuote: { type: "string" },
        },
      },
    },
    dates: { type: "array", items: extractedDateSchema },
    referenceNumbers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value", "sourceQuote"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
          sourceQuote: { type: "string" },
        },
      },
    },
    contractClues: { type: "array", items: { type: "string" } },
    optionsMentioned: { type: "array", items: { type: "string" } },
    rightsConfirmed: { type: "array", items: { type: "string" } },
    rightsNeedChecking: { type: "array", items: { type: "string" } },
    deadlines: { type: "array", items: extractedDateSchema },
    evidenceQuotes: { type: "array", items: { type: "string" } },
    missingInformation: { type: "array", items: { type: "string" } },
    confidence: {
      type: "object",
      additionalProperties: false,
      required: ["documentType", "factExtraction", "actionability"],
      properties: {
        documentType: { type: "string", enum: confidenceLevels },
        factExtraction: { type: "string", enum: confidenceLevels },
        actionability: { type: "string", enum: confidenceLevels },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
};

const extractionInstructions = `You are the extraction layer for AdminAvenger.

You extract facts from user-provided admin text or images.

You are not an agent.

You do not decide rights.

You do not claim entitlement.

You do not submit claims.

You do not send messages.

You do not cancel services.

You do not invent missing facts.

You return structured JSON only.

Every important extracted fact should include a source quote when possible.

If a fact is missing, list it in missingInformation.

For broadband/mobile price rises, look for:

- provider name
- current monthly price
- new monthly price
- monthly increase if explicitly stated
- effective date
- contract start date
- contract renewal date
- whether price rises were shown upfront
- options mentioned
- cancellation or switching wording
- response deadlines

Rules for rights:

- If text says "confirm whether cancellation rights apply", that is rightsNeedChecking, not rightsConfirmed.
- If text says "check whether cancellation rights apply", that is rightsNeedChecking, not rightsConfirmed.
- If text says "contact us to discuss options", that is optionsMentioned, not rightsConfirmed.
- Only use rightsConfirmed if the document clearly says the user may cancel, leave penalty-free, switch without charge, or exit without early termination fees.

For amounts:

- Extract numerical values.
- Preserve currency.
- Mark frequency if obvious.
- Do not infer money saved.
- Do not call a potential increase "money recovered".

For approved refunds:

- Extract the refund amount, refund window, original payment method wording, and reference number.
- Treat wording such as "within 5 to 10 working days" as an expected refund window, not a hard deadline.
- Do not classify an approved refund primarily as a generic deadline.

For dates:

- Extract exact dates where possible.
- Preserve source quote.
- If date lacks year, keep the visible date string and do not invent the year.
- Do not return dates or deadlines that are not visibly present in the source text or image.

For images:

- Read the image as a document/screenshot/photo.
- Extract visible text and facts.
- If the image is unreadable, return low confidence and warnings.

The model must return only the structured result.

Do not rely on model prose.`;

const sendJson = (res: ServerResponse, statusCode: number, body: unknown) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const sendError = (res: ServerResponse, statusCode: number, code: string, message: string) =>
  sendJson(res, statusCode, {
    ok: false,
    error: {
      code,
      message,
    },
  });

const readJsonBody = async (req: ApiRequest) => {
  if (req.body !== undefined) {
    const approximateSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");

    if (approximateSize > MAX_BODY_BYTES) {
      throw new Error("request_too_large");
    }

    return req.body;
  }

  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      throw new Error("request_too_large");
    }
  }

  return JSON.parse(body || "{}") as unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const asStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isAiExtractionResult = (value: unknown): value is AiExtractionResult => {
  if (!isRecord(value) || !isRecord(value.confidence)) {
    return false;
  }

  return (
    typeof value.documentType === "string" &&
    documentTypes.includes(value.documentType) &&
    typeof value.summary === "string" &&
    (typeof value.providerName === "string" || value.providerName === null) &&
    (typeof value.serviceType === "string" || value.serviceType === null) &&
    Array.isArray(value.amounts) &&
    Array.isArray(value.dates) &&
    Array.isArray(value.referenceNumbers) &&
    asStringArray(value.contractClues) &&
    asStringArray(value.optionsMentioned) &&
    asStringArray(value.rightsConfirmed) &&
    asStringArray(value.rightsNeedChecking) &&
    Array.isArray(value.deadlines) &&
    asStringArray(value.evidenceQuotes) &&
    asStringArray(value.missingInformation) &&
    typeof value.confidence.documentType === "string" &&
    typeof value.confidence.factExtraction === "string" &&
    typeof value.confidence.actionability === "string" &&
    asStringArray(value.warnings)
  );
};

const validateRequestBody = (body: unknown): AnalyzeAdminRequest => {
  if (!isRecord(body)) {
    throw new Error("invalid_body");
  }

  const inputType = body.inputType;
  const text = typeof body.text === "string" ? body.text : undefined;
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined;
  const filename = typeof body.filename === "string" ? body.filename : undefined;
  const focus =
    body.focus === "broadband_price_rise" || body.focus === "general_money_back"
      ? body.focus
      : undefined;

  if (inputType !== "text" && inputType !== "image") {
    throw new Error("invalid_input_type");
  }

  if (inputType === "text") {
    if (!text?.trim()) {
      throw new Error("empty_text");
    }

    if (text.length > MAX_TEXT_LENGTH) {
      throw new Error("text_too_large");
    }
  }

  if (inputType === "image") {
    if (!imageDataUrl?.startsWith("data:image/")) {
      throw new Error("invalid_image");
    }

    if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
      throw new Error("image_too_large");
    }
  }

  return {
    inputType,
    text,
    imageDataUrl,
    filename,
    focus,
  };
};

const getFriendlyValidationError = (error: Error) => {
  if (error.message === "request_too_large" || error.message === "text_too_large") {
    return {
      statusCode: 413,
      code: "input_too_large",
      message: "This input is too large to read with AI. Try a shorter paste or a smaller image.",
    };
  }

  if (error.message === "image_too_large") {
    return {
      statusCode: 413,
      code: "image_too_large",
      message: "This image is too large to read with AI. Try a smaller image or paste the text.",
    };
  }

  return {
    statusCode: 400,
    code: "invalid_input",
    message: "AdminAvenger needs pasted text or a selected image to use AI extraction.",
  };
};

const createModelInput = (body: AnalyzeAdminRequest) => {
  const focusLine =
    body.focus === "broadband_price_rise"
      ? "Focus on broadband/mobile price-rise extraction if the evidence supports it."
      : "Focus on everyday money-back or admin action extraction.";

  const textPrompt = [
    focusLine,
    body.filename ? `Filename: ${body.filename}` : undefined,
    body.inputType === "text" ? `User-provided text:\n${body.text}` : "Read the selected image.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  if (body.inputType === "image") {
    return [
      {
        role: "user" as const,
        content: [
          { type: "input_text" as const, text: textPrompt },
          {
            type: "input_image" as const,
            image_url: body.imageDataUrl,
            detail: "auto" as const,
          },
        ],
      },
    ];
  }

  return [
    {
      role: "user" as const,
      content: [{ type: "input_text" as const, text: textPrompt }],
    },
  ];
};

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendError(res, 405, "method_not_allowed", "Use POST to analyze admin input.");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendError(
      res,
      503,
      "ai_not_configured",
      "AI extraction is not configured yet. Paste text to use local checking.",
    );
    return;
  }

  let requestBody: AnalyzeAdminRequest;

  try {
    requestBody = validateRequestBody(await readJsonBody(req));
  } catch (error) {
    const validationError = getFriendlyValidationError(
      error instanceof Error ? error : new Error("invalid_body"),
    );
    sendError(
      res,
      validationError.statusCode,
      validationError.code,
      validationError.message,
    );
    return;
  }

  try {
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const response = await client.responses.create({
      model,
      instructions: extractionInstructions,
      input: createModelInput(requestBody),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "admin_avenger_extraction",
          strict: true,
          schema: extractionSchema,
        },
      },
    });
    const parsed = JSON.parse(response.output_text) as unknown;

    if (!isAiExtractionResult(parsed)) {
      sendError(
        res,
        502,
        "invalid_ai_output",
        "AI extraction returned an unexpected shape. Paste text to use local checking.",
      );
      return;
    }

    sendJson(res, 200, {
      ok: true,
      extraction: parsed,
      provider: "openai",
      model,
    });
  } catch {
    sendError(
      res,
      502,
      "ai_extraction_failed",
      "AI extraction could not read this. You can paste the text instead.",
    );
  }
}
