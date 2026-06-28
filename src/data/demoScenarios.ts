import type { FindingCategory, SourceType } from "../types";

export type DemoScenario = {
  id: string;
  title: string;
  sourceType: SourceType;
  rawText: string;
  description: string;
  expectedCategories: FindingCategory[];
};

export const demoScenarios: DemoScenario[] = [
  {
    id: "broadband-mobile-price-rise",
    title: "Broadband/mobile price-rise challenge",
    sourceType: "bill",
    description: "A provider price-rise notice with a clear money-back or saving opportunity.",
    expectedCategories: ["bill_increase"],
    rawText:
      "Provider notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 August. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.",
  },
  {
    id: "forgotten-subscription",
    title: "Forgotten subscription cancellation",
    sourceType: "receipt",
    description: "A recurring membership trial that is about to renew monthly.",
    expectedCategories: ["subscription", "deadline"],
    rawText:
      "Your FitPlus membership trial renews on 3 July and will then become a monthly subscription at GBP 19.99. To avoid the monthly charge, cancel before the renewal date in your account settings.",
  },
  {
    id: "missing-delivery-return",
    title: "Missing delivery / faulty goods / return problem",
    sourceType: "email",
    description: "A seller or courier message where the item was not received and needs chasing.",
    expectedCategories: ["refund", "complaint", "important_reply"],
    rawText:
      "Action required: Courier update for order reference ORD-73918. The seller says the parcel was delivered, but I have not received the item. Customer support gave no response after two messages. Please reply with proof of delivery or arrange a replacement or refund.",
  },
  {
    id: "train-delay-refund",
    title: "Train delay refund",
    sourceType: "email",
    description: "A delayed journey that should create a refund or compensation case.",
    expectedCategories: ["refund"],
    rawText:
      "Hello, your LNER 18:42 train from Leeds to London Kings Cross on 12 June 2026 was delayed by 74 minutes due to a signalling failure. You may be able to submit a Delay Repay claim. Ticket reference LNER-88421. Please check the current LNER policy and submit valid ticket proof within the operator claim window.",
  },
  {
    id: "faulty-laptop-warranty",
    title: "Faulty laptop warranty claim",
    sourceType: "pdf",
    description: "A faulty device that should create a warranty or repair case.",
    expectedCategories: ["warranty"],
    rawText:
      "Your AeroBook 14 laptop is covered by a 24 month warranty until 18 November 2026. The keyboard is faulty and the screen flickers. Please provide proof of purchase to request a repair or replacement under guarantee.",
  },
  {
    id: "recruiter-follow-up",
    title: "Recruiter job application follow-up",
    sourceType: "job_message",
    description: "A recruiter message that should create a job application follow-up.",
    expectedCategories: ["job_application", "important_reply"],
    rawText:
      "Hi, thanks for your CV and application for the Product Operations role. The hiring manager expects to schedule interviews next week. Please reply if you are still interested and confirm your availability.",
  },
  {
    id: "life-admin-chaos-bundle",
    title: "Full life-admin chaos bundle",
    sourceType: "note",
    description: "One messy pasted note with several separate admin battles in it.",
    expectedCategories: [
      "refund",
      "subscription",
      "complaint",
      "deadline",
      "job_application",
      "bill_increase",
      "warranty",
      "important_reply",
    ],
    rawText:
      "Urgent admin pile: delivery from Northline failed and was cancelled, so I need to ask for a refund or compensation. StreamingBox annual subscription renews next Friday after the trial. Broadband bill has a price rise from GBP 38 to GBP 49 and the tariff increase starts 1 August. Laptop is broken and should still be under warranty for repair. Recruiter asked me to reply about interview availability for my job application. Also unhappy with poor service from the supplier; I complained twice and got no response. Final notice says action required before the deadline expires.",
  },
];
