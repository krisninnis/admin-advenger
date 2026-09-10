import { describe, expect, it } from "vitest";
import {
  compareOcrCriticalFields,
  type OcrCriticalFieldCandidate,
} from "../ocrCriticalFieldComparison";

const candidate = (
  id: string,
  text: string,
  confidence = 88,
): OcrCriticalFieldCandidate => ({ id, source: id, text, confidence });

const field = (
  result: ReturnType<typeof compareOcrCriticalFields>,
  kind: "date" | "gbp_amount" | "reference" | "sender_company",
) => result.fields.find((entry) => entry.field === kind);

describe("compareOcrCriticalFields", () => {
  it("treats equivalent GBP formatting as agreement", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Monthly payment: £69.50"),
      candidate("prepared", "Monthly payment: 69.50 GBP"),
      candidate("contrast", "Monthly payment: £69.5"),
    ]);

    expect(field(result, "gbp_amount")).toMatchObject({
      status: "agreement",
      agreedValues: ["69.50"],
    });
    expect(result.reviewRequired).toBe(false);
  });

  it("reports materially different competing GBP facts without choosing a winner", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "New monthly payment: £64.00", 99),
      candidate("prepared", "New monthly payment: £69.50", 71),
    ]);

    expect(field(result, "gbp_amount")?.status).toBe("conflict");
    expect(result).toMatchObject({
      status: "review_required",
      reviewRequired: true,
      hasConflict: true,
    });
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "gbp_amount", reason: "disagreement" }),
    );
    expect(result).not.toHaveProperty("winnerCandidateId");
  });

  it("normalizes equivalent unambiguous date formats", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Notice date: 18 August 2026"),
      candidate("prepared", "Notice date: 18 Aug 2026"),
      candidate("contrast", "Notice date: 18/08/2026"),
    ]);

    expect(field(result, "date")).toMatchObject({
      status: "agreement",
      agreedValues: ["2026-08-18"],
    });
    expect(result.reviewRequired).toBe(false);
  });

  it.each([
    ["18 Aug 2026", "28 Aug 2026"],
    ["25 August 2026", "25 August 2076"],
  ])("keeps materially different dates in conflict: %s vs %s", (first, second) => {
    const result = compareOcrCriticalFields([
      candidate("original", `Notice date: ${first}`),
      candidate("prepared", `Notice date: ${second}`),
    ]);

    expect(field(result, "date")?.status).toBe("conflict");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "date", reason: "disagreement" }),
    );
  });

  it("fails closed instead of equating a locale-ambiguous numeric date", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Notice date: 04/03/2026"),
      candidate("prepared", "Notice date: 04/03/2026"),
    ]);

    expect(field(result, "date")?.status).toBe("ambiguous");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "date", reason: "ambiguous_overlap" }),
    );
    expect(result.reviewRequired).toBe(true);
  });

  it("normalizes harmless reference separators", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Account reference: RE-60419"),
      candidate("prepared", "Account reference: RE 60419"),
    ]);

    expect(field(result, "reference")).toMatchObject({
      status: "agreement",
      agreedValues: ["RE60419"],
    });
    expect(result.reviewRequired).toBe(false);
  });

  it("does not normalize different reference characters into agreement", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Account reference: RE-60419"),
      candidate("prepared", "Account reference: RE-60414"),
    ]);

    expect(field(result, "reference")?.status).toBe("conflict");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "reference", reason: "disagreement" }),
    );
  });

  it("compares strongly labelled numeric account identifiers without treating GBP as a reference", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Account number: 09160334\nAmount: GBP 41.25"),
      candidate("prepared", "Account number: 09160334\nAmount: £41.25"),
    ]);

    expect(field(result, "reference")).toMatchObject({
      status: "agreement",
      agreedValues: ["09160334"],
    });
    expect(field(result, "reference")?.candidates.flatMap(({ values }) => values))
      .not.toContain("GBP41");
  });

  it("compares critical fact sets without depending on their order", () => {
    const result = compareOcrCriticalFields([
      candidate(
        "original",
        "Harbour Energy\nDate: 18 August 2026\nCurrent: £64.00\nNew: £69.50\nReference: HE-20419",
      ),
      candidate(
        "prepared",
        "Reference: HE 20419\nNew: 69.50 GBP\nCurrent: £64\nDate: 18/08/2026\nHarbour Energy",
      ),
    ]);

    expect(result.fields.filter((entry) => entry.status === "agreement").map((entry) => entry.field))
      .toEqual(["date", "gbp_amount", "reference", "sender_company"]);
    expect(result.reviewRequired).toBe(false);
  });

  it("does not report false agreement when one candidate missed a critical field", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Reference: HE-20419\nMonthly payment: £69.50"),
      candidate("partial", "Reference: HE-20419"),
    ]);

    expect(field(result, "reference")?.status).toBe("agreement");
    expect(field(result, "gbp_amount")?.status).toBe("incomplete");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "gbp_amount", reason: "missing" }),
    );
    expect(result.reviewRequired).toBe(true);
  });

  it("fails closed when partially overlapping candidate sets are ambiguous", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Dates: 18 August 2026 and 28 August 2026"),
      candidate("partial", "Date: 18 Aug 2026"),
    ]);

    expect(field(result, "date")?.status).toBe("ambiguous");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: "date", reason: "ambiguous_overlap" }),
    );
    expect(result.reviewRequired).toBe(true);
  });

  it("preserves candidate identity, confidence, and source without using confidence to pick facts", () => {
    const result = compareOcrCriticalFields([
      { id: "accepted-original", source: "original_photo", text: "Reference: NX-77120", confidence: 98 },
      {
        id: "prepared-scan",
        source: "prepared_scan",
        text: "Reference: NX-77128",
        confidence: 72,
        provenance: { sourceDocumentId: "photo-1", sourceSegmentId: "photo-1-segment-1" },
      },
    ]);

    const issue = result.issues.find((entry) => entry.field === "reference");
    expect(issue?.candidates).toEqual([
      expect.objectContaining({ id: "accepted-original", source: "original_photo", confidence: 98 }),
      expect.objectContaining({
        id: "prepared-scan",
        source: "prepared_scan",
        confidence: 72,
        provenance: { sourceDocumentId: "photo-1", sourceSegmentId: "photo-1-segment-1" },
      }),
    ]);
    expect(result.hasConflict).toBe(true);
  });

  it("never turns uncertain negative wording into an adverse consequence", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Northstar Water confirms no late-payment fee and you will not be disconnected. Reference: NW-10018"),
      candidate("prepared", "Northstar Water confirms no late-payment fee and you will not be disconnected. Reference: NW-10013"),
    ]);
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result.reviewRequired).toBe(true);
    expect(serialized).not.toContain("you will be charged a fee");
    expect(serialized).not.toContain("your supply will be disconnected");
    expect(serialized).not.toContain("consequence");
  });

  it("uses generic extraction rather than a document-specific value table", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Northstar Water\nAccount: NW-10018\nAmount: £41.25\nDate: 14 October 2026"),
      candidate("prepared", "Northstar Water\nAccount: NW 10018\nAmount: 41.25 GBP\nDate: 14 Oct 2026"),
    ]);

    expect(result.reviewRequired).toBe(false);
    expect(result.fields.every((entry) => entry.status === "agreement")).toBe(true);
  });

  it("does not overstate agreement when no critical fields can be compared", () => {
    const result = compareOcrCriticalFields([
      candidate("original", "Thank you for getting in touch."),
      candidate("prepared", "Thank you for getting in touch."),
    ]);

    expect(result).toMatchObject({
      status: "not_compared",
      reviewRequired: false,
      hasConflict: false,
      issues: [],
    });
  });
});
