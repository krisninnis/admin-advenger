import type { AdminFinding, AdminItem } from "../types";

export const sampleAdminItems: AdminItem[] = [
  {
    id: "item-1",
    title: "Delayed train refund email",
    sourceType: "email",
    rawText:
      "Your train from Manchester to London was delayed by 68 minutes on 14 June. You may be eligible for delay repay under the operator policy.",
    createdAt: "2026-06-20T09:10:00.000Z",
    analysedAt: "2026-06-20T09:12:00.000Z",
  },
  {
    id: "item-2",
    title: "Streaming renewal receipt",
    sourceType: "receipt",
    rawText:
      "Thanks for your payment. Premium Streaming Plan renewed at £14.99 per month. Your next payment will be taken on 1 July.",
    createdAt: "2026-06-21T11:35:00.000Z",
    analysedAt: "2026-06-21T11:36:00.000Z",
  },
  {
    id: "item-3",
    title: "Product manager application",
    sourceType: "job_message",
    rawText:
      "Thanks for applying for the Product Manager role. We expect to review applications within two weeks and will be in touch with next steps.",
    createdAt: "2026-06-22T16:20:00.000Z",
    analysedAt: "2026-06-22T16:22:00.000Z",
  },
  {
    id: "item-4",
    title: "Laptop warranty letter",
    sourceType: "pdf",
    rawText:
      "Your laptop remains covered by a 24-month manufacturer warranty until 10 September 2026. Hardware faults should be reported with proof of purchase.",
    createdAt: "2026-06-23T08:45:00.000Z",
    analysedAt: "2026-06-23T08:47:00.000Z",
  },
  {
    id: "item-5",
    title: "Broadband price rise notice",
    sourceType: "bill",
    rawText:
      "From 1 August your broadband package will increase from £38 to £47 per month. You may contact us before the change date to discuss your options.",
    createdAt: "2026-06-24T14:05:00.000Z",
    analysedAt: "2026-06-24T14:07:00.000Z",
  },
];

export const sampleFindings: AdminFinding[] = [
  {
    id: "finding-1",
    itemId: "item-1",
    category: "refund",
    title: "Possible refund follow-up",
    summary: "A delayed train journey may qualify for compensation.",
    whyItMatters:
      "Delay repay claims are time-sensitive, and the refund could be missed if you leave it too long.",
    suggestedAction:
      "Submit a delay repay claim with the date, route, and ticket proof.",
    estimatedValue: "£21",
    urgency: "high",
    deadline: "2026-07-12",
    confidence: "high",
    status: "to_do",
    createdAt: "2026-06-20T09:12:00.000Z",
  },
  {
    id: "finding-2",
    itemId: "item-2",
    category: "subscription",
    title: "Subscription cancellation",
    summary: "A recurring streaming subscription renewed and will bill again soon.",
    whyItMatters:
      "Small recurring payments are easy to ignore, but they add up quickly if the service is no longer used.",
    suggestedAction:
      "Review whether you still use the service and cancel before the next billing date if not.",
    estimatedValue: "£14.99/mo",
    urgency: "medium",
    deadline: "2026-07-01",
    confidence: "high",
    status: "new",
    createdAt: "2026-06-21T11:36:00.000Z",
  },
  {
    id: "finding-3",
    itemId: "item-3",
    category: "job_application",
    title: "Job application follow-up",
    summary: "The employer expected to respond within two weeks.",
    whyItMatters:
      "A polite follow-up can keep your application active and show continued interest.",
    suggestedAction:
      "Send a short follow-up asking whether there are any updates on the hiring timeline.",
    urgency: "medium",
    deadline: "2026-07-06",
    confidence: "medium",
    status: "waiting",
    createdAt: "2026-06-22T16:22:00.000Z",
  },
  {
    id: "finding-4",
    itemId: "item-4",
    category: "warranty",
    title: "Warranty claim",
    summary: "The laptop warranty remains active until September 2026.",
    whyItMatters:
      "If there is a hardware fault, raising the claim before the warranty expires can avoid repair costs.",
    suggestedAction:
      "Collect proof of purchase and contact the manufacturer support team.",
    estimatedValue: "Up to £250",
    urgency: "low",
    deadline: "2026-09-10",
    confidence: "high",
    status: "new",
    createdAt: "2026-06-23T08:47:00.000Z",
  },
  {
    id: "finding-5",
    itemId: "item-5",
    category: "bill_increase",
    title: "Broadband price-rise review",
    summary: "Broadband is increasing by £9 per month from August.",
    whyItMatters:
      "Price-rise notices can create a chance to negotiate, switch, or request a better deal.",
    suggestedAction:
      "Check the provider, contract date, and whether cancellation or switching rights apply before asking for options.",
    estimatedValue: "GBP 108/year if unchanged",
    urgency: "high",
    deadline: "2026-08-01",
    confidence: "low",
    status: "to_do",
    createdAt: "2026-06-24T14:07:00.000Z",
  },
];
