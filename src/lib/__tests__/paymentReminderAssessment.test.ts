import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { assessPaymentReminder } from "../paymentReminderAssessment";

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
