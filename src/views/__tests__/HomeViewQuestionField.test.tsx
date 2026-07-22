// @vitest-environment jsdom
import { vi } from "vitest";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

vi.mock("../../lib/documentFileText", () => ({
  extractDocxText: vi.fn(),
  extractPdfText: vi.fn(),
}));

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HomeView } from "../HomeView";
import type { SourceType } from "../../types";

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

const renderHomeView = () => {
  const onCheck = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
  const onClearResult = vi.fn();
  const onSaveCase = vi.fn();
  const onSaveRecord = vi.fn();
  const onUpdateInboxScanSettings = vi.fn();
  const onIgnoreInboxScanItem = vi.fn();
  const onSaveScannedItem = vi.fn();
  const onSaveEmailSafetyCase = vi.fn();

  const result = render(
    <HomeView
      analysisStatus="idle"
      onCheck={onCheck as (title: string, sourceType: SourceType, rawText: string, userQuestion?: string) => Promise<boolean>}
      onSaveCase={onSaveCase}
      onSaveRecord={onSaveRecord}
      onClearResult={onClearResult}
      inboxScanSettings={defaultInboxScanSettings}
      onUpdateInboxScanSettings={onUpdateInboxScanSettings}
      onIgnoreInboxScanItem={onIgnoreInboxScanItem}
      onSaveScannedItem={onSaveScannedItem}
      onSaveEmailSafetyCase={onSaveEmailSafetyCase}
    />,
  );

  return {
    ...result,
    onCheck,
    onClearResult,
    onSaveCase,
    onSaveRecord,
    onUpdateInboxScanSettings,
    onIgnoreInboxScanItem,
    onSaveScannedItem,
    onSaveEmailSafetyCase,
  };
};

describe("HomeView universal question field", () => {
  it("renders the question input found by its visible label", () => {
    renderHomeView();

    const input = screen.getByLabelText("What would you like help with?");
    expect(input).toBeTruthy();
    expect(input.id).toBe("user-question");
  });

  it("associates aria-describedby with the visible optional-help text", () => {
    renderHomeView();

    const input = screen.getByLabelText("What would you like help with?");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const hint = document.getElementById(describedBy!);
    expect(hint).toBeTruthy();
    expect(hint!.textContent).toContain("Optional");
  });

  it("renders only one question input in the DOM", () => {
    renderHomeView();

    const inputs = screen.getAllByLabelText("What would you like help with?");
    expect(inputs).toHaveLength(1);
  });

  it("preserves the question value through Paste, Photo, and File and back", async () => {
    const user = userEvent.setup();
    renderHomeView();

    const input = screen.getByLabelText("What would you like help with?") as HTMLInputElement;

    await user.type(input, "Is this correct?");
    expect(input.value).toBe("Is this correct?");

    const photoButton = screen.getByRole("button", { name: /Take or upload a photo/i });
    await user.click(photoButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText("What would you like help with?")).toHaveLength(1);

    const cancelButton = screen.getByRole("button", { name: /Close photo capture/i });
    await user.click(cancelButton);

    expect(input.value).toBe("Is this correct?");

    const fileButton = screen.getByRole("button", { name: /Upload a file/i });
    await user.click(fileButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText("What would you like help with?")).toHaveLength(1);

    const pasteButton = screen.getByRole("button", { name: /Paste text/i });
    await user.click(pasteButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText("What would you like help with?")).toHaveLength(1);
  });
});
