// @vitest-environment jsdom
import { vi } from "vitest";

// Mirror the isolation used by the other HomeView tests so heavy file/OCR
// dependencies do not load in jsdom.
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

vi.mock("../../lib/documentFileText", () => ({
  extractDocxText: vi.fn(),
  extractPdfText: vi.fn(),
}));

import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HomeView, type HomeAnalysisResult } from "../HomeView";
import type { AdminItem, SourceType } from "../../types";
import { analyseAdminItem } from "../../lib/mockAnalysis";
import { createAdminCase } from "../../lib/caseFactory";

const FULL_TAX_CODE_NOTICE = `HMRC
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

const defaultInboxScanSettings = {
  startupPromptDismissed: true,
  showStartupPrompt: false,
  previewEnabled: false,
  showEmailSafetyCheckButton: false,
  notifySavings: false,
  notifySuspicious: false,
  notificationMethod: "in_app" as const,
  ignoredItemIds: [],
  betaInterestFutureAlerts: false,
  betaAlertsNote: "",
};

const originalMediaDevices = navigator.mediaDevices;

beforeEach(() => {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
});

afterEach(() => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
  cleanup();
});

// A minimal stateful host that wires HomeView the same way App does: onCheck
// runs the real public analysis and feeds the resulting case back in as the
// `result` prop, so the assertions cover the true rendered journey rather than
// a stubbed callback.
function Harness() {
  const [result, setResult] = useState<HomeAnalysisResult | undefined>(undefined);

  const onCheck = async (
    title: string,
    sourceType: SourceType,
    rawText: string,
    userQuestion?: string,
  ): Promise<boolean> => {
    const timestamp = new Date().toISOString();
    const item: AdminItem = {
      id: `item-${Math.random().toString(36).slice(2)}`,
      title,
      sourceType,
      rawText,
      createdAt: timestamp,
      analysedAt: timestamp,
      userQuestion,
    };
    const findings = analyseAdminItem(item, { accessMode: "public" });
    const cases = findings.map((finding) => createAdminCase(finding, item));
    setResult({ item, findings, cases });
    return true;
  };

  return (
    <HomeView
      result={result}
      analysisStatus="idle"
      onCheck={onCheck}
      onSaveCase={() => {}}
      onSaveRecord={() => {}}
      onClearResult={() => setResult(undefined)}
      inboxScanSettings={defaultInboxScanSettings}
      onUpdateInboxScanSettings={() => {}}
      onIgnoreInboxScanItem={() => {}}
      onSaveScannedItem={() => {}}
      onSaveEmailSafetyCase={() => {}}
    />
  );
}

const submitJourney = async (question: string) => {
  const { container } = render(<Harness />);

  const textarea = screen.getByPlaceholderText("Paste the email, bill, letter, or message here...");
  fireEvent.change(textarea, { target: { value: FULL_TAX_CODE_NOTICE } });

  const questionField = screen.getByLabelText("What would you like to know about this?");
  fireEvent.change(questionField, { target: { value: question } });

  const submit = screen.getByRole("button", { name: /^What does this mean\?$/i });
  fireEvent.click(submit);

  // Wait for the rendered result screen.
  await screen.findByText((content) => content.includes("not a tax bill"));

  return container;
};

describe("HomeView HMRC public journey - rendered acceptance", () => {
  it("renders the full result screen correctly for the 'What is this?' question", async () => {
    const container = await submitJourney("What is this?");
    const text = container.textContent ?? "";

    // Title identifies the notice.
    expect(screen.getByRole("heading", { name: /HMRC tax code notice check/i })).toBeTruthy();

    // Direct answer appears, before the generic summary, with both codes and
    // the "not a tax bill" clarification.
    const titlePos = text.indexOf("HMRC tax code notice check");
    const directPos = text.indexOf("not a tax bill");
    const summaryPos = text.indexOf("AdminAvenger can help you understand the calculation");
    expect(titlePos).toBeGreaterThanOrEqual(0);
    expect(directPos).toBeGreaterThan(titlePos);
    expect(summaryPos).toBeGreaterThan(directPos);
    expect(text).toContain("C1263L");
    expect(text).toContain("C1254L");

    // Tax year is correct and present.
    expect(screen.getAllByText((content) => content.includes("6 April 2026 to 5 April 2027")).length).toBeGreaterThan(0);

    // No invented notice date, and no instruction rendered as a date.
    const datesSection = screen.getByText("Dates to check").closest("section");
    expect(datesSection).not.toBeNull();
    expect(within(datesSection!).getByText(/No clear date was found/i)).toBeTruthy();
    expect(within(datesSection!).queryByText(/contact HMRC/i)).toBeNull();
    expect(within(datesSection!).queryByText(/response deadline or action required/i)).toBeNull();

    // Evidence counts stay within the strict small bound (never 30/11/36).
    expect(text).not.toContain("30 pieces");
    expect(text).not.toContain("11 more to gather");
    expect(text).not.toContain("Show more (36)");
    expect(screen.getByText(/8 pieces of evidence found so far/)).toBeTruthy();

    // Employer and codes are not requested again.
    expect(text).not.toContain("Details of any employers");

    // Key-date preparation step is not Complete.
    const keyDateItem = screen.getByText("Key date checked").closest("li");
    expect(keyDateItem).not.toBeNull();
    expect(within(keyDateItem!).queryByText("Complete")).toBeNull();
    expect(within(keyDateItem!).getByText("Not started")).toBeTruthy();

    // No automatic draft for a what_is_this question.
    expect(screen.getByText(/No draft or checklist was included/i)).toBeTruthy();

    // No undefined text, no money-saved claim, no exact-payslip claim.
    expect(text).not.toContain("undefined");
    expect(text.toLowerCase()).not.toMatch(/£[\d,.]+ (?:has been |was )?(?:saved|recovered)\b/);
    expect(text.toLowerCase()).not.toContain("confirmed saved");
    expect(text.toLowerCase()).not.toMatch(/your payslip will (be|show)/);
  });

  it("produces the same safe direct answer when the question is the suggested 'What does this mean?'", async () => {
    const container = await submitJourney("What does this mean?");
    const text = container.textContent ?? "";

    expect(
      screen.getByText((content) =>
        content.includes("not a tax bill") && content.includes("C1263L") && content.includes("C1254L"),
      ),
    ).toBeTruthy();
    expect(text).not.toContain("undefined");
  });
});
