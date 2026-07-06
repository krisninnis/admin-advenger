import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CURRENT_TERMS_VERSION,
  TERMS_ACCEPTANCE_STORAGE_KEY,
  canAcceptTerms,
  emptyTermsCheckboxState,
  getAcceptedTermsVersion,
  hasAcceptedCurrentTerms,
  recordTermsAcceptance,
  resetTermsAcceptance,
  type TermsCheckboxState,
} from "../termsAcceptance";
import {
  declineMessage,
  gateSections,
  legalDocumentOrder,
  legalDocuments,
  requiredCheckboxCopy,
} from "../../data/legalNotices";

class FakeLocalStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const originalWindow = globalThis.window;
let localStorage: FakeLocalStorage;

beforeEach(() => {
  localStorage = new FakeLocalStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
  });
});

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

const fullyChecked: TermsCheckboxState = {
  understandsCanBeWrong: true,
  understandsNoAutoAction: true,
  understandsUserResponsible: true,
  agreesToTerms: true,
};

describe("Terms & Safety acceptance gate", () => {
  describe("app is blocked until terms are accepted", () => {
    it("is not accepted before anything has been stored (first visit)", () => {
      expect(hasAcceptedCurrentTerms()).toBe(false);
      expect(getAcceptedTermsVersion()).toBeUndefined();
    });

    it("becomes accepted only after recordTermsAcceptance() is called", () => {
      expect(hasAcceptedCurrentTerms()).toBe(false);

      recordTermsAcceptance();

      expect(hasAcceptedCurrentTerms()).toBe(true);
    });

    it("fails closed (treated as not accepted) if the stored value is garbage", () => {
      localStorage.setItem(TERMS_ACCEPTANCE_STORAGE_KEY, "not-a-real-version");

      expect(hasAcceptedCurrentTerms()).toBe(false);
    });
  });

  describe("Accept button disabled until all checkboxes are ticked", () => {
    it("is not accepted with zero checkboxes ticked", () => {
      expect(canAcceptTerms(emptyTermsCheckboxState)).toBe(false);
    });

    it("is not accepted with only some checkboxes ticked", () => {
      expect(
        canAcceptTerms({ ...emptyTermsCheckboxState, understandsCanBeWrong: true }),
      ).toBe(false);
      expect(
        canAcceptTerms({
          ...emptyTermsCheckboxState,
          understandsCanBeWrong: true,
          understandsNoAutoAction: true,
          understandsUserResponsible: true,
        }),
      ).toBe(false);
    });

    it("is only accepted once every required checkbox is true", () => {
      expect(canAcceptTerms(fullyChecked)).toBe(true);
    });

    it("no checkbox is auto-ticked by default", () => {
      expect(emptyTermsCheckboxState.understandsCanBeWrong).toBe(false);
      expect(emptyTermsCheckboxState.understandsNoAutoAction).toBe(false);
      expect(emptyTermsCheckboxState.understandsUserResponsible).toBe(false);
      expect(emptyTermsCheckboxState.agreesToTerms).toBe(false);
    });
  });

  describe("accepting stores versioned acceptance locally", () => {
    it("stores the current terms version under the documented key", () => {
      recordTermsAcceptance();

      expect(localStorage.getItem(TERMS_ACCEPTANCE_STORAGE_KEY)).toBe(CURRENT_TERMS_VERSION);
      expect(getAcceptedTermsVersion()).toBe(CURRENT_TERMS_VERSION);
    });

    it("does not store anything beyond the version string (no personal data)", () => {
      recordTermsAcceptance();

      const storedValue = localStorage.getItem(TERMS_ACCEPTANCE_STORAGE_KEY);

      expect(storedValue).toBe(CURRENT_TERMS_VERSION);
      expect(storedValue).not.toContain("@");
      expect(() => JSON.parse(storedValue ?? "")).toThrow();
    });
  });

  describe("changing terms version shows the gate again", () => {
    it("stops counting as accepted once an older stored version no longer matches the current version", () => {
      localStorage.setItem(TERMS_ACCEPTANCE_STORAGE_KEY, "2025-01-terms-v0");

      expect(hasAcceptedCurrentTerms()).toBe(false);
    });

    it("accepting again after a version bump stores the new current version", () => {
      localStorage.setItem(TERMS_ACCEPTANCE_STORAGE_KEY, "2025-01-terms-v0");
      expect(hasAcceptedCurrentTerms()).toBe(false);

      recordTermsAcceptance();

      expect(hasAcceptedCurrentTerms()).toBe(true);
      expect(getAcceptedTermsVersion()).toBe(CURRENT_TERMS_VERSION);
    });
  });

  describe("declining keeps app blocked", () => {
    it("declining never calls recordTermsAcceptance, so acceptance state is unchanged", () => {
      expect(hasAcceptedCurrentTerms()).toBe(false);
      // Declining is a UI-only state in TermsSafetyGate - it must never touch
      // storage. Simulate "the user declined and did nothing else" by simply
      // not calling recordTermsAcceptance and checking storage is untouched.
      expect(localStorage.getItem(TERMS_ACCEPTANCE_STORAGE_KEY)).toBeNull();
      expect(hasAcceptedCurrentTerms()).toBe(false);
    });

    it("has a plain-English decline message that does not silently let the user in", () => {
      expect(declineMessage).toBe(
        "You need to accept the Terms & Safety Notice to use AdminAvenger.",
      );
    });
  });

  describe("Settings can show the terms again / reset acceptance for testing", () => {
    it("resetTermsAcceptance() clears a previous acceptance", () => {
      recordTermsAcceptance();
      expect(hasAcceptedCurrentTerms()).toBe(true);

      resetTermsAcceptance();

      expect(hasAcceptedCurrentTerms()).toBe(false);
      expect(getAcceptedTermsVersion()).toBeUndefined();
    });
  });

  describe("legal links / required content are present", () => {
    it("exposes all four legal documents with non-empty titles and content", () => {
      expect(legalDocumentOrder).toEqual(["terms", "privacy", "safety", "storage"]);

      for (const id of legalDocumentOrder) {
        const document = legalDocuments[id];

        expect(document.title.length).toBeGreaterThan(0);
        expect(document.sections.length).toBeGreaterThan(0);
        for (const section of document.sections) {
          expect(section.body.length).toBeGreaterThan(0);
        }
      }
    });

    it("has exactly the four required checkboxes, with the exact required wording", () => {
      expect(requiredCheckboxCopy.understandsCanBeWrong).toBe(
        "I understand AdminAvenger can be wrong and does not provide legal, financial, benefits, medical, debt, or regulated advice.",
      );
      expect(requiredCheckboxCopy.understandsNoAutoAction).toBe(
        "I understand AdminAvenger does not send messages, submit claims, or take action for me.",
      );
      expect(requiredCheckboxCopy.understandsUserResponsible).toBe(
        "I understand I am responsible for checking information and deciding what to do.",
      );
      expect(requiredCheckboxCopy.agreesToTerms).toBe(
        "I agree to the Terms, Privacy Notice, and Safety Notice.",
      );
    });

    it("gate covers all seven required sections in order", () => {
      const headings = gateSections.map((section) => section.heading);

      expect(headings).toEqual([
        "1. What AdminAvenger does",
        "2. What AdminAvenger does not do",
        "3. User responsibility",
        "4. Privacy / local-first",
        "5. Money safety",
        "6. Drafts and templates",
        "7. Emergency / serious situations",
      ]);
    });
  });

  describe("no automatic action/email/claim wording appears anywhere in the gate content", () => {
    // Mirrors the adminavenger safety-wording rule: never imply the app will
    // act, send, submit, or contact anyone on the user's behalf, and never
    // guarantee an outcome.
    const forbiddenPatterns = [
      /\bwe will send\b/i,
      /\bwe will submit\b/i,
      /\bwe will contact\b/i,
      /\bi will send this for you\b/i,
      /\bguaranteed\b/i,
      /\byou will win\b/i,
      /\byou definitely qualify\b/i,
      /\byou do not owe this\b/i,
    ];

    const allGateText = [
      ...gateSections.flatMap((section) => [section.heading, ...section.items]),
      ...Object.values(requiredCheckboxCopy),
      declineMessage,
    ].join(" \n ");

    const allDocumentText = legalDocumentOrder
      .flatMap((id) =>
        legalDocuments[id].sections.flatMap((section) => [section.heading, ...section.body]),
      )
      .join(" \n ");

    it("gate copy never uses forbidden auto-action/guarantee wording", () => {
      for (const pattern of forbiddenPatterns) {
        expect(allGateText).not.toMatch(pattern);
      }
    });

    it("full legal document copy never uses forbidden auto-action/guarantee wording", () => {
      for (const pattern of forbiddenPatterns) {
        expect(allDocumentText).not.toMatch(pattern);
      }
    });

    it("explicitly states the app does not send messages, submit claims, or contact organisations", () => {
      expect(allGateText.toLowerCase()).toContain("does not send emails or messages");
      expect(allGateText.toLowerCase()).toContain(
        "does not submit appeals, claims, complaints, or forms",
      );
      expect(allGateText.toLowerCase()).toContain(
        "does not contact dwp, councils, parking firms, banks, companies, or courts",
      );
    });
  });
});
