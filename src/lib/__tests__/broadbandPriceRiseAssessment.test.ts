import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { assessBroadbandPriceRise } from "../broadbandPriceRiseAssessment";

const makeItem = (rawText: string, title = "journey-3-service-notice.docx"): AdminItem => ({
  id: "item-broadband-price-rise",
  title,
  sourceType: "bill",
  rawText,
  createdAt: "2026-07-17T12:00:00.000Z",
});

const noticeBody = [
  "Service price change notice",
  "Date: 15 July 2026",
  "Account reference: NB-73104",
  "Your monthly broadband price will change from \u00a329.00 to \u00a332.50 from 1 August 2026.",
  "Please review your account and contact us by 29 July 2026 if any details appear incorrect.",
].join("\n");

describe("assessBroadbandPriceRise provider extraction", () => {
  it("keeps a provider shown as the standalone document heading", () => {
    expect(
      assessBroadbandPriceRise(makeItem(`Northbridge Broadband\n${noticeBody}`)).providerName,
    ).toBe("Northbridge Broadband");
  });

  it("keeps provider wording already supported by the extractor", () => {
    expect(
      assessBroadbandPriceRise(
        makeItem(`This notice is from Greenfield Telecom.\n${noticeBody}`, "price-rise.txt"),
      ).providerName,
    ).toBe("Greenfield Telecom");
  });

  it("does not mistake the notice heading or filename for a provider", () => {
    expect(assessBroadbandPriceRise(makeItem(noticeBody)).providerName).toBeUndefined();
  });
});

describe("assessBroadbandPriceRise money grounding", () => {
  const prices = (text: string) => {
    const r = assessBroadbandPriceRise(makeItem(text));
    return {
      old: r.oldMonthlyPrice,
      next: r.newMonthlyPrice,
      monthly: r.monthlyIncrease,
      annual: r.annualIncrease,
    };
  };

  it("M1 derives a from-to pair: GBP 34 to GBP 46 (older price, increase, annualised)", () => {
    expect(prices("Your broadband price will change from GBP 34 to GBP 46 per month.")).toEqual({
      old: "£34",
      next: "£46",
      monthly: "£12",
      annual: "£144",
    });
  });

  it("M2 derives old from increase-by to a stated new total: £30 + £3 = £33", () => {
    expect(prices("Your plan will increase by £3.00 to £33.00 each month.")).toEqual({
      old: "£30",
      next: "£33",
      monthly: "£3",
      annual: "£36",
    });
  });

  it("M5 records the previous price as a source fact but never fabricates the new price or increase", () => {
    expect(prices("Your previous broadband price was £34.00. We will update you soon.")).toEqual({
      old: "£34",
      next: undefined,
      monthly: undefined,
      annual: undefined,
    });
  });

  it("M6 records the new price as a source fact but never fabricates the old price or increase", () => {
    expect(prices("Your new broadband price will rise to £46.00 from next month.")).toEqual({
      old: undefined,
      next: "£46",
      monthly: undefined,
      annual: undefined,
    });
  });

  it.each([
    [
      "M3 date is never treated as a price",
      "Your price changes from 1 September. No amounts are stated.",
    ],
    [
      "M4 no amount stated",
      "Your monthly broadband price is going up. Please review your account.",
    ],
    [
      "M7 two unrelated bare amounts are not a price pair",
      "Your account summary shows a balance of £34.00 and a one-off credit of £20.00 this month.",
    ],
    [
      "M8 a monthly increase with no stated new total is not annualised from nothing",
      "Your broadband price will increase by £3.00 from next month.",
    ],
    [
      "M9 separate annual statement is not mistaken for a monthly increase",
      "Your plan costs £34.00 and the annual usage allowance is £120.00.",
    ],
    [
      "M10 a refund amount is not an increase",
      "A refund of £46.00 has been paid into your account.",
    ],
    [
      "M11 a payment-due amount and date are not an increase",
      "Your payment of £46.00 is due on 4 September. Please pay by the due date.",
    ],
  ])("%s must not fabricate any price figure", (_label, text) => {
    expect(prices(text)).toEqual({
      old: undefined,
      next: undefined,
      monthly: undefined,
      annual: undefined,
    });
  });

  it("never counts a bare number that looks like a date as money", () => {
    expect(prices("Our reference is 34 and the effective date is 46.")).toEqual({
      old: undefined,
      next: undefined,
      monthly: undefined,
      annual: undefined,
    });
  });
});
