import { describe, expect, it } from "vitest";
import {
  assessCommunicationSignals,
  assessRefundState,
  extractDates,
  extractGeneralAdmin,
  isAppointmentReminderText,
  selectGroundedCommunicationSignal,
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

describe("ordinary-message communication signal assessment", () => {
  const signals = (text: string) => assessCommunicationSignals(text).signals;

  it("selects urgency only when its exact quote and offsets match the supplied source", () => {
    const text = "Urgent: check your account today.";

    expect(selectGroundedCommunicationSignal(text)).toEqual(
      expect.objectContaining({
        kind: "urgency",
        sourceQuote: "Urgent",
        start: 0,
        end: 6,
      }),
    );
  });

  it("fails closed when a proposed urgency signal is not exactly present at its source offsets", () => {
    expect(
      selectGroundedCommunicationSignal("Routine account update.", {
        signals: [
          {
            kind: "urgency",
            value: "Urgent",
            sourceQuote: "Urgent",
            start: 0,
            end: 6,
            negated: false,
          },
        ],
        negations: [],
      }),
    ).toBeUndefined();
  });

  it("fails closed when present source wording is assigned the wrong communication kind", () => {
    expect(
      selectGroundedCommunicationSignal("Routine account update.", {
        signals: [
          {
            kind: "urgency",
            value: "Routine",
            sourceQuote: "Routine",
            start: 0,
            end: 7,
            negated: false,
          },
        ],
        negations: [],
      }),
    ).toBeUndefined();
  });

  it("finds no communication signal in the exact synthetic HMRC notice wording", () => {
    const notice = `HMRC
HM Revenue & Customs

Tax Code Notice

Page 1 of 2

Tax year: 6 April 2026 to 5 April 2027

This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.

Employer: Harbour View Opticians Ltd

Previous tax code: C1263L
New code: C1254L

How we worked out your tax code:

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2

Your tax code for the tax year 2026 to 2027 is C1254L.
This means you can earn £12,542 before you start paying tax.

If you think this tax code is wrong, contact HMRC.`;

    expect(selectGroundedCommunicationSignal(notice)).toBeUndefined();
  });

  it("keeps importance, urgency, reply and action as distinct source-grounded signals", () => {
    expect(
      signals("Important notice. Urgent: please reply. Action required."),
    ).toEqual([
      {
        kind: "importance",
        value: "Important notice",
        sourceQuote: "Important notice",
        start: 0,
        end: 16,
        negated: false,
      },
      expect.objectContaining({
        kind: "urgency",
        value: "Urgent",
        sourceQuote: "Urgent",
        negated: false,
      }),
      expect.objectContaining({
        kind: "reply_request",
        value: "reply",
        sourceQuote: "reply",
        negated: false,
      }),
      expect.objectContaining({
        kind: "action_request",
        value: "Action required",
        sourceQuote: "Action required",
        negated: false,
      }),
    ]);
  });

  it.each([
    ["Please reply", "reply"],
    ["Please respond", "respond"],
    ["A response is required", "response is required"],
  ])("recognises a positive reply/response request: %s", (text, value) => {
    expect(signals(text)).toContainEqual(
      expect.objectContaining({ kind: "reply_request", value, sourceQuote: value }),
    );
  });

  it.each([
    "Please do not reply",
    "Do not reply",
    "Don't reply",
    "You do not need to reply",
    "You don't need to reply",
    "No reply is needed",
    "No reply is required",
    "No reply needed",
    "No reply required",
    "No-reply",
    "Please do not respond",
    "Do not respond",
    "Don't respond",
    "You do not need to respond",
    "You don't need to respond",
    "No response is needed",
    "No response is required",
    "No response needed",
    "No response required",
  ])("suppresses positive reply semantics for: %s", (text) => {
    const assessment = assessCommunicationSignals(text);

    expect(assessment.signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "reply_request" })]),
    );
    expect(assessment.negations).toContainEqual(
      expect.objectContaining({ target: "reply_request" }),
    );
  });

  it.each([
    "No action is required",
    "No action required",
    "No action is needed",
    "No action needed",
    "No further action",
    "You do not need to do anything",
    "You do not need to take any action",
  ])("suppresses positive action semantics for: %s", (text) => {
    const assessment = assessCommunicationSignals(text);

    expect(assessment.signals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "action_request" })]),
    );
    expect(assessment.negations).toContainEqual(
      expect.objectContaining({ target: "action_request" }),
    );
  });

  it("ends reply negation at a sentence boundary", () => {
    const assessment = assessCommunicationSignals(
      "Do not reply to this email. Please respond through your secure account by 20 August.",
    );

    expect(assessment.signals).toContainEqual(
      expect.objectContaining({ kind: "reply_request", value: "respond" }),
    );
    expect(timingShape("Do not reply to this email. Please respond through your secure account by 20 August.")).toContainEqual(
      expect.objectContaining({ meaning: "reply_deadline", value: "20 August" }),
    );
  });

  it.each([
    "Do not reply; please respond through your account.",
    "Do not reply\nPlease respond through your account.",
    "Do not reply, but please respond through your account.",
    "Do not reply, however please respond through your account.",
  ])("ends reply negation at an approved clause boundary: %s", (text) => {
    expect(signals(text)).toContainEqual(
      expect.objectContaining({ kind: "reply_request", value: "respond" }),
    );
  });

  it("suppresses only reply while preserving importance", () => {
    expect(signals("Important notice. Please do not reply.")).toEqual([
      expect.objectContaining({ kind: "importance", value: "Important notice" }),
    ]);
  });

  it("suppresses only reply while preserving urgency", () => {
    expect(signals("Urgent: check your account; no reply is needed.")).toEqual([
      expect.objectContaining({ kind: "urgency", value: "Urgent" }),
    ]);
  });

  it.each([
    ["Action required: upload the form.", "Action required"],
    ["Please upload the form.", "Please upload"],
    ["Please pay by 20 August.", "Please pay"],
    ["Please confirm the account details.", "Please confirm"],
  ])("recognises a positive non-reply action: %s", (text, value) => {
    expect(signals(text)).toContainEqual(
      expect.objectContaining({ kind: "action_request", value, sourceQuote: value }),
    );
    expect(signals(text)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "reply_request" })]),
    );
  });

  it("preserves an explicit awaited response as a reply request", () => {
    expect(signals("We are awaiting your response.")).toContainEqual(
      expect.objectContaining({
        kind: "reply_request",
        value: "awaiting your response",
        sourceQuote: "awaiting your response",
      }),
    );
  });
});
