import { describe, expect, it } from "vitest";
import {
  createPhotoSourceDocument,
  createTextSourceDocument,
  hydrateSourceDocuments,
  validateSourceProvenance,
  type SourceDocument,
  type SourceProvenance,
} from "../sourceProvenance";
import { isSupportedBySource } from "../sourceSupport";

const documents: SourceDocument[] = [
  {
    id: "attachment-1",
    displayName: "assessment.pdf",
    intakeType: "pdf",
    extractionMethod: "pdf_text",
    order: 1,
    extractedText: "Page one heading\n\nResident contribution: GBP 486 per week.",
    warnings: [],
    reviewState: "confirmed",
    segments: [
      {
        id: "attachment-1-page-1",
        kind: "page",
        order: 1,
        pageNumber: 1,
        text: "Page one heading",
      },
      {
        id: "attachment-1-page-2",
        kind: "page",
        order: 2,
        pageNumber: 2,
        text: "Resident contribution: GBP 486 per week.",
      },
    ],
  },
  {
    id: "attachment-2",
    displayName: "invoice.pdf",
    intakeType: "pdf",
    extractionMethod: "pdf_text",
    order: 2,
    extractedText: "Resident contribution: £486 per week.",
    warnings: [],
    reviewState: "confirmed",
    segments: [
      {
        id: "attachment-2-page-1",
        kind: "page",
        order: 1,
        pageNumber: 1,
        text: "Resident contribution: £486 per week.",
      },
    ],
  },
];

const provenance = (
  overrides: Partial<SourceProvenance> = {},
): SourceProvenance => ({
  sourceDocumentId: "attachment-1",
  sourceSegmentId: "attachment-1-page-2",
  sourceQuote: "Resident contribution: £486 per week.",
  extractionConfidence: 98,
  reviewState: "confirmed",
  ...overrides,
});

describe("validateSourceProvenance", () => {
  it("passes only when the document, segment, quote, and review state resolve", () => {
    expect(validateSourceProvenance(provenance(), documents)).toEqual({ supported: true });
  });

  it("fails closed for an unknown document", () => {
    expect(
      validateSourceProvenance(
        provenance({ sourceDocumentId: "missing-document" }),
        documents,
      ),
    ).toEqual({ supported: false, reason: "unknown_document" });
  });

  it("fails closed for an unknown segment or page", () => {
    expect(
      validateSourceProvenance(
        provenance({ sourceSegmentId: "attachment-1-page-99" }),
        documents,
      ),
    ).toEqual({ supported: false, reason: "unknown_segment" });
  });

  it("fails closed when the supporting quote is absent", () => {
    expect(
      validateSourceProvenance(
        provenance({ sourceQuote: "Resident contribution: £521 per week." }),
        documents,
      ),
    ).toEqual({ supported: false, reason: "quote_not_found" });

    expect(
      validateSourceProvenance(provenance({ sourceQuote: "   " }), documents),
    ).toEqual({ supported: false, reason: "empty_quote" });
  });

  it("supports the existing controlled currency and OCR normalisation", () => {
    expect(validateSourceProvenance(provenance(), documents)).toEqual({ supported: true });
  });

  it("keeps repeated source wording document-specific", () => {
    expect(
      validateSourceProvenance(
        provenance({
          sourceDocumentId: "attachment-2",
          sourceSegmentId: "attachment-2-page-1",
        }),
        documents,
      ),
    ).toEqual({ supported: true });
  });

  it("accepts document-level support when no finer segment is claimed", () => {
    expect(
      validateSourceProvenance(
        provenance({
          sourceDocumentId: "attachment-2",
          sourceSegmentId: undefined,
        }),
        documents,
      ),
    ).toEqual({ supported: true });
  });

  it("fails closed when an unscoped quote occurs in more than one segment", () => {
    const repeatedWithinDocument: SourceDocument = {
      ...documents[0],
      extractedText: "Repeated wording\n\nRepeated wording",
      segments: [
        { id: "repeat-page-1", kind: "page", order: 1, pageNumber: 1, text: "Repeated wording" },
        { id: "repeat-page-2", kind: "page", order: 2, pageNumber: 2, text: "Repeated wording" },
      ],
    };

    expect(
      validateSourceProvenance(
        provenance({ sourceSegmentId: undefined, sourceQuote: "Repeated wording" }),
        [repeatedWithinDocument],
      ),
    ).toEqual({ supported: false, reason: "ambiguous_quote" });
  });

  it("fails closed when a quote occurs more than once within one segment", () => {
    const repeatedWithinSegment: SourceDocument = {
      ...documents[0],
      extractedText: "Resident contribution £500. Resident contribution £500.",
      segments: [
        {
          id: "repeat-page-1",
          kind: "page",
          order: 1,
          pageNumber: 1,
          text: "Resident contribution £500. Resident contribution £500.",
        },
      ],
    };

    expect(
      validateSourceProvenance(
        provenance({
          sourceSegmentId: "repeat-page-1",
          sourceQuote: "Resident contribution £500",
        }),
        [repeatedWithinSegment],
      ),
    ).toEqual({ supported: false, reason: "ambiguous_quote" });
  });

  it("does not support a quote that exists only by spanning page segments", () => {
    const spanningPages: SourceDocument = {
      ...documents[0],
      extractedText: "Resident contribution: GBP\n\n500 per week",
      segments: [
        {
          id: "span-page-1",
          kind: "page",
          order: 1,
          pageNumber: 1,
          text: "Resident contribution: GBP",
        },
        {
          id: "span-page-2",
          kind: "page",
          order: 2,
          pageNumber: 2,
          text: "500 per week",
        },
      ],
    };

    expect(
      validateSourceProvenance(
        provenance({
          sourceSegmentId: undefined,
          sourceQuote: "Resident contribution: £500 per week",
        }),
        [spanningPages],
      ),
    ).toEqual({ supported: false, reason: "quote_not_found" });
  });

  it("does not support a shorter amount from the prefix of a larger amount", () => {
    const largerAmount: SourceDocument = {
      ...documents[0],
      extractedText: "Resident contribution: GBP 1000 per week.",
      segments: [
        {
          id: "amount-page-1",
          kind: "page",
          order: 1,
          pageNumber: 1,
          text: "Resident contribution: GBP 1000 per week.",
        },
      ],
    };

    expect(
      validateSourceProvenance(
        provenance({
          sourceSegmentId: "amount-page-1",
          sourceQuote: "Resident contribution: £100",
        }),
        [largerAmount],
      ),
    ).toEqual({ supported: false, reason: "quote_not_found" });
  });

  it("does not trust review-required or unavailable source material", () => {
    expect(
      validateSourceProvenance(
        provenance({ reviewState: "review_required" }),
        documents,
      ),
    ).toEqual({ supported: false, reason: "review_required" });

    expect(
      validateSourceProvenance(
        provenance({ reviewState: "unavailable" }),
        documents,
      ),
    ).toEqual({ supported: false, reason: "source_unavailable" });

    expect(
      validateSourceProvenance(provenance(), [
        { ...documents[0], reviewState: "review_required" },
      ]),
    ).toEqual({ supported: false, reason: "review_required" });
  });
});

describe("currency source-support boundaries", () => {
  it("accepts the intended GBP/pound encoding normalisation", () => {
    expect(isSupportedBySource("Resident contribution: £100", "Resident contribution: GBP 100"))
      .toBe(true);
  });

  it.each([
    { source: "Resident contribution: GBP 1000", quote: "Resident contribution: £100" },
    { source: "Resident contribution: £10", quote: "Resident contribution: £100" },
    { source: "Resident contribution: USD 100", quote: "Resident contribution: £100" },
    { source: "Resident contribution: GBP 100.50", quote: "Resident contribution: £100" },
  ])("does not broaden $source into support for $quote", ({ source, quote }) => {
    expect(isSupportedBySource(quote, source)).toBe(false);
  });
});

describe("complete source constructors", () => {
  it("creates direct pasted text without fabricated OCR, page, or photo metadata", () => {
    const source = createTextSourceDocument({
      id: "pasted-text-1",
      displayName: "Pasted admin text",
      intakeType: "pasted_text",
      extractionMethod: "user_text",
      order: 1,
      text: "my mum has a PIP review next week",
    });

    expect(source).toEqual({
      id: "pasted-text-1",
      displayName: "Pasted admin text",
      intakeType: "pasted_text",
      extractionMethod: "user_text",
      order: 1,
      extractedText: "my mum has a PIP review next week",
      warnings: [],
      reviewState: "confirmed",
      segments: [
        {
          id: "pasted-text-1-segment-1",
          kind: "document",
          order: 1,
          text: "my mum has a PIP review next week",
        },
      ],
    });
    expect(source).not.toHaveProperty("confidence");
    expect(source.segments[0]).not.toHaveProperty("pageNumber");
    expect(source.segments[0]).not.toHaveProperty("photoNumber");
  });

  it("creates uploaded text with a document segment and stable caller-owned identity", () => {
    const source = createTextSourceDocument({
      id: "uploaded-text-7",
      displayName: "notes.txt",
      intakeType: "text_file",
      extractionMethod: "browser_text",
      order: 1,
      text: "Exact loaded text",
    });

    expect(source.id).toBe("uploaded-text-7");
    expect(source.displayName).toBe("notes.txt");
    expect(source.extractedText).toBe("Exact loaded text");
    expect(source.segments).toEqual([
      {
        id: "uploaded-text-7-segment-1",
        kind: "document",
        order: 1,
        text: "Exact loaded text",
      },
    ]);
  });

  it("creates independently identifiable photos with source-specific OCR metadata", () => {
    const first = createPhotoSourceDocument({
      id: "reviewed-photo-1",
      displayName: "letter-front.jpg",
      intakeType: "photo",
      order: 1,
      text: "Front text",
      confidence: 91,
      warnings: [],
      reviewState: "confirmed",
    });
    const second = createPhotoSourceDocument({
      id: "reviewed-photo-2",
      displayName: "camera-photo.jpg",
      intakeType: "camera_photo",
      order: 2,
      text: "Close-up text",
      confidence: 34,
      warnings: ["This photo may contain mistakes."],
      reviewState: "review_required",
    });

    expect(first.id).not.toBe(second.id);
    expect(first.segments[0]).toMatchObject({ kind: "photo", photoNumber: 1 });
    expect(second).toMatchObject({
      intakeType: "camera_photo",
      confidence: 34,
      warnings: ["This photo may contain mistakes."],
      reviewState: "review_required",
    });
    expect(second.segments[0]).not.toHaveProperty("pageNumber");
  });
});

describe("hydrateSourceDocuments", () => {
  const validSource = createTextSourceDocument({
    id: "pasted-text-1",
    displayName: "Pasted admin text",
    intakeType: "pasted_text",
    extractionMethod: "user_text",
    order: 1,
    text: "Source text",
  });

  it("hydrates valid records into a clean source-only shape", () => {
    const hydrated = hydrateSourceDocuments([
      { ...validSource, file: new File(["binary"], "private.txt") },
    ]);

    expect(hydrated).toEqual([validSource]);
    expect(hydrated?.[0]).not.toHaveProperty("file");
  });

  it.each([
    { label: "unknown review state", value: [{ ...validSource, reviewState: "trusted" }] },
    { label: "invalid confidence", value: [{ ...validSource, confidence: 101 }] },
    { label: "malformed segments", value: [{ ...validSource, segments: [{ id: "bad" }] }] },
    {
      label: "duplicate segment IDs",
      value: [{ ...validSource, segments: [validSource.segments[0], validSource.segments[0]] }],
    },
  ])("rejects $label without fabricating replacement metadata", ({ value }) => {
    expect(hydrateSourceDocuments(value)).toBeUndefined();
  });
});
