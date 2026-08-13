// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminCase } from "../../lib/caseFactory";
import { analyseAdminItem } from "../../lib/mockAnalysis";
import type { AdminItem, SourceType } from "../../types";
import { HomeView, type HomeAnalysisResult } from "../HomeView";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

vi.mock("../../lib/documentFileText", () => ({
  extractDocxText: vi.fn(),
  extractPdfText: vi.fn(),
}));

afterEach(cleanup);

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

function Harness() {
  const [result, setResult] = useState<HomeAnalysisResult | undefined>();

  const onCheck = async (
    title: string,
    sourceType: SourceType,
    rawText: string,
    userQuestion?: string,
  ): Promise<boolean> => {
    const timestamp = new Date().toISOString();
    const item: AdminItem = {
      id: `refund-${Math.random().toString(36).slice(2)}`,
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

const submit = async (message: string) => {
  render(<Harness />);
  fireEvent.change(screen.getByLabelText("Paste text or drop a document here"), {
    target: { value: message },
  });
  fireEvent.click(screen.getByRole("button", { name: /^What does this mean\?$/i }));
};

describe("HomeView refund lifecycle primary action", () => {
  it("does not offer refund tracking after the source confirms receipt", async () => {
    await submit("Your refund has arrived in your bank account.");

    expect(await screen.findByRole("heading", { name: "Refund confirmed as received" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Track refund" })).toBeNull();
  });

  it("retains refund tracking while an approved refund is still pending", async () => {
    await submit("Your refund has been approved and should arrive soon.");

    expect(await screen.findByRole("heading", { name: "Refund approved" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Track refund" })).toBeTruthy();
  });
});
