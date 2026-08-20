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
import { afterEach, describe, expect, it } from "vitest";
import { HomeView } from "../HomeView";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
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
  const props = {
    onCheck: vi.fn().mockResolvedValue(true),
    onSaveCase: vi.fn(),
    onSaveRecord: vi.fn(),
    onClearResult: vi.fn(),
    onUpdateInboxScanSettings: vi.fn(),
    onIgnoreInboxScanItem: vi.fn(),
    onSaveScannedItem: vi.fn(),
    onSaveEmailSafetyCase: vi.fn(),
  };
  render(
    <HomeView
      analysisStatus="idle"
      inboxScanSettings={defaultInboxScanSettings}
      {...props}
    />,
  );
  return props;
};

describe("Care Fee controlled entry", () => {
  it("is absent when controlled features are disabled", () => {
    vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "false");
    renderHomeView();

    expect(screen.queryByRole("button", { name: "Compare care-fee records" })).toBeNull();
  });

  it("requires an explicit click when enabled and exits safely", async () => {
    vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "true");
    const user = userEvent.setup();
    const props = renderHomeView();

    await user.click(screen.getByRole("button", { name: "Compare care-fee records" }));

    expect(screen.getByRole("heading", { name: "Prepare care-fee records" })).toBeTruthy();
    expect(screen.getByText(/Attach up to three local records\./)).toBeTruthy();
    expect(screen.queryByLabelText("Paste text or drop a document here")).toBeNull();
    expect(props.onCheck).not.toHaveBeenCalled();
    expect(props.onSaveCase).not.toHaveBeenCalled();
    expect(props.onSaveRecord).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Exit care-fee preparation" }));
    expect(screen.getByLabelText("Paste text or drop a document here")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Prepare care-fee records" })).toBeNull();
  });

  it.each([
    "My father needs care.",
    "There is an unexplained amount of GBP 500.",
    "I think this is an overcharge.",
    "I am a carer and need support.",
    "Can Mum get CHC, FNC or Benefits?",
  ])("does not auto-launch from weak wording: %s", async (text) => {
    vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "true");
    const user = userEvent.setup();
    const props = renderHomeView();
    const input = screen.getByLabelText("Paste text or drop a document here");

    await user.type(input, text);
    await user.click(screen.getByRole("button", { name: "What does this mean?" }));

    expect(screen.queryByRole("heading", { name: "Prepare care-fee records" })).toBeNull();
    expect(screen.queryByText("Records ready for comparison")).toBeNull();
    expect(props.onSaveCase).not.toHaveBeenCalled();
    expect(props.onSaveRecord).not.toHaveBeenCalled();
  });

  it("keeps urgency precedence in the ordinary path", async () => {
    vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "true");
    const user = userEvent.setup();
    const props = renderHomeView();

    await user.type(
      screen.getByLabelText("Paste text or drop a document here"),
      "The hospital says my mother is being discharged tomorrow and I cannot cope.",
    );
    await user.click(screen.getByRole("button", { name: "What does this mean?" }));

    expect(screen.getByText("If someone needs help right now")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Prepare care-fee records" })).toBeNull();
    expect(props.onCheck).not.toHaveBeenCalled();
  });

  it("caps the controlled intake at three records without dropping the visible status", async () => {
    vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "true");
    const user = userEvent.setup();
    renderHomeView();
    await user.click(screen.getByRole("button", { name: "Compare care-fee records" }));

    const files = [1, 2, 3, 4].map(
      (number) =>
        new File([`Resident contribution: GBP ${480 + number} per week`], `record-${number}.txt`, {
          type: "text/plain",
        }),
    );
    await user.upload(screen.getByLabelText("Choose photos or files"), files);

    expect((await screen.findAllByText("record-1.txt")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("record-2.txt").length).toBeGreaterThan(0);
    expect(screen.getAllByText("record-3.txt").length).toBeGreaterThan(0);
    expect(screen.queryByText("record-4.txt")).toBeNull();
    expect(screen.getByText("This controlled journey accepts up to three records.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Choose two care-fee records" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Review record candidates" }));
    expect(screen.getByRole("heading", { name: "Choose two care-fee records" })).toBeTruthy();
  });
});
