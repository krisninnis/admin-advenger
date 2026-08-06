import { describe, expect, it } from "vitest";
import {
  TRUSTED_WALES_SIGNPOSTING_DIRECTORY,
  createTrustedSignpostingState,
  trustedSignpostingReducer,
  trustedSignpostingViewOn,
} from "../trustedWalesSignposting/trustedWalesSignposting";

const directory = TRUSTED_WALES_SIGNPOSTING_DIRECTORY;
const records = directory.records;

const phoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("44") ? `0${digits.slice(2)}` : digits;
};

describe("the governed Wales directory", () => {
  it("contains exactly three records in the governed display order", () => {
    expect(records).toHaveLength(3);
    expect(records.map((record) => record.role)).toEqual([
      "find_local_authority",
      "independent_information_and_advice",
      "find_local_carers_support",
    ]);
    expect(records[0].organisationType).toBe("official");
  });

  it("uses stable unique IDs and labels both non-official records as charities", () => {
    const ids = records.map((record) => record.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "welsh-government-local-authority-finder",
      "carers-uk-helpline",
      "carers-trust-local-service-finder",
    ]);
    expect(records.slice(1).every((record) => record.organisationType === "charity")).toBe(true);
  });

  it("uses only HTTPS URLs without query strings or shorteners", () => {
    for (const record of records) {
      for (const url of [
        record.websiteUrl,
        record.sourceUrl,
        ...record.supportingSources.map((source) => source.url),
      ]) {
        const parsed = new URL(url);
        expect(parsed.protocol).toBe("https:");
        expect(parsed.search).toBe("");
        expect(parsed.hostname).not.toMatch(/bit\.ly|tinyurl\.com|t\.co/i);
      }
    }
  });

  it("keeps phone display and tel href separate but numerically equivalent", () => {
    const phones = records.flatMap((record) => (record.phone ? [record.phone] : []));

    expect(phones).toHaveLength(2);
    for (const phone of phones) {
      expect(phone.href).toMatch(/^tel:\+44\d+$/);
      expect(phoneDigits(phone.display)).toBe(phoneDigits(phone.href));
      expect(phone.purpose.length).toBeGreaterThan(0);
    }
  });

  it("records provenance, review dates and time-sensitive fields", () => {
    for (const record of records) {
      expect(record.sourceTitle.length).toBeGreaterThan(0);
      expect(record.sourceUrl.length).toBeGreaterThan(0);
      expect(record.verifiedOn).toBe("2026-08-06");
      expect(record.reviewDueOn > record.verifiedOn).toBe(true);
      expect(record.timeSensitiveFields.length).toBeGreaterThan(0);
      expect(record.limitations.length).toBeGreaterThan(0);
    }

    expect(records.map((record) => record.sourceTitle)).toEqual([
      "Find your local authority | GOV.WALES",
      "We help | Carers Wales",
      "Help & Info - Find Local Carer Services | Carers Trust",
    ]);
    expect(records[2].supportingSources).toContainEqual({
      title: "Get in Contact | Carers Trust",
      url: "https://carers.org/home/contact-us-1",
    });
  });

  it("keeps the Carers UK Helpline distinct from the Carers Wales office", () => {
    const helpline = records.find((record) => record.id === "carers-uk-helpline");

    expect(helpline?.serviceName).toBe("Carers UK Helpline");
    expect(helpline?.phone?.display).toBe("0808 808 7777");
    expect(helpline?.phone?.purpose).toMatch(/question about caring|talk to someone/i);
    expect(JSON.stringify(helpline)).not.toContain("029 2081 1370");
  });

  it("does not describe central Carers Trust as an individual advice service", () => {
    const finder = records.find(
      (record) => record.id === "carers-trust-local-service-finder",
    );

    expect(finder?.givesIndividualAdvice).toBe(false);
    expect(finder?.phone?.purpose).toMatch(/find.*Network Partner/i);
    expect(finder?.limitations.join(" ")).toMatch(/cannot provide an individual/i);
    expect(finder?.limitations.join(" ")).toMatch(/not every part of the UK/i);
  });

  it("contains no Carer's Allowance Unit or DWP contact number", () => {
    const text = JSON.stringify(directory);

    expect(text).not.toMatch(/Carer's Allowance Unit|\bDWP\b/i);
    expect(text).not.toContain("0800 731 0297");
  });

  it("records the human project owner's public-release approval", () => {
    expect(directory.approvalStatus).toBe("Approved for public release");
    expect(directory.approvedOn).toBe("2026-08-06");
    expect(directory.approvedBy).toBe("Human project owner");
  });

  it("is deeply immutable", () => {
    expect(Object.isFrozen(directory)).toBe(true);
    expect(Object.isFrozen(records)).toBe(true);
    for (const record of records) {
      expect(Object.isFrozen(record)).toBe(true);
      expect(Object.isFrozen(record.limitations)).toBe(true);
      expect(Object.isFrozen(record.timeSensitiveFields)).toBe(true);
      expect(Object.isFrozen(record.supportingSources)).toBe(true);
      if (record.phone) expect(Object.isFrozen(record.phone)).toBe(true);
    }
  });

  it("creates the same view for the same governed records and date", () => {
    expect(trustedSignpostingViewOn("2026-08-06")).toEqual(
      trustedSignpostingViewOn("2026-08-06"),
    );
  });
});

describe("deterministic stale-data handling", () => {
  it("keeps reviewed records current through their review date", () => {
    const view = trustedSignpostingViewOn("2026-11-06");

    expect(view.records.every((record) => record.freshness === "current")).toBe(true);
    expect(view.records[1].hoursToDisplay).toBe("Monday to Friday, 9am to 6pm");
  });

  it("marks records for rechecking after reviewDueOn and suppresses hours", () => {
    const view = trustedSignpostingViewOn("2026-11-07");

    expect(view.records.every((record) => record.freshness === "needs_recheck")).toBe(true);
    expect(view.records.every((record) => record.hoursToDisplay === undefined)).toBe(true);
    expect(view.needsRecheck).toBe(true);
  });
});

describe("the closed/open state model", () => {
  it("opens and closes without representing any prohibited outcome", () => {
    let state = createTrustedSignpostingState();
    expect(state.visibility).toBe("closed");

    state = trustedSignpostingReducer(state, { type: "open" });
    expect(state.visibility).toBe("open");

    state = trustedSignpostingReducer(state, { type: "close" });
    expect(state).toMatchObject({
      visibility: "closed",
      caseCreated: false,
      savedAutomatically: false,
      referralMade: false,
      personalInformationShared: false,
      specialistRouteOpened: false,
      estateRouteOpened: false,
    });
  });
});
