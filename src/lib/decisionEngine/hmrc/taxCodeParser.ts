import type { ParsedTaxCode, EmergencyMarker, SpecialCode, TaxCodePrefix, TaxCodeSuffix } from "./types";

const VALID_PREFIXES = new Set(["C", "S"]);

function normaliseCode(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s+/g, "");
  s = s.replace(/[Oo]/g, (m) => {
    const idx = s.indexOf(m);
    if (idx === 0 && s.length > 1 && /[0-9]/.test(s[1] ?? "")) return "0";
    return m;
  });
  return s;
}

function parsePrefix(char: string | undefined): TaxCodePrefix {
  if (!char) return null;
  const upper = char.toUpperCase();
  if (upper === "C") return "C";
  if (upper === "S") return "S";
  return null;
}

function parseSuffix(char: string | undefined): TaxCodeSuffix {
  if (!char) return null;
  const upper = char.toUpperCase();
  if (upper === "L") return "L";
  if (upper === "M") return "M";
  if (upper === "N") return "N";
  if (upper === "T") return "T";
  return null;
}

function parseEmergency(text: string): EmergencyMarker {
  const upper = text.toUpperCase();
  if (upper.includes("NONCUM")) return "NONCUM";
  if (/\bW1\b/i.test(text)) return "W1";
  if (/\bM1\b/i.test(text)) return "M1";
  if (/\bX\b/i.test(text)) return "X";
  return null;
}

function isSpecialCode(code: string): SpecialCode {
  const upper = code.toUpperCase();
  if (upper === "BR") return "BR";
  if (upper === "D0") return "D0";
  if (upper === "D1") return "D1";
  if (upper === "0T") return "0T";
  if (upper === "NT") return "NT";
  if (upper.startsWith("K")) return "K";
  return null;
}

export function parseTaxCode(raw: string, emergencyContext?: string): ParsedTaxCode {
  const parseErrors: string[] = [];
  const normalised = normaliseCode(raw);

  if (!normalised) {
    return {
      raw,
      prefix: null,
      number: null,
      suffix: null,
      emergency: null,
      special: null,
      isKCode: false,
      isCumulative: true,
      valid: false,
      parseErrors: ["Empty tax code"],
    };
  }

  const emergency = emergencyContext ? parseEmergency(emergencyContext) : null;

  const special = isSpecialCode(normalised);
  if (special && special !== "K") {
    return {
      raw,
      prefix: null,
      number: null,
      suffix: null,
      emergency,
      special,
      isKCode: false,
      isCumulative: !emergency,
      valid: true,
      parseErrors,
    };
  }

  let remaining = normalised;
  let prefix: TaxCodePrefix = null;

  if (remaining.length > 0 && VALID_PREFIXES.has(remaining[0]!.toUpperCase())) {
    prefix = parsePrefix(remaining[0]);
    remaining = remaining.slice(1);
  } else if (remaining.length > 0 && remaining[0]!.toUpperCase() === "K") {
    remaining = remaining.slice(1);

    const numMatch = remaining.match(/^(\d+)/);
    if (numMatch) {
      const number = parseInt(numMatch[1], 10);
      const suffix = parseSuffix(remaining[numMatch[1].length]);
      return {
        raw,
        prefix: null,
        number,
        suffix: suffix ?? null,
        emergency,
        special: "K",
        isKCode: true,
        isCumulative: !emergency,
        valid: true,
        parseErrors,
      };
    }

    return {
      raw,
      prefix: null,
      number: null,
      suffix: null,
      emergency,
      special: "K",
      isKCode: true,
      isCumulative: !emergency,
      valid: false,
      parseErrors: [...parseErrors, `K prefix present but no valid number after it`],
    };
  } else {
    const firstDigitIdx = remaining.search(/\d/);
    if (firstDigitIdx > 0) {
      remaining = remaining.slice(firstDigitIdx);
    }
  }

  const numMatch = remaining.match(/^(\d+)/);
  let number: number | null = null;
  let suffix: TaxCodeSuffix = null;

  if (numMatch) {
    number = parseInt(numMatch[1], 10);
    const afterNum = remaining.slice(numMatch[1].length);
    suffix = parseSuffix(afterNum[0]);

    if (afterNum.length > 0 && afterNum[0] !== undefined && suffix === null) {
      const char = afterNum[0];
      if (!/[0-9]/.test(char)) {
        parseErrors.push(`Invalid character "${char}" after tax code number`);
      }
    }

    const afterSuffix = afterNum.slice(1);
    if (afterSuffix.length > 0) {
      const extraEmergency = parseEmergency(afterSuffix);
      if (extraEmergency && !emergency) {
        parseErrors.push(`Extra characters after code: "${afterSuffix}"`);
      } else if (!extraEmergency) {
        parseErrors.push(`Extra characters after code: "${afterSuffix}"`);
      }
    }
  } else {
    parseErrors.push(`No numeric part found in "${normalised}"`);
  }

  return {
    raw,
    prefix,
    number,
    suffix,
    emergency,
    special: null,
    isKCode: false,
    isCumulative: !emergency,
    valid: parseErrors.length === 0 && (number !== null || special !== null),
    parseErrors,
  };
}

export function taxCodeToApproximatePence(code: ParsedTaxCode): number | null {
  if (code.isKCode) return null;
  if (code.special === "BR") return null;
  if (code.special === "D0") return null;
  if (code.special === "D1") return null;
  if (code.special === "0T") return null;
  if (code.special === "NT") return null;
  if (code.number === null) return null;
  return code.number * 1000;
}

export function taxCodeLabel(code: ParsedTaxCode): string {
  if (code.special && code.special !== "K") return code.special;
  if (code.isKCode) {
    const parts: string[] = ["K"];
    if (code.number !== null) parts.push(String(code.number));
    if (code.suffix) parts.push(code.suffix);
    if (code.emergency) parts.push(code.emergency);
    return parts.join("");
  }
  const parts: string[] = [];
  if (code.prefix) parts.push(code.prefix);
  if (code.number !== null) parts.push(String(code.number));
  if (code.suffix) parts.push(code.suffix);
  if (code.emergency) parts.push(code.emergency);
  return parts.join("") || code.raw;
}
