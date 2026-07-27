import { describe, expect, it } from "vitest";
import { isAppointmentReminderText } from "../generalAdminExtraction";

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