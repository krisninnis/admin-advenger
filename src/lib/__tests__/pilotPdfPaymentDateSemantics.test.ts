import { describe, expect, it } from "vitest";
import { extractDates } from "../generalAdminExtraction";

const semantics = (text: string) =>
  extractDates(text).map(({ value, role, meaning, relationship }) => ({
    value,
    role,
    meaning,
    relationship,
  }));

describe("pilot PDF payment-date semantics", () => {
  it("keeps the original payment due date as payment_due", () => {
    expect(semantics("Payment was due on 10 July 2026.")).toEqual([
      {
        value: "10 July 2026",
        role: "stated_deadline",
        meaning: "payment_due",
        relationship: undefined,
      },
    ]);
  });

  it("does not let an earlier pay alternative capture a later contact-us-by date", () => {
    expect(semantics("Please pay the balance or contact us by 24 July 2026.")).toEqual([
      {
        value: "24 July 2026",
        role: "stated_deadline",
        meaning: "other",
        relationship: undefined,
      },
    ]);
  });

  it.each([
    "Please pay £500 by 20 August",
    "Please pay the balance by 20 August",
  ])("keeps a direct payment deadline as payment_due: %s", (text) => {
    expect(semantics(text)).toEqual([
      {
        value: "20 August",
        role: "stated_deadline",
        meaning: "payment_due",
        relationship: undefined,
      },
    ]);
  });

  it("keeps a direct contact deadline without turning it into payment_due", () => {
    expect(
      semantics("Contact us by 29 July 2026 if any details appear incorrect."),
    ).toEqual([
      {
        value: "29 July 2026",
        role: "stated_deadline",
        meaning: "other",
        relationship: undefined,
      },
    ]);
  });

  it("keeps a reply deadline as reply_deadline", () => {
    expect(semantics("Please reply by 20 August")).toEqual([
      {
        value: "20 August",
        role: "stated_deadline",
        meaning: "reply_deadline",
        relationship: undefined,
      },
    ]);
  });

  it("preserves HMRC-style tax-year period boundaries", () => {
    expect(semantics("Tax year: 6 April 2026 to 5 April 2027")).toEqual([
      {
        value: "6 April 2026",
        role: "period_boundary",
        meaning: "period",
        relationship: "start",
      },
      {
        value: "5 April 2027",
        role: "period_boundary",
        meaning: "period",
        relationship: "end",
      },
    ]);
  });
});
