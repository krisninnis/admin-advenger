import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import {
  assessPaymentReminder,
  buildPaymentReminderSuggestedAction,
} from "../paymentReminderAssessment";

const makeItem = (rawText: string): AdminItem => ({
  id: "item-payment-reminder",
  title: "journey-2-payment-reminder.pdf",
  sourceType: "bill",
  rawText,
  createdAt: "2026-07-17T10:00:00.000Z",
});

const reminderBody = [
  "Payment reminder",
  "Date: 14 July 2026",
  "Account reference: GW-48291",
  "Our records show an unpaid balance of \u00a384.60.",
  "Payment was due on 10 July 2026.",
  "Please pay the balance or contact us by 24 July 2026.",
  "If you have already paid, send us proof of payment so we can update the account.",
].join("\n");

describe("assessPaymentReminder sender extraction", () => {
  it("keeps the sender from a normal multiline payment reminder", () => {
    expect(assessPaymentReminder(makeItem(`Greenfield Water Services\n${reminderBody}`))).toMatchObject({
      isPaymentReminder: true,
      sender: "Greenfield Water Services",
    });
  });

  it("keeps the sender from flattened PDF text before Payment reminder", () => {
    const flattened =
      "Greenfield Water Services  Payment reminder  Date: 14 July 2026  Account reference: GW-48291  Our records show an unpaid balance of \u00a384.60. Payment was due on 10 July 2026. Please pay the balance or contact us by 24 July 2026.";

    expect(assessPaymentReminder(makeItem(flattened))).toMatchObject({
      isPaymentReminder: true,
      sender: "Greenfield Water Services",
    });
  });

  it("ignores attachment markers and filenames as senders", () => {
    const rawText = `--- Document file 1: journey-2-payment-reminder.pdf ---\nGreenfield Water Services  ${reminderBody}`;

    expect(assessPaymentReminder(makeItem(rawText)).sender).toBe("Greenfield Water Services");
  });

  it("leaves sender undefined when there is no plausible sender", () => {
    expect(assessPaymentReminder(makeItem(reminderBody)).sender).toBeUndefined();
  });
});

describe("payment reminder date integrity", () => {
  it("keeps payment due and pay-or-contact dates separate", () => {
    expect(assessPaymentReminder(makeItem(`Greenfield Water Services\n${reminderBody}`))).toMatchObject({
      paymentDueDate: "10 July 2026",
      responseDeadline: "24 July 2026",
      requestedAction: "The source asks for payment or contact by 24 July 2026.",
    });
  });

  it("does not issue an already-expired future instruction", () => {
    const assessment = assessPaymentReminder(makeItem(`Greenfield Water Services\n${reminderBody}`));
    const action = buildPaymentReminderSuggestedAction(
      assessment,
      new Date("2026-09-05T12:00:00.000Z"),
    );

    expect(action).toContain("payment due date (10 July 2026)");
    expect(action).toContain("pay-or-contact date (24 July 2026)");
    expect(action).toContain("have both passed");
    expect(action).toContain("Verify the current account status");
    expect(action).not.toMatch(/contact (?:the provider )?before 24 July 2026/i);
    expect(action).not.toMatch(/pay (?:the balance )?by 24 July 2026/i);
    expect(action).not.toMatch(/late fee|disconnected|lost rights|penalty|must pay|legally owed/i);
  });

  it("keeps an upcoming source date factual rather than turning it into a command", () => {
    const assessment = assessPaymentReminder(makeItem(`Greenfield Water Services\n${reminderBody}`));
    const action = buildPaymentReminderSuggestedAction(
      assessment,
      new Date("2026-07-20T12:00:00.000Z"),
    );

    expect(action).toContain("the source states a pay-or-contact date of 24 July 2026");
    expect(action).toContain("If action is still needed");
    expect(action).not.toContain("must");
  });
});
