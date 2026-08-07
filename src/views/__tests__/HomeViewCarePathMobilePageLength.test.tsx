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

// WCP-005, mobile page length.
//
// The measured defect was not that any single thing was too big. It was that
// the whole original input surface stayed at full size above the active care
// step, so on a 320 px screen the preparation summary the person had just
// finished sat several screens down, and the directory then grew underneath it.
//
// So while a Wales care route is live, the input surface becomes a short
// summary with one honest control. Nothing is thrown away: the text is still
// echoed by the care panel, the controls come straight back, and every other
// journey through this view is untouched. These tests hold that line.

afterEach(cleanup);

const PASTE_LABEL = "Paste text or drop a document here";
const CHECK_BUTTON = "What does this mean?";
const ORDINARY_CHECK = "Just check this as a message";
const REOPEN = "View or change original message";
const COMPACT_REGION = "Your message";

const CARE_TEXT = "My sister needs help.";
const SUPPORTER_TEXT =
  "I look after my neighbour every day and I am struggling to cope.";
const BOTH_TEXT = "My Dad needs help and looking after him is wearing me out.";
const ORDINARY_TEXT =
  "Your broadband price is going up by 7.99 percent from April.";

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
  const onSaveScannedItem = vi.fn();
  const onSaveEmailSafetyCase = vi.fn();

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
      onSaveScannedItem={onSaveScannedItem}
      onSaveEmailSafetyCase={onSaveEmailSafetyCase}
    />,
  );

  return {
    ...rendered,
    onCheck,
    onSaveCase,
    onSaveRecord,
    onSaveScannedItem,
    onSaveEmailSafetyCase,
  };
};

const submit = async (text: string) => {
  const rendered = renderHomeView();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(PASTE_LABEL), text);
  await user.click(screen.getByRole("button", { name: CHECK_BUTTON }));
  return { ...rendered, user };
};

const enterCareOrientation = async (text = CARE_TEXT, choice = "My sister") => {
  const rendered = await submit(text);
  await rendered.user.click(screen.getByRole("button", { name: choice }));
  return rendered;
};

/** Answers all three supported-person questions to reach the summary. */
const reachSupportedPersonSummary = async () => {
  const rendered = await enterCareOrientation();
  const { user } = rendered;

  await user.click(
    screen.getByRole("button", { name: "Prepare what is difficult day to day" }),
  );
  await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));

  return rendered;
};

const compactRegion = () =>
  within(screen.getByRole("region", { name: COMPACT_REGION }));

/**
 * The compact state is asserted two ways, because JSDOM cannot measure height.
 *
 * The DOM contract is that the input surface carries `hidden`, which is what
 * actually removes its height from the page. The behavioural contract is that
 * nothing inside it is left in the accessibility tree or the tab order, so a
 * keyboard or screen-reader user is not walked through a form that is no longer
 * on screen. Both have to hold.
 */
const inputSurfaceIsCompact = () => {
  const surface = document.getElementById("home-original-input-surface");

  return (
    surface !== null &&
    surface.hasAttribute("hidden") &&
    screen.queryByRole("textbox", { name: PASTE_LABEL }) === null &&
    screen.queryByRole("button", { name: CHECK_BUTTON }) === null
  );
};

const inputSurfaceIsFullyAvailable = () => {
  const surface = document.getElementById("home-original-input-surface");

  return (
    surface !== null &&
    !surface.hasAttribute("hidden") &&
    screen.queryByRole("textbox", { name: PASTE_LABEL }) !== null &&
    screen.queryByRole("button", { name: CHECK_BUTTON }) !== null
  );
};

describe("the input surface while a Wales care route is live", () => {
  it("is compact as soon as the care orientation opens", async () => {
    await enterCareOrientation();

    expect(screen.getByRole("region", { name: "What this may be about" })).toBeTruthy();
    expect(inputSurfaceIsCompact()).toBe(true);
    expect(screen.getByRole("region", { name: COMPACT_REGION })).toBeTruthy();
  });

  it("stays compact through the questions and the finished summary", async () => {
    await reachSupportedPersonSummary();

    expect(
      screen.getByRole("region", { name: "Your preparation summary" }),
    ).toBeTruthy();
    expect(inputSurfaceIsCompact()).toBe(true);
  });

  it("still shows the person what they submitted", async () => {
    await enterCareOrientation();

    // Once in the compact state and once echoed by the care panel itself. The
    // person is never left guessing which words are being prepared.
    expect(compactRegion().getByText(new RegExp(CARE_TEXT))).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "What this may be about" })).getByText(
        CARE_TEXT,
      ),
    ).toBeTruthy();
  });

  it("offers one honest control that says what it will do", async () => {
    await enterCareOrientation();

    const reopen = compactRegion().getByRole("button", { name: REOPEN });
    expect(reopen.getAttribute("aria-expanded")).toBe("false");
  });

  it("brings the input controls back with the text still in them", async () => {
    const { user } = await enterCareOrientation();

    await user.click(screen.getByRole("button", { name: REOPEN }));

    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    const box = screen.getByRole("textbox", {
      name: PASTE_LABEL,
    }) as HTMLTextAreaElement;
    expect(box.value).toBe(CARE_TEXT);
    expect(
      screen.getByRole("button", { name: REOPEN }).getAttribute("aria-expanded"),
    ).toBe("true");
  });

  it("keeps focus on the control it was pressed on, both ways", async () => {
    const { user } = await enterCareOrientation();
    screen.getByRole("button", { name: REOPEN }).focus();

    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: REOPEN }));

    await user.keyboard(" ");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: REOPEN }));
    expect(inputSurfaceIsCompact()).toBe(true);
  });

  it("does not lose the care route just because the input was reopened", async () => {
    const { user } = await enterCareOrientation();

    await user.click(screen.getByRole("button", { name: REOPEN }));

    expect(screen.getByRole("region", { name: "What this may be about" })).toBeTruthy();
  });

  it("clears the stale care route when the text is actually edited", async () => {
    const { user } = await enterCareOrientation();
    await user.click(screen.getByRole("button", { name: REOPEN }));

    await user.type(
      screen.getByRole("textbox", { name: PASTE_LABEL }),
      " Something different.",
    );

    // Existing behaviour, unchanged: a route decided from wording that no
    // longer exists is dropped rather than answered.
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "What this may be about" }),
      ).toBeNull(),
    );
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
  });

  it("leaves the ordinary message check reachable without reopening anything", async () => {
    const { user, onCheck } = await reachSupportedPersonSummary();

    const summary = within(
      screen.getByRole("region", { name: "Your preparation summary" }),
    );
    await user.click(summary.getByRole("button", { name: ORDINARY_CHECK }));

    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(1));
    expect(onCheck.mock.calls[0]?.[2]).toBe(CARE_TEXT);

    // The route is gone, so the full surface comes back on its own.
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });

  it("restores the full surface when the person goes back out of the care route", async () => {
    const { user } = await enterCareOrientation();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("group", { name: "Who needs help?" })).toBeTruthy();
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });

  it("takes no silent action while compacting", async () => {
    const { onCheck, onSaveCase, onSaveRecord, onSaveScannedItem, onSaveEmailSafetyCase } =
      await reachSupportedPersonSummary();

    expect(onCheck).not.toHaveBeenCalled();
    expect(onSaveCase).not.toHaveBeenCalled();
    expect(onSaveRecord).not.toHaveBeenCalled();
    expect(onSaveScannedItem).not.toHaveBeenCalled();
    expect(onSaveEmailSafetyCase).not.toHaveBeenCalled();
  });
});

describe("the input surface everywhere else", () => {
  it("is untouched before anything is submitted", () => {
    renderHomeView();

    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });

  it("is untouched while the front door is still asking its one question", async () => {
    await submit(CARE_TEXT);

    expect(screen.getByRole("region", { name: "One quick question" })).toBeTruthy();
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(
      (screen.getByRole("textbox", { name: PASTE_LABEL }) as HTMLTextAreaElement)
        .value,
    ).toBe(CARE_TEXT);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });

  it("is untouched on the urgent route", async () => {
    const { user } = await submit(CARE_TEXT);
    await user.click(
      screen.getByRole("button", { name: "Something urgent is happening" }),
    );

    expect(screen.getByRole("region", { name: "Urgent support" })).toBeTruthy();
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });

  it("is untouched on an ordinary message journey", async () => {
    const { onCheck } = await submit(ORDINARY_TEXT);

    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(1));
    expect(inputSurfaceIsFullyAvailable()).toBe(true);
    expect(screen.queryByRole("region", { name: COMPACT_REGION })).toBeNull();
  });
});

describe("the other two care summaries", () => {
  it("compacts the input for the supporter route and keeps its summary visible", async () => {
    const { user } = await enterCareOrientation(
      SUPPORTER_TEXT,
      "Me because I support them",
    );

    await user.click(
      screen.getByRole("button", { name: "Prepare how supporting them affects you" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("region", { name: "Your preparation summary" }),
    ).toBeTruthy();
    expect(inputSurfaceIsCompact()).toBe(true);
  });

  it("keeps the two both-people sections separate under a compact input", async () => {
    const { user } = await enterCareOrientation(BOTH_TEXT, "Both of us");

    await user.click(
      screen.getByRole("button", { name: "Prepare both sides separately" }),
    );
    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Supported-person side.
    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("radio", { name: "It has become more difficult" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Supporter side.
    await user.click(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "A few times a week" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("checkbox", { name: "It is becoming harder to manage" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // The two people must never be merged into one picture, compact input or not.
    const supported = within(
      screen.getByRole("region", { name: "Support needed by Dad" }),
    );
    const supporter = within(
      screen.getByRole("region", { name: "How supporting Dad affects you" }),
    );
    expect(supported.getByText("Every day")).toBeTruthy();
    expect(supported.queryByText("A few times a week")).toBeNull();
    expect(supporter.getByText("A few times a week")).toBeTruthy();
    expect(supporter.queryByText("Every day")).toBeNull();

    expect(inputSurfaceIsCompact()).toBe(true);
  });
});
