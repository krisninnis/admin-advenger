import { countSupportedSourceOccurrences } from "./sourceSupport";

export type SourceReviewState = "confirmed" | "review_required" | "unavailable";

export type SourceDocumentIntakeType =
  | "pasted_text"
  | "camera_photo"
  | "photo"
  | "text_file"
  | "docx"
  | "pdf"
  | "unsupported";

export type SourceExtractionMethod =
  | "user_text"
  | "local_ocr"
  | "browser_text"
  | "docx_text"
  | "pdf_text"
  | "unavailable";

export type SourceSegment = {
  readonly id: string;
  readonly kind: "page" | "photo" | "document";
  readonly order: number;
  readonly text: string;
  readonly pageNumber?: number;
  readonly photoNumber?: number;
};

export type SourceDocument = {
  readonly id: string;
  readonly displayName: string;
  readonly intakeType: SourceDocumentIntakeType;
  readonly extractionMethod: SourceExtractionMethod;
  readonly order: number;
  readonly extractedText: string;
  readonly warnings: readonly string[];
  readonly confidence?: number;
  readonly reviewState: SourceReviewState;
  readonly segments: readonly SourceSegment[];
};

/**
 * Generic source support for a future extracted claim. This deliberately has
 * no financial or care-specific fields: Phase 1 only establishes where a
 * later typed claim came from and whether that source can currently be used.
 */
export type SourceProvenance = {
  readonly sourceDocumentId: string;
  readonly sourceSegmentId?: string;
  readonly sourceQuote: string;
  readonly extractionConfidence?: number;
  readonly reviewState: SourceReviewState;
};

export type SourceProvenanceFailureReason =
  | "unknown_document"
  | "unknown_segment"
  | "empty_quote"
  | "quote_not_found"
  | "ambiguous_quote"
  | "review_required"
  | "source_unavailable";

export type SourceProvenanceValidation =
  | { readonly supported: true }
  | {
      readonly supported: false;
      readonly reason: SourceProvenanceFailureReason;
    };

type TextSourceDocumentInput = {
  readonly id: string;
  readonly displayName: string;
  readonly intakeType: "pasted_text" | "text_file";
  readonly extractionMethod: "user_text" | "browser_text";
  readonly order: number;
  readonly text: string;
};

type PhotoSourceDocumentInput = {
  readonly id: string;
  readonly displayName: string;
  readonly intakeType: "photo" | "camera_photo";
  readonly order: number;
  readonly text: string;
  readonly confidence?: number;
  readonly warnings: readonly string[];
  readonly reviewState: SourceReviewState;
};

let sourceDocumentSequence = 0;

export const createSourceDocumentId = (prefix: string): string => {
  sourceDocumentSequence += 1;
  return `${prefix}-${Date.now()}-${sourceDocumentSequence}`;
};

export const createTextSourceDocument = ({
  id,
  displayName,
  intakeType,
  extractionMethod,
  order,
  text,
}: TextSourceDocumentInput): SourceDocument => ({
  id,
  displayName,
  intakeType,
  extractionMethod,
  order,
  extractedText: text,
  warnings: [],
  reviewState: "confirmed",
  segments: [
    {
      id: `${id}-segment-1`,
      kind: "document",
      order: 1,
      text,
    },
  ],
});

export const createPhotoSourceDocument = ({
  id,
  displayName,
  intakeType,
  order,
  text,
  confidence,
  warnings,
  reviewState,
}: PhotoSourceDocumentInput): SourceDocument => ({
  id,
  displayName,
  intakeType,
  extractionMethod: "local_ocr",
  order,
  extractedText: text,
  warnings: [...warnings],
  ...(confidence === undefined ? {} : { confidence }),
  reviewState,
  segments: [
    {
      id: `${id}-segment-1`,
      kind: "photo",
      order: 1,
      photoNumber: 1,
      text,
    },
  ],
});

const intakeTypes = new Set<SourceDocumentIntakeType>([
  "pasted_text",
  "camera_photo",
  "photo",
  "text_file",
  "docx",
  "pdf",
  "unsupported",
]);
const extractionMethods = new Set<SourceExtractionMethod>([
  "user_text",
  "local_ocr",
  "browser_text",
  "docx_text",
  "pdf_text",
  "unavailable",
]);
const reviewStates = new Set<SourceReviewState>([
  "confirmed",
  "review_required",
  "unavailable",
]);
const segmentKinds = new Set<SourceSegment["kind"]>(["page", "photo", "document"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;
const isValidConfidence = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

const hydrateSegment = (value: unknown): SourceSegment | undefined => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !segmentKinds.has(value.kind as SourceSegment["kind"]) ||
    !isPositiveInteger(value.order) ||
    typeof value.text !== "string"
  ) {
    return undefined;
  }

  const kind = value.kind as SourceSegment["kind"];
  if (
    (kind === "page" && (!isPositiveInteger(value.pageNumber) || value.photoNumber !== undefined)) ||
    (kind === "photo" && (!isPositiveInteger(value.photoNumber) || value.pageNumber !== undefined)) ||
    (kind === "document" && (value.pageNumber !== undefined || value.photoNumber !== undefined))
  ) {
    return undefined;
  }

  return {
    id: value.id,
    kind,
    order: value.order,
    text: value.text,
    ...(kind === "page" ? { pageNumber: value.pageNumber as number } : {}),
    ...(kind === "photo" ? { photoNumber: value.photoNumber as number } : {}),
  };
};

const hydrateDocument = (value: unknown): SourceDocument | undefined => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.displayName) ||
    !intakeTypes.has(value.intakeType as SourceDocumentIntakeType) ||
    !extractionMethods.has(value.extractionMethod as SourceExtractionMethod) ||
    !isPositiveInteger(value.order) ||
    typeof value.extractedText !== "string" ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((warning) => typeof warning === "string") ||
    !reviewStates.has(value.reviewState as SourceReviewState) ||
    !Array.isArray(value.segments) ||
    (value.confidence !== undefined && !isValidConfidence(value.confidence))
  ) {
    return undefined;
  }

  const segments = value.segments.map(hydrateSegment);
  if (
    segments.some((segment) => segment === undefined) ||
    new Set(segments.map((segment) => segment?.id)).size !== segments.length ||
    new Set(segments.map((segment) => segment?.order)).size !== segments.length
  ) {
    return undefined;
  }

  return {
    id: value.id,
    displayName: value.displayName,
    intakeType: value.intakeType as SourceDocumentIntakeType,
    extractionMethod: value.extractionMethod as SourceExtractionMethod,
    order: value.order,
    extractedText: value.extractedText,
    warnings: [...value.warnings] as string[],
    ...(value.confidence === undefined ? {} : { confidence: value.confidence as number }),
    reviewState: value.reviewState as SourceReviewState,
    segments: segments as SourceSegment[],
  };
};

/**
 * Rebuild persisted provenance from known primitive fields only. Invalid
 * nested metadata is omitted by callers rather than guessed or partially
 * trusted.
 */
export const hydrateSourceDocuments = (value: unknown): SourceDocument[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const documents = value.map(hydrateDocument);
  if (
    documents.some((document) => document === undefined) ||
    new Set(documents.map((document) => document?.id)).size !== documents.length ||
    new Set(documents.map((document) => document?.order)).size !== documents.length
  ) {
    return undefined;
  }

  return documents as SourceDocument[];
};

const reviewFailure = (
  state: SourceReviewState,
): SourceProvenanceFailureReason | undefined => {
  if (state === "review_required") {
    return "review_required";
  }

  if (state === "unavailable") {
    return "source_unavailable";
  }

  return undefined;
};

/**
 * Resolve provenance against the selected document and segment. Every failure
 * is explicit and closed: this function never searches another document,
 * chooses a similar segment, or rewrites a quote to make it fit.
 */
export const validateSourceProvenance = (
  provenance: SourceProvenance,
  documents: readonly SourceDocument[],
): SourceProvenanceValidation => {
  const document = documents.find(({ id }) => id === provenance.sourceDocumentId);

  if (!document) {
    return { supported: false, reason: "unknown_document" };
  }

  const provenanceReviewFailure = reviewFailure(provenance.reviewState);
  if (provenanceReviewFailure) {
    return { supported: false, reason: provenanceReviewFailure };
  }

  const documentReviewFailure = reviewFailure(document.reviewState);
  if (documentReviewFailure) {
    return { supported: false, reason: documentReviewFailure };
  }

  const quote = provenance.sourceQuote.trim();
  if (!quote) {
    return { supported: false, reason: "empty_quote" };
  }

  let occurrenceCount: number;

  if (provenance.sourceSegmentId) {
    const matchingSegments = document.segments.filter(
      ({ id }) => id === provenance.sourceSegmentId,
    );

    if (matchingSegments.length !== 1) {
      return { supported: false, reason: "unknown_segment" };
    }

    occurrenceCount = countSupportedSourceOccurrences(
      quote,
      matchingSegments[0].text,
    );
  } else if (document.segments.length > 0) {
    occurrenceCount = document.segments.reduce(
      (count, segment) =>
        count + countSupportedSourceOccurrences(quote, segment.text),
      0,
    );
  } else {
    occurrenceCount = countSupportedSourceOccurrences(
      quote,
      document.extractedText,
    );
  }

  if (occurrenceCount === 0) {
    return { supported: false, reason: "quote_not_found" };
  }

  if (occurrenceCount > 1) {
    return { supported: false, reason: "ambiguous_quote" };
  }

  return { supported: true };
};
