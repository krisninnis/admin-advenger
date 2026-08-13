import { describe, expect, it } from "vitest";
import {
  assessRefundState,
  extractDates,
  extractGeneralAdmin,
  isAppointmentReminderText,
} from "../generalAdminExtraction";

const timingShape = (text: string) =>
  extractDates(text).map(({ role, meaning, relationship, precision, value, time }) => ({
    role,
    meaning,
    relationship,
    precision,
    value,
    time: time?.value,
  }));

describe("ordinary-message semantic date extraction", () => {
  it.each([
    ["my broadband goes from Â£34 to Â£46 on 1 September", [{ role: "event_date", meaning: "effective_start", precision: "day_month", value: "1 September" }]],
    ["from 1 September your monthly price will be Â£46", [{ role: "event_date", meaning: "effective_start", precision: "day_month", value: "1 September" }]],
    ["please pay Â£500 by 20 August", [{ role: "stated_deadline", meaning: "payment_due", precision: "day_month", value: "20 August" }]],
    ["your balance is Â£500 as of 20 August", [{ role: "context_date", meaning: "statement_as_of", precision: "day_month", value: "20 August" }]],
    ["your new tariff starts on 20 August", [{ role: "event_date", meaning: "effective_start", precision: "day_month", value: "20 August" }]],
    ["your appointment is on 20 August at 2pm", [{ role: "event_date", meaning: "appointment", precision: "day_month", value: "20 August", time: "2pm" }]],
    ["please reply by 20 August", [{ role: "stated_deadline", meaning: "reply_deadline", precision: "day_month", value: "20 August" }]],
    ["this change takes effect from 20 August", [{ role: "event_date", meaning: "effective_start", precision: "day_month", value: "20 August" }]],
    ["statement dated 20 August - payment is due on 5 September", [
      { role: "document_date", meaning: "document_issued", precision: "day_month", value: "20 August" },
      { role: "stated_deadline", meaning: "payment_due", precision: "day_month", value: "5 September" },
    ]],
    ["your payment is due on 5 September", [{ role: "stated_deadline", meaning: "payment_due", precision: "day_month", value: "5 September" }]],
    ["your appointment has moved from 20 August to 27 August", [
      { role: "event_date", meaning: "appointment", relationship: "previous", precision: "day_month", value: "20 August" },
      { role: "event_date", meaning: "appointment", relationship: "replacement", precision: "day_month", value: "27 August" },
    ]],
    ["your price changes on 1 September but you do not need to reply", [{ role: "event_date", meaning: "effective_start", precision: "day_month", value: "1 September" }]],
    ["letter dated 20 August, please reply by 5 September", [
      { role: "document_date", meaning: "document_issued", precision: "day_month", value: "20 August" },
      { role: "stated_deadline", meaning: "reply_deadline", precision: "day_month", value: "5 September" },
    ]],
    ["your contract runs from 1 September to 31 August 2027", [
      { role: "period_boundary", meaning: "period", relationship: "start", precision: "day_month", value: "1 September" },
      { role: "period_boundary", meaning: "period", relationship: "end", precision: "full_date", value: "31 August 2027" },
    ]],
  ])("preserves typed timing for: %s", (text, expected) => {
    expect(timingShape(text)).toEqual(expected.map((item) => ({ relationship: undefined, time: undefined, ...item })));
  });

  it.each([
    ["appointment on 20 August", "appointment", "event_date"],
    ["balance as of 20 August", "statement_as_of", "context_date"],
    ["letter dated 20 August", "document_issued", "document_date"],
    ["your tariff starts on 20 August", "effective_start", "event_date"],
    ["your parcel is due to arrive on 20 August", "other", "event_date"],
    ["your payment is due on 20 August", "payment_due", "stated_deadline"],
  ])("does not manufacture a deadline for: %s", (text, meaning, role) => {
    expect(timingShape(text)).toEqual([
      expect.objectContaining({ meaning, role, precision: "day_month" }),
    ]);
  });

  it("does not promote a standalone time into appointment timing", () => {
    expect(extractDates("Please call at 2pm.")).toEqual([]);
  });
});

describe("general admin governed fact extraction", () => {
  it("keeps a promised-refund period attached to the refund state", () => {
    expect(
      assessRefundState(
        "We will refund £39 to the original payment method within 10 working days.",
      ),
    ).toMatchObject({
      stage: "promised",
      amount: { amount: 39, role: "refund_total" },
      relativePeriod: { role: "refund_window", value: "within 10 working days" },
    });
  });

  it("uses the canonical reference representation for an open complaint", () => {
    expect(
      extractGeneralAdmin(
        "Your account is closed. However, your complaint remains open under CMP-505.",
      ).references,
    ).toEqual([
      expect.objectContaining({ value: "CMP-505", sourceQuote: "CMP-505" }),
    ]);
  });

  it("classifies pay-before-amount wording as an amount demanded", () => {
    expect(
      extractGeneralAdmin(
        "Urgent: pay £499 today using the link in this message or your account will close.",
      ).amounts,
    ).toEqual([
      expect.objectContaining({ amount: 499, role: "amount_demanded" }),
    ]);
  });
});

describe("general admin appointment reminder detection", () => {
  it.each([
    "Appointment reminder: Your dentist appointment is booked for 14 August 2026 at 10:30.",
    "This is a reminder that your clinic appointment is on 18 August 2026.",
    "Your GP appointment is scheduled for 21 August 2026.",
    "Please attend your optician appointment on 25 August 2026.",
    "Appointment on 20 August.",
  ])("recognises a genuine upcoming appointment reminder: %s", (text) => {
    expect(isAppointmentReminderText(text)).toBe(true);
  });

  it("does not treat a missed appointment mentioned in a UC sanction as a reminder", () => {
    expect(
      isAppointmentReminderText(
        "We have decided to reduce your Universal Credit because you did not attend an appointment.",
      ),
    ).toBe(false);
  });

  it("does not treat an optician employer name in an HMRC notice as a reminder", () => {
    expect(
      isAppointmentReminderText(
        "HMRC Tax Code Notice. Employer: Harbour View Opticians Ltd. Your tax code has changed.",
      ),
    ).toBe(false);
  });

  it("leaves cancelled and rebooking messages to the appointment task flow", () => {
    expect(
      isAppointmentReminderText(
        "My dentist cancelled my appointment and asked me to rebook.",
      ),
    ).toBe(false);
  });
});
