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

const NEW_QUESTION_LABEL = "What would you like to know about this?";

// The field's accessible description can be composed from more than one element
// (the "Optional question" eyebrow and the helper text) via a space-separated
// aria-describedby, so resolve every referenced id, not just the first.
const resolveDescribedText = (input: HTMLElement) =>
  (input.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

describe("HomeView optional question field", () => {
  it("renders exactly one question input found by its visible label", () => {
    renderHomeView();

    const inputs = screen.getAllByLabelText(NEW_QUESTION_LABEL);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.id).toBe("user-question");
    expect((inputs[0] as HTMLInputElement).type).toBe("text");
  });

  it("presents a clearly optional section with an 'Optional question' eyebrow", () => {
    renderHomeView();

    expect(screen.getByText("Optional question")).toBeTruthy();
  });

  it("describes the field as optional, separate from the document, with useful examples", () => {
    renderHomeView();

    const input = screen.getByLabelText(NEW_QUESTION_LABEL);
    const description = resolveDescribedText(input).toLowerCase();

    // optional and explicitly separate from the document text
    expect(description).toContain("optional");
    expect(description).toContain("separate");
    // examples spanning meaning, urgency, deadline, and next action
    expect(description).toContain("mean");
    expect(description).toContain("urgent");
    expect(description).toContain("deadline");
    expect(description).toContain("next");
  });

  it("keeps only one question input in the DOM", () => {
    renderHomeView();

    expect(screen.getAllByLabelText(NEW_QUESTION_LABEL)).toHaveLength(1);
  });

  it("preserves the question value through Paste, Photo, and File and back", async () => {
    const user = userEvent.setup();
    renderHomeView();

    const input = screen.getByLabelText(NEW_QUESTION_LABEL) as HTMLInputElement;

    await user.type(input, "Is this correct?");
    expect(input.value).toBe("Is this correct?");

    const photoButton = screen.getByRole("button", { name: /Take or upload a photo/i });
    await user.click(photoButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText(NEW_QUESTION_LABEL)).toHaveLength(1);

    const cancelButton = screen.getByRole("button", { name: /Close photo capture/i });
    await user.click(cancelButton);

    expect(input.value).toBe("Is this correct?");

    const fileButton = screen.getByRole("button", { name: /Upload a file/i });
    await user.click(fileButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText(NEW_QUESTION_LABEL)).toHaveLength(1);

    const pasteButton = screen.getByRole("button", { name: /Paste text/i });
    await user.click(pasteButton);

    expect(input.value).toBe("Is this correct?");
    expect(screen.getAllByLabelText(NEW_QUESTION_LABEL)).toHaveLength(1);
  });
});
