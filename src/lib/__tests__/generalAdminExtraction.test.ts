import { describe, expect, it } from "vitest";
import {
  assessRefundState,
  extractGeneralAdmin,
  isAppointmentReminderText,
} from "../generalAdminExtraction";

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
