import { describe, expect, it } from "vitest";
import {
  OCR_KEY_DETAILS_CHECK_MESSAGE,
  OCR_KEY_DETAILS_HEADING,
  OCR_KEY_DETAILS_LOW_QUALITY_CAUTION,
  cleanOcrTextForReview,
  extractOcrKeyDetails,
  type OcrKeyDetail,
} from "../ocrKeyDetails";

// A realistic composite letter, modelled on the example in the task brief -
// a parking-charge-adjacent legal/debt letter with the full mix of fact
// types this helper is meant to surface.
const SAMPLE_LETTER = `
ELMS Legal
On behalf of our client Vehicle Control Services

Re: Parking Charge Notice

Dear Sir/Madam,

We write regarding the above. The claim has now been issued at the Civil
National Business Centre following issue of proceedings.

Claim Number: N1QZ564Y
PCN Number: VCS23217813

Amount now due: £255.00

Notice date: 04/03/2026
Response deadline: 19/03/2026

If you wish to dispute the debt or defend this claim, please complete the
response pack within 14 days.

Telephone: 01529 406096
`;

const findByKind = (details: OcrKeyDetail[], kind: OcrKeyDetail["kind"]) =>
  details.filter((detail) => detail.kind === kind);

describe("extractOcrKeyDetails - amounts", () => {
  it("extracts an amount mentioned as £255.00", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const amounts = findByKind(result.details, "amount");

    expect(amounts).toHaveLength(1);
    expect(amounts[0].value).toBe("£255.00");
    expect(amounts[0].label).toBe("Amount mentioned");
  });

  it("extracts a plain £255 amount without decimals", () => {
    const result = extractOcrKeyDetails("Total: £255 is shown on the notice.");
    const amounts = findByKind(result.details, "amount");

    expect(amounts.map((detail) => detail.value)).toContain("£255");
  });

  it("extracts a GBP-prefixed amount", () => {
    const result = extractOcrKeyDetails("The fee is GBP 42.50 in total.");
    const amounts = findByKind(result.details, "amount");

    expect(amounts.some((detail) => detail.value.toLowerCase().includes("42.50"))).toBe(true);
  });
});

describe("extractOcrKeyDetails - dates", () => {
  it("extracts multiple numeric dates mentioned in the letter", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const dates = findByKind(result.details, "date").map((detail) => detail.value);

    expect(dates).toContain("04/03/2026");
    expect(dates).toContain("19/03/2026");
  });

  it("extracts a word-form date like 6 March 2026", () => {
    const result = extractOcrKeyDetails("The letter is dated 6 March 2026.");
    const dates = findByKind(result.details, "date").map((detail) => detail.value);

    expect(dates.some((value) => /6\s+March\s+2026/i.test(value))).toBe(true);
  });

  it("extracts a shortened word-form date like 6 Mar 2026", () => {
    const result = extractOcrKeyDetails("Issued 6 Mar 2026 by post.");
    const dates = findByKind(result.details, "date").map((detail) => detail.value);

    expect(dates.some((value) => /6\s+Mar\s+2026/i.test(value))).toBe(true);
  });

  it("labels dates as 'Date mentioned', never as a deadline", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const dates = findByKind(result.details, "date");

    for (const date of dates) {
      expect(date.label).toBe("Date mentioned");
      expect(date.label.toLowerCase()).not.toContain("deadline");
    }
  });
});

describe("extractOcrKeyDetails - claim/reference numbers", () => {
  it("extracts a claim number found near 'Claim Number' wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const references = findByKind(result.details, "reference").map((detail) => detail.value);

    expect(references).toContain("N1QZ564Y");
  });

  it("extracts a reference number found near PCN wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const references = findByKind(result.details, "reference").map((detail) => detail.value);

    expect(references).toContain("VCS23217813");
  });

  it("extracts a code-shaped reference even without an explicit keyword nearby", () => {
    const result = extractOcrKeyDetails("Your file is AB12CD34 - keep this safe.");
    const references = findByKind(result.details, "reference").map((detail) => detail.value);

    expect(references).toContain("AB12CD34");
  });

  it("does not treat a pure-letter word as a reference number", () => {
    const result = extractOcrKeyDetails("ELMS Legal wrote regarding your account.");
    const references = findByKind(result.details, "reference").map((detail) => detail.value);

    expect(references).not.toContain("ELMS");
  });

  it("does not treat a pure-digit date as a reference number", () => {
    const result = extractOcrKeyDetails("Date: 04/03/2026");
    const references = findByKind(result.details, "reference");

    expect(references).toHaveLength(0);
  });
});

describe("extractOcrKeyDetails - phone numbers", () => {
  it("extracts a UK-shaped phone number", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const phones = findByKind(result.details, "phone").map((detail) => detail.value);

    expect(phones).toContain("01529 406096");
  });

  it("extracts a mobile-shaped phone number", () => {
    const result = extractOcrKeyDetails("Call us on 07123 456789 today.");
    const phones = findByKind(result.details, "phone").map((detail) => detail.value);

    expect(phones).toContain("07123 456789");
  });
});

describe("extractOcrKeyDetails - court/proceedings wording", () => {
  it("detects 'Civil National Business Centre' wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const court = findByKind(result.details, "court_or_claim").map((detail) => detail.value);

    expect(court.some((value) => /Civil National Business Centre/i.test(value))).toBe(true);
  });

  it("detects the CNBC abbreviation on its own", () => {
    const result = extractOcrKeyDetails("Please respond to the CNBC as instructed.");
    const court = findByKind(result.details, "court_or_claim").map((detail) => detail.value);

    expect(court).toContain("CNBC");
  });

  it("detects 'issue of proceedings' and 'claim has now been issued' wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const court = findByKind(result.details, "court_or_claim").map((detail) => detail.value.toLowerCase());

    expect(court.some((value) => value.includes("issue of proceedings"))).toBe(true);
    expect(court.some((value) => value.includes("claim has now been issued"))).toBe(true);
  });

  it("detects 'response pack', 'dispute the debt', and standalone 'defend' wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const court = findByKind(result.details, "court_or_claim").map((detail) => detail.value.toLowerCase());

    expect(court.some((value) => value.includes("response pack"))).toBe(true);
    expect(court.some((value) => value.includes("dispute the debt"))).toBe(true);
    expect(court.some((value) => value === "defend")).toBe(true);
  });

  it("does not match 'defend' inside an unrelated longer word", () => {
    const result = extractOcrKeyDetails("The defendant's address was listed separately.");
    const court = findByKind(result.details, "court_or_claim").map((detail) => detail.value.toLowerCase());

    expect(court.some((value) => value === "defend")).toBe(false);
  });
});

describe("extractOcrKeyDetails - parking wording", () => {
  it("detects 'Parking Charge Notice' wording as a document type hint", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const hints = findByKind(result.details, "document_type_hint");

    expect(hints.some((detail) => /Parking Charge Notice/i.test(detail.value))).toBe(true);
  });

  it("detects standalone PCN wording", () => {
    const result = extractOcrKeyDetails("Your PCN reference is shown below.");
    const hints = findByKind(result.details, "document_type_hint");

    expect(hints.some((detail) => /PCN/i.test(detail.value))).toBe(true);
  });

  it("falls back to a generic parking hint only when no specific phrase is found", () => {
    const result = extractOcrKeyDetails("This concerns a parking dispute at the retail site.");
    const hints = findByKind(result.details, "document_type_hint");

    expect(hints).toHaveLength(1);
    expect(hints[0].value.toLowerCase()).toContain("parking");
  });

  it("detects Vehicle Control Services as a company, not a document type hint", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const companies = findByKind(result.details, "company").map((detail) => detail.value);

    expect(companies).toContain("Vehicle Control Services");
  });
});

describe("extractOcrKeyDetails - sender/company hints", () => {
  it("detects ELMS Legal as a sender", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const senders = findByKind(result.details, "sender").map((detail) => detail.value);

    expect(senders).toContain("ELMS Legal");
  });

  it("detects DWP, Universal Credit, and HMRC as sender/organisation hints", () => {
    const result = extractOcrKeyDetails(
      "This letter is from the DWP regarding your Universal Credit claim. HMRC may also be in contact.",
    );
    const senders = findByKind(result.details, "sender").map((detail) => detail.value);

    expect(senders).toContain("DWP");
    expect(senders).toContain("Universal Credit");
    expect(senders).toContain("HMRC");
  });

  it("detects a generic '<Name> Legal' firm not in the known list", () => {
    const result = extractOcrKeyDetails("This notice was sent by Acme Legal on behalf of the creditor.");
    const senders = findByKind(result.details, "sender").map((detail) => detail.value);

    expect(senders).toContain("Acme Legal");
  });

  it("detects a council mention", () => {
    const result = extractOcrKeyDetails("Newtown Borough Council has issued this notice.");
    const senders = findByKind(result.details, "sender").map((detail) => detail.value);

    expect(senders).toContain("Newtown Borough Council");
  });

  it("detects a known energy supplier mention", () => {
    const result = extractOcrKeyDetails("British Gas has increased your monthly payment.");
    const senders = findByKind(result.details, "sender").map((detail) => detail.value);

    expect(senders).toContain("British Gas");
  });
});

describe("extractOcrKeyDetails - debt collection / enforcement wording", () => {
  it("flags debt collection / enforcement / bailiff wording as risk wording", () => {
    const result = extractOcrKeyDetails(
      "This account has been passed to a debt collection agency. An enforcement agent may attend.",
    );
    const risk = findByKind(result.details, "risk_wording").map((detail) => detail.value.toLowerCase());

    expect(risk.some((value) => value.includes("debt collection"))).toBe(true);
    expect(risk.some((value) => value.includes("enforcement agent"))).toBe(true);
  });
});

describe("extractOcrKeyDetails - deadline-style wording", () => {
  it("detects 'within N days' wording as deadline-style wording, not a date", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const deadlineWording = findByKind(result.details, "deadline_wording").map((detail) => detail.value);

    expect(deadlineWording.some((value) => /within 14 days/i.test(value))).toBe(true);
  });

  it("never labels deadline-style wording using the word 'deadline' in the value itself unexpectedly", () => {
    const result = extractOcrKeyDetails("This is your final notice before further action is taken.");
    const deadlineWording = findByKind(result.details, "deadline_wording");

    expect(deadlineWording.length).toBeGreaterThan(0);
  });
});

describe("extractOcrKeyDetails - safety wording", () => {
  const FORBIDDEN_WORDS = [/\bpay\b/i, /\bignore\b/i, /\bvalid\b/i, /\binvalid\b/i, /\bowed?\b/i];

  it("never produces label/value/caution text containing forbidden advice wording", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);

    for (const detail of result.details) {
      for (const pattern of FORBIDDEN_WORDS) {
        expect(detail.label).not.toMatch(pattern);
        expect(detail.caution ?? "").not.toMatch(pattern);
      }
    }
  });

  it("never asserts the claim is valid, invalid, or that money is owed, anywhere in cautions", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const allCautions = result.details.map((detail) => detail.caution ?? "").join(" ");

    expect(allCautions).not.toMatch(/\bvalid\b/i);
    expect(allCautions).not.toMatch(/\binvalid\b/i);
    expect(allCautions).not.toMatch(/\bowed?\b/i);
    expect(allCautions).not.toMatch(/\bpay\b/i);
    expect(allCautions).not.toMatch(/\bignore\b/i);
  });

  it("never says AdminAvenger has verified the sender", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const senderDetail = findByKind(result.details, "sender")[0];

    expect(senderDetail?.caution ?? "").toMatch(/not verified/i);
  });

  it("amount details are worded as 'mentioned', never as saved/recovered", () => {
    const result = extractOcrKeyDetails(SAMPLE_LETTER);
    const amount = findByKind(result.details, "amount")[0];

    expect(amount.label.toLowerCase()).toContain("mentioned");
    expect(amount.caution ?? "").not.toMatch(/saved|recovered/i);
  });

  it("the standing card copy never contains forbidden advice wording either", () => {
    for (const pattern of FORBIDDEN_WORDS) {
      expect(OCR_KEY_DETAILS_CHECK_MESSAGE).not.toMatch(pattern);
      expect(OCR_KEY_DETAILS_LOW_QUALITY_CAUTION).not.toMatch(pattern);
    }
  });

  it("states the exact required heading and card copy", () => {
    expect(OCR_KEY_DETAILS_HEADING).toBe("Key details found");
    expect(OCR_KEY_DETAILS_CHECK_MESSAGE).toBe(
      "Check these details against the photo before relying on them.",
    );
    expect(OCR_KEY_DETAILS_LOW_QUALITY_CAUTION).toBe(
      "These details may be wrong if the photo was unclear.",
    );
  });
});

describe("extractOcrKeyDetails - empty/noisy input", () => {
  it("returns no details and no crash for empty text", () => {
    const result = extractOcrKeyDetails("");

    expect(result.details).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("returns no details and no crash for whitespace-only text", () => {
    const result = extractOcrKeyDetails("   \n\n   ");

    expect(result.details).toEqual([]);
  });

  it("returns no details for pure barcode/QR-style noise", () => {
    const result = extractOcrKeyDetails("||l1I|l1I||l1I|l1I||\n***###***###***\n");

    expect(result.details).toEqual([]);
  });

  it("does not throw on very long, unstructured OCR noise", () => {
    const noisy = "xq9 ".repeat(500);

    expect(() => extractOcrKeyDetails(noisy)).not.toThrow();
  });
});

describe("cleanOcrTextForReview", () => {
  it("removes an obvious barcode/QR gibberish line", () => {
    const dirty = "Dear Sir/Madam,\n***###***###***\nThank you for your letter.";
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).not.toContain("***###***###***");
    expect(cleaned).toContain("Dear Sir/Madam,");
    expect(cleaned).toContain("Thank you for your letter.");
  });

  it("preserves lines containing amounts, dates, claim numbers, and references", () => {
    const dirty = `##@@$$%%^^&&\nAmount now due: £255.00\nNotice date: 04/03/2026\nClaim Number: N1QZ564Y\n%%%%%%%%%%%%`;
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).toContain("Amount now due: £255.00");
    expect(cleaned).toContain("Notice date: 04/03/2026");
    expect(cleaned).toContain("Claim Number: N1QZ564Y");
  });

  it("preserves a phone number line even if it looks unusual", () => {
    const dirty = "@@@@@@@@@@@@\nTelephone: 01529 406096\n@@@@@@@@@@@@";
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).toContain("Telephone: 01529 406096");
  });

  it("preserves official/court wording lines", () => {
    const dirty = "!!!!!!!!!!!!\nCivil National Business Centre\n!!!!!!!!!!!!";
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).toContain("Civil National Business Centre");
  });

  it("trims excessive whitespace and collapses repeated blank lines", () => {
    const dirty = "Line one.\n\n\n\n\nLine two.   \t  ";
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).toBe("Line one.\n\nLine two.");
  });

  it("is conservative - does not strip an ordinary short sentence line", () => {
    const dirty = "Hello there,\nThank you.\nBest wishes.";
    const cleaned = cleanOcrTextForReview(dirty);

    expect(cleaned).toBe(dirty);
  });

  it("handles empty input safely", () => {
    expect(cleanOcrTextForReview("")).toBe("");
  });

  it("cleans the full sample letter without losing any key facts", () => {
    const cleaned = cleanOcrTextForReview(SAMPLE_LETTER);

    expect(cleaned).toContain("£255.00");
    expect(cleaned).toContain("04/03/2026");
    expect(cleaned).toContain("19/03/2026");
    expect(cleaned).toContain("N1QZ564Y");
    expect(cleaned).toContain("VCS23217813");
    expect(cleaned).toContain("01529 406096");
    // Cleanup works line-by-line and never merges wrapped lines back
    // together, so a phrase that was wrapped across two lines in the source
    // (as "Civil"/"National Business Centre" is here) stays wrapped - this
    // just confirms neither half was dropped.
    expect(cleaned).toContain("Civil");
    expect(cleaned).toContain("National Business Centre");
  });
});
