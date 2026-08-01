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

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HomeView } from "../HomeView";
import type { SourceType } from "../../types";

// Front-Door Intent Routing v1, UI wiring slice.
//
// These tests exercise the eight approved journeys through the real front door:
// type into the paste box, press the check button, and assert what the person
// sees. The wording itself is asserted in
// src/lib/__tests__/frontDoorRouteView.test.ts, against the pure module that
// decides it. Here we prove the wiring: that non-document input is held back
// for one question, that document and security input is not, and that no case
// is created on the way.

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

const PASTE_LABEL = "Paste text or drop a document here";
const CHECK_BUTTON = /What does this mean\?/i;

type CheckHandler = (
  title: string,
  sourceType: SourceType,
  rawText: string,
  userQuestion?: string,
) => Promise<boolean>;

const renderHomeView = () => {
  // Typed with the real signature so the assertion on the third argument, the
  // text actually handed to analysis, is checked at compile time too.
  const onCheck = vi.fn<CheckHandler>().mockResolvedValue(true);
  const onSaveCase = vi.fn();
  const onSaveRecord = vi.fn();
  const onClearResult = vi.fn();

  const result = render(
    <HomeView
      analysisStatus="idle"
      onCheck={onCheck}
      onSaveCase={onSaveCase}
      onSaveRecord={onSaveRecord}
      onClearResult={onClearResult}
      inboxScanSettings={defaultInboxScanSettings}
      onUpdateInboxScanSettings={vi.fn()}
      onIgnoreInboxScanItem={vi.fn()}
      onSaveScannedItem={vi.fn()}
      onSaveEmailSafetyCase={vi.fn()}
    />,
  );

  return { ...result, onCheck, onSaveCase, onSaveRecord };
};

/**
 * The original wording appears in two places once a question is shown, and
 * that is the intended contract: the paste box still holds what the person
 * typed, and the panel echoes it back so they can see what they are being
 * asked about. Each is queried for precisely, so losing either one fails.
 */
const pasteBoxValue = () =>
  (screen.getByLabelText(PASTE_LABEL) as HTMLTextAreaElement).value;

const confirmationPanel = () =>
  within(screen.getByRole("region", { name: "One quick question" }));

/** Types the text into the paste box and presses the check button. */
const check = async (text: string) => {
  const rendered = renderHomeView();
  const user = userEvent.setup();
  const box = screen.getByLabelText(PASTE_LABEL);
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole("button", { name: CHECK_BUTTON }));
  return { ...rendered, user };
};

describe("J1: a plain care sentence gets one question, not a document result", () => {
  it("asks who needs help instead of analysing the sentence", async () => {
    const { onCheck } = await check("My father needs care.");

    expect(screen.getByText("This may be about care and support")).toBeTruthy();
    expect(screen.getByText("Who needs help?")).toBeTruthy();
    // The document journey must not have run.
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("offers the five approved choices", async () => {
    await check("My father needs care.");

    for (const label of [
      "My father",
      "Me because I support him",
      "Both of us",
      "Something urgent is happening",
      "I'm not sure",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
  });

  it("keeps the original wording on screen", async () => {
    await check("My father needs care.");

    expect(confirmationPanel().getByText("My father needs care.")).toBeTruthy();
    expect(pasteBoxValue()).toBe("My father needs care.");
  });

  it("offers a way back and ordinary message checking", async () => {
    await check("My father needs care.");

    expect(screen.getByRole("button", { name: "Go back" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Just check this as a message" }),
    ).toBeTruthy();
  });
});

describe("J2: an ambiguous request gets a clarification step", () => {
  it("asks rather than guessing", async () => {
    const { onCheck } = await check("Help with my brother.");

    expect(screen.getByText("Who needs help?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "My brother" })).toBeTruthy();
    expect(onCheck).not.toHaveBeenCalled();
  });
});

describe("J3: a benefits question asks whose benefits", () => {
  it("uses the possessive choices", async () => {
    const { onCheck } = await check("Can my father claim Attendance Allowance?");

    expect(screen.getByText("Whose benefits are you asking about?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "My father's" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mine" })).toBeTruthy();
    expect(onCheck).not.toHaveBeenCalled();
  });
});

describe("J4: urgency is handled before care routing", () => {
  const text =
    "The hospital says my mother is being discharged tomorrow and I cannot cope.";

  it("shows urgent support instead of a clarifying question", async () => {
    await check(text);

    expect(screen.getByText("If someone needs help right now")).toBeTruthy();
    expect(screen.queryByText("Who needs help?")).toBeNull();
  });

  it("says plainly that it cannot assess, judge urgency or contact anyone", async () => {
    await check(text);

    const statement = screen.getByText(/AdminAvenger cannot/i).textContent ?? "";
    expect(statement).toMatch(/assess/i);
    expect(statement).toMatch(/how urgent/i);
    expect(statement).toMatch(/contact/i);
  });

  it("lists the options without selecting a service", async () => {
    await check(text);

    expect(screen.getByText(/999, for an emergency/i)).toBeTruthy();
    expect(screen.getByText(/NHS 111 Wales/i)).toBeTruthy();
    expect(screen.getByText(/hospital discharge team/i)).toBeTruthy();
    // Nothing is presented as the chosen or recommended service.
    expect(screen.queryByText(/we have contacted/i)).toBeNull();
    expect(screen.queryByText(/you should call/i)).toBeNull();
  });
});

describe("J5: a fall gets immediate human help, not a form", () => {
  it("shows the contact options with no question first", async () => {
    await check("My mum has fallen and cannot get up.");

    expect(screen.getByText("If someone needs help right now")).toBeTruthy();
    expect(screen.getByText(/999, for an emergency/i)).toBeTruthy();
    expect(screen.queryByText("Who needs help?")).toBeNull();
  });
});

describe("J6: bereavement gets a bereavement-shaped step and no Estate route", () => {
  const text = "My husband died last week and I do not know what to do.";

  it("uses bereavement wording", async () => {
    await check(text);

    expect(
      screen.getByText("This may be about what happens after someone dies"),
    ).toBeTruthy();
  });

  it("never mentions or opens an Estate journey", async () => {
    await check(text);

    // Scoped to the panel: the surrounding page is not what this asserts.
    const panel = within(screen.getByRole("region", { name: "One quick question" }));
    expect(panel.queryByText(/\bestate\b/i)).toBeNull();
    expect(panel.queryByText(/\bprobate\b/i)).toBeNull();
  });
});

describe("J7: the document controls keep the existing journey", () => {
  it("sends a document straight to analysis with no confirmation step", async () => {
    const { onCheck } = await check("Your father's account has been closed");

    expect(onCheck).toHaveBeenCalled();
    expect(screen.queryByText("Who needs help?")).toBeNull();
    expect(screen.queryByText("If someone needs help right now")).toBeNull();
  });

  it("sends a second document control through unchanged", async () => {
    const { onCheck } = await check(
      "We have received your application and will write to you within 10 working days.",
    );

    expect(onCheck).toHaveBeenCalled();
    expect(screen.queryByText(/This may be about/i)).toBeNull();
  });
});

describe("J8: the security control stays on the security route", () => {
  it("continues into analysis so the security preflight still runs", async () => {
    const { onCheck } = await check(
      "Send us the six-digit verification code you just received so we can secure your account.",
    );

    expect(onCheck).toHaveBeenCalled();
    expect(screen.queryByText("Who needs help?")).toBeNull();
  });
});

describe("the confirmation step creates nothing", () => {
  it("saves no case when a choice is selected", async () => {
    const { user, onCheck, onSaveCase, onSaveRecord } = await check(
      "My father needs care.",
    );

    await user.click(screen.getByRole("button", { name: "My father" }));

    expect(onSaveCase).not.toHaveBeenCalled();
    expect(onSaveRecord).not.toHaveBeenCalled();
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("moves to urgent support when the person says something urgent is happening", async () => {
    const { user } = await check("My father needs care.");

    await user.click(
      screen.getByRole("button", { name: "Something urgent is happening" }),
    );

    expect(screen.getByText("If someone needs help right now")).toBeTruthy();
  });

  it("returns to the question when the person goes back", async () => {
    const { user } = await check("My father needs care.");

    await user.click(
      screen.getByRole("button", { name: "Something urgent is happening" }),
    );
    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.getByText("Who needs help?")).toBeTruthy();
    expect(confirmationPanel().getByText("My father needs care.")).toBeTruthy();
    expect(pasteBoxValue()).toBe("My father needs care.");
  });

  it("hands the original words to ordinary checking on request", async () => {
    const { user, onCheck } = await check("My father needs care.");

    await user.click(
      screen.getByRole("button", { name: "Just check this as a message" }),
    );

    expect(onCheck).toHaveBeenCalled();
    const rawTextArgument = onCheck.mock.calls[0]?.[2];
    expect(rawTextArgument).toBe("My father needs care.");
    expect(screen.queryByText("Who needs help?")).toBeNull();
  });
});
