import type { AiExtractionResult } from "../types";

export type AiGatewayInput = {
  inputType: "text" | "image";
  text?: string;
  imageDataUrl?: string;
  filename?: string;
  focus?: "broadband_price_rise" | "general_money_back";
};

export class AiGatewayError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AiGatewayError";
    this.code = code;
  }
}

type AiGatewaySuccessResponse = {
  ok: true;
  extraction: AiExtractionResult;
  provider: "openai";
  model: string;
};

type AiGatewayFailureResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

type AiGatewayResponse = AiGatewaySuccessResponse | AiGatewayFailureResponse;

export const analyzeAdminInput = async (
  input: AiGatewayInput,
): Promise<AiExtractionResult> => {
  let response: Response;

  try {
    response = await fetch("/api/analyze-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiGatewayError(
      "network_error",
      "AI extraction is not reachable right now. Paste text to use local checking.",
    );
  }

  let body: AiGatewayResponse;

  try {
    body = (await response.json()) as AiGatewayResponse;
  } catch {
    throw new AiGatewayError(
      "invalid_response",
      "AI extraction returned an unreadable response. Paste text to use local checking.",
    );
  }

  if (!response.ok || !body.ok) {
    throw new AiGatewayError(
      body.ok ? "ai_gateway_error" : body.error.code,
      body.ok
        ? "AI extraction is not configured yet or failed. Paste text to use local checking."
        : body.error.message,
    );
  }

  return body.extraction;
};
