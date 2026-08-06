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

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HomeView } from "../HomeView";
import type { SourceType } from "../../types";

afterEach(cleanup);

const FINAL_LABEL = "Just check this as a message";
const CARE_TEXT = "My sister needs help.";
const PASTE_LABEL = "Paste text or drop a document here";

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

type CheckHandler = (
  title: string,
  sourceType: SourceType,
  rawText: string,
  userQuestion?: string,
) => Promise<boolean>;

const renderHomeView = () => {
  const onCheck = vi.fn<CheckHandler>().mockResolvedValue(true);
  const onSaveCase = vi.fn();
  const onSaveRecord = vi.fn();

  const rendered = render(
    <HomeView
      analysisStatus="idle"
      onCheck={onCheck}
      onSaveCase={onSaveCase}
      onSaveRecord={onSaveRecord}
      onClearResult={vi.fn()}
      inboxScanSettings={defaultInboxScanSettings}
      onUpdateInboxScanSettings={vi.fn()}
      onIgnoreInboxScanItem={vi.fn()}
      onSaveScannedItem={vi.fn()}
      onSaveEmailSafetyCase={vi.fn()}
    />,
  );

  return { ...rendered, onCheck, onSaveCase, onSaveRecord };
};

const enterCareOrientation = async () => {
  const rendered = renderHomeView();
  const user = userEvent.setup();
  const pasteBox = screen.getByLabelText(PASTE_LABEL);

  await user.type(pasteBox, CARE_TEXT);
  await user.click(screen.getByRole("button", { name: "What does this mean?" }));
  await user.click(screen.getByRole("button", { name: "My sister" }));

  return { ...rendered, user, pasteBox };
};

const reachSupportedPersonSummary = async () => {
  const rendered = await enterCareOrientation();
  const { user } = rendered;

  await user.click(
    screen.getByRole("button", { name: "Prepare what is difficult day to day" }),
  );
  expect(screen.getByRole("button", { name: FINAL_LABEL })).toBeTruthy();

  await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  return rendered;
};

describe("Wales Care Path Return Clarity", () => {
  it("names the orientation exit for the ordinary analysis it actually launches", async () => {
    const { user, pasteBox, onCheck, onSaveCase, onSaveRecord } =
      await enterCareOrientation();

    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(screen.getByRole("button", { name: FINAL_LABEL })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Return to (the )?original message/i })).toBeNull();

    const ordinaryCheck = screen.getByRole("button", { name: FINAL_LABEL });
    ordinaryCheck.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(1));
    expect(onCheck.mock.calls[0]?.slice(0, 3)).toEqual([
      "Pasted admin text",
      "email",
      CARE_TEXT,
    ]);
    expect((pasteBox as HTMLTextAreaElement).value).toBe(CARE_TEXT);
    expect(screen.queryByRole("region", { name: "What this may be about" })).toBeNull();
    expect(screen.queryByRole("button", { name: FINAL_LABEL })).toBeNull();
    expect(document.activeElement).toBe(document.body);
    expect(onSaveCase).not.toHaveBeenCalled();
    expect(onSaveRecord).not.toHaveBeenCalled();
  });

  it("keeps the summary exit honest and contextual through Back and signposting", async () => {
    const { user, pasteBox, onCheck, onSaveCase, onSaveRecord } =
      await reachSupportedPersonSummary();
    let summary = within(
      screen.getByRole("region", { name: "Your preparation summary" }),
    );

    expect(summary.getByRole("button", { name: FINAL_LABEL })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: FINAL_LABEL })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Return to (the )?original message/i })).toBeNull();

    await user.click(summary.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("group", { name: "How often is help needed?" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: FINAL_LABEL })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    summary = within(screen.getByRole("region", { name: "Your preparation summary" }));
    const signposting = screen.getByRole("button", {
      name: "Find trusted support in Wales",
    });
    await user.click(signposting);
    expect(
      screen.getByRole("region", { name: "Trusted places to try next" }),
    ).toBeTruthy();

    const ordinaryCheck = summary.getByRole("button", { name: FINAL_LABEL });
    ordinaryCheck.focus();
    await user.keyboard(" ");

    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(1));
    expect(onCheck.mock.calls[0]?.[2]).toBe(CARE_TEXT);
    expect((pasteBox as HTMLTextAreaElement).value).toBe(CARE_TEXT);
    expect(screen.queryByRole("region", { name: "Your preparation summary" })).toBeNull();
    expect(screen.queryByRole("region", { name: "What this may be about" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Find trusted support in Wales" }),
    ).toBeNull();
    expect(document.activeElement).toBe(document.body);
    expect(onSaveCase).not.toHaveBeenCalled();
    expect(onSaveRecord).not.toHaveBeenCalled();
  });

  it("keeps urgent support separate and Back restores the confirmation", async () => {
    const rendered = renderHomeView();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(PASTE_LABEL), CARE_TEXT);
    await user.click(screen.getByRole("button", { name: "What does this mean?" }));
    await user.click(
      screen.getByRole("button", { name: "Something urgent is happening" }),
    );

    expect(screen.getByRole("region", { name: "Urgent support" })).toBeTruthy();
    expect(screen.getByRole("button", { name: FINAL_LABEL })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByRole("group", { name: "Who needs help?" })).toBeTruthy();
    expect(rendered.onCheck).not.toHaveBeenCalled();
  });
});
