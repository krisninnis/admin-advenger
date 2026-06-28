import type { OpportunityType } from "../types";

export type TrustedGuidanceCard = {
  id: string;
  caseType: OpportunityType;
  title: string;
  shortSummary: string;
  safeChecklist: string[];
  commonEvidence: string[];
  caution: string;
  usefulSourceLinks: Array<{
    label: string;
    url: string;
  }>;
};

export const trustedGuidanceCards: TrustedGuidanceCard[] = [
  {
    id: "guidance-broadband-price-rise",
    caseType: "bill_or_price_increase",
    title: "Broadband/mobile price-rise checklist",
    shortSummary:
      "Use this to organise the price change, account details, provider wording, and options before you decide what to do.",
    safeChecklist: [
      "Check the old price, new price, and date the increase takes effect.",
      "Check your contract start or renewal date.",
      "Ask the provider to confirm account-specific options before acting.",
      "Treat provider wording as evidence to check, not a final legal decision from AdminAvenger.",
    ],
    commonEvidence: [
      "Provider notice",
      "Old and new monthly price",
      "Effective date",
      "Contract start or renewal date",
      "Any wording about leaving, switching, or early termination charges",
    ],
    caution:
      "AdminAvenger does not decide your legal or financial rights. It helps you prepare questions and evidence.",
    usefulSourceLinks: [
      { label: "Ofcom", url: "https://www.ofcom.org.uk/" },
      { label: "Citizens Advice consumer help", url: "https://www.citizensadvice.org.uk/consumer/" },
      { label: "MoneySavingExpert", url: "https://www.moneysavingexpert.com/" },
    ],
  },
  {
    id: "guidance-refund",
    caseType: "money_back",
    title: "Refund or recovery checklist",
    shortSummary:
      "Use this to track money expected back, reference numbers, dates, and when to chase.",
    safeChecklist: [
      "Keep the refund approval or complaint response.",
      "Record the amount and reference number.",
      "Set a chase date if the money has not arrived by the stated window.",
      "Only mark recovered once you can see the money was received.",
    ],
    commonEvidence: ["Refund approval", "Amount", "Reference number", "Payment method", "Expected payment window"],
    caution:
      "A refund being approved is not the same as money received. Confirm the outcome manually.",
    usefulSourceLinks: [
      { label: "Citizens Advice consumer help", url: "https://www.citizensadvice.org.uk/consumer/" },
      { label: "Citizens Advice template letters", url: "https://www.citizensadvice.org.uk/consumer/template-letters/" },
    ],
  },
  {
    id: "guidance-delivery",
    caseType: "delivery_issue",
    title: "Missing delivery checklist",
    shortSummary:
      "Use this to keep tracking evidence, seller messages, and deadlines together before contacting the sender or courier.",
    safeChecklist: [
      "Keep tracking details and the expected delivery window.",
      "Record what did not arrive and when.",
      "Contact the seller or courier within any stated window.",
      "Do not invent a refund amount unless it appears in the source material.",
    ],
    commonEvidence: ["Tracking number", "Delivery window", "Order reference", "Missing/damaged item wording"],
    caution:
      "AdminAvenger can prepare a missing parcel message, but the user decides whether to send it.",
    usefulSourceLinks: [
      { label: "Citizens Advice consumer help", url: "https://www.citizensadvice.org.uk/consumer/" },
    ],
  },
  {
    id: "guidance-subscription",
    caseType: "subscription_renewal",
    title: "Subscription renewal checklist",
    shortSummary:
      "Use this to decide whether to keep, cancel, or renegotiate before a renewal charge.",
    safeChecklist: [
      "Check the renewal amount and charge date.",
      "Check the cancellation deadline.",
      "Keep cancellation confirmation if you cancel.",
      "Only count a saving once the charge is avoided or reduced.",
    ],
    commonEvidence: ["Renewal notice", "Amount", "Cancellation deadline", "Confirmation email"],
    caution:
      "AdminAvenger does not cancel subscriptions automatically. The user must take and confirm the action.",
    usefulSourceLinks: [
      { label: "Citizens Advice consumer help", url: "https://www.citizensadvice.org.uk/consumer/" },
      { label: "MoneySavingExpert", url: "https://www.moneysavingexpert.com/" },
    ],
  },
  {
    id: "guidance-receipt",
    caseType: "receipt_guardian",
    title: "Receipt and proof checklist",
    shortSummary:
      "Use this to keep purchase evidence ready in case a return, warranty, or complaint is needed later.",
    safeChecklist: [
      "Keep retailer, date, amount, item, and order reference.",
      "Attach photos or notes if the item later becomes faulty.",
      "Do not count receipt value as money saved.",
    ],
    commonEvidence: ["Receipt", "Order confirmation", "Amount paid", "Retailer", "Order reference"],
    caution:
      "A receipt is evidence. It is not a saving or recovery by itself.",
    usefulSourceLinks: [
      { label: "Citizens Advice consumer help", url: "https://www.citizensadvice.org.uk/consumer/" },
    ],
  },
];
