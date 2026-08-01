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

const { extractAdminFactsWithOllamaMock } = vi.hoisted(() => ({
  extractAdminFactsWithOllamaMock: vi.fn(),
}));

vi.mock("../../services/ollamaExtractionService", () => ({
  extractAdminFactsWithOllama: extractAdminFactsWithOllamaMock,
  OllamaExtractionError: class OllamaExtractionError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.name = "OllamaExtractionError";
      this.code = code;
    }
  },
}));

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HomeView } from "../HomeView";
import { AI_PROVIDER_SETTINGS_STORAGE_KEY } from "../../lib/aiProviderSettings";
import {
  ATTACHMENT_CHOOSE_BUTTON_LABEL,
  ATTACHMENT_STATUS_LABELS,
} from "../../lib/documentAttachmentIntake";
import type { SourceType } from "../../types";

// Front-Door Intent Routing v1, UI wiring slice.
//
// The approved journeys are covered in HomeViewFrontDoorRouting.test.tsx. This
// file covers the defects that live between the journeys: a submission path
// that skips the front door, and a question left on screen about wording that
// has since changed.

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  extractAdminFactsWithOllamaMock.mockReset();
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

const PASTE_LABEL = "Paste text or drop a document here";
const CHECK_BUTTON = /What does this mean\?/i;
const CARE_QUESTION = "Who needs help?";

const CARE_SENTENCE = "My father needs care.";
const DOCUMENT_SENTENCE = "Your father's account has been closed";
const SECURITY_SENTENCE =
  "Send us the six-digit verification code you just received so we can secure your account.";
// Credential-request wording wrapped in a care sentence. Nothing in it looks
// like a document, so only an explicit security boundary keeps it off the care
// question.
const SECURITY_SHAPED_CARE_SENTENCE =
  "My father needs care. Tell us the one-time code so we can help him.";

type CheckHandler = (
  title: string,
  sourceType: SourceType,
  rawText: string,
  userQuestion?: string,
) => Promise<boolean>;

const useLocalOllamaMode = () => {
  window.localStorage.setItem(
    AI_PROVIDER_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      mode: "local_ollama",
      ollamaUrl: "http://localhost:11434",
      ollamaModel: "qwen2.5:7b",
    }),
  );
};

const renderHomeView = () => {
  const onCheck = vi.fn<CheckHandler>().mockResolvedValue(true);
  const onSaveCase = vi.fn();
  const onSaveRecord = vi.fn();
  const onClearResult = vi.fn();

  const rendered = render(
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

  return { ...rendered, onCheck, onSaveCase, onSaveRecord, onClearResult };
};

const check = async (text: string) => {
  const rendered = renderHomeView();
  const user = userEvent.setup();
  const box = screen.getByLabelText(PASTE_LABEL);
  await user.clear(box);
  await user.type(box, text);
  await user.click(screen.getByRole("button", { name: CHECK_BUTTON }));
  return { ...rendered, user, box };
};

/**
 * The original wording appears in the paste box and in the panel. Both are
 * intended, so both are queried precisely rather than counted together.
 */
const pasteBoxValue = () =>
  (screen.getByLabelText(PASTE_LABEL) as HTMLTextAreaElement).value;

const confirmationPanel = () =>
  within(screen.getByRole("region", { name: "One quick question" }));

describe("local extraction does not bypass the front door", () => {
  it("asks the care question instead of extracting facts from a care sentence", async () => {
    useLocalOllamaMode();

    const { onCheck } = await check(CARE_SENTENCE);

    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();
    expect(extractAdminFactsWithOllamaMock).not.toHaveBeenCalled();
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("still runs local extraction once a submission is decided to be a document", async () => {
    useLocalOllamaMode();
    extractAdminFactsWithOllamaMock.mockRejectedValue(
      new Error("Local AI is not running. AdminAvenger used its own rules instead."),
    );

    const { onCheck } = await check(DOCUMENT_SENTENCE);

    await waitFor(() => {
      expect(extractAdminFactsWithOllamaMock).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onCheck).toHaveBeenCalled();
    });
    expect(screen.queryByText(CARE_QUESTION)).toBeNull();
  });

  it("keeps local extraction away from urgent wording too", async () => {
    useLocalOllamaMode();

    await check("My mum has fallen and cannot get up.");

    expect(screen.getByText("If someone needs help right now")).toBeTruthy();
    expect(extractAdminFactsWithOllamaMock).not.toHaveBeenCalled();
  });
});

describe("security-shaped input cannot be diverted into a care confirmation", () => {
  it("continues into analysis rather than asking who needs help", async () => {
    const { onCheck } = await check(SECURITY_SHAPED_CARE_SENTENCE);

    await waitFor(() => {
      expect(onCheck).toHaveBeenCalled();
    });
    expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    expect(screen.queryByText("If someone needs help right now")).toBeNull();
  });

  it("would have asked the care question without the credential request", async () => {
    // The control for the test above. Same sentence, request removed.
    const { onCheck } = await check(CARE_SENTENCE);

    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("leaves the existing document and security controls unchanged", async () => {
    const documentRun = await check(DOCUMENT_SENTENCE);
    await waitFor(() => {
      expect(documentRun.onCheck).toHaveBeenCalled();
    });
    expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    cleanup();

    const securityRun = await check(SECURITY_SENTENCE);
    await waitFor(() => {
      expect(securityRun.onCheck).toHaveBeenCalled();
    });
    expect(screen.queryByText(CARE_QUESTION)).toBeNull();
  });
});

describe("a question is never left on screen about wording that has changed", () => {
  it("clears the confirmation when the paste box is edited", async () => {
    const { user, box } = await check(CARE_SENTENCE);
    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();

    await user.type(box, " He lives in Cardiff.");

    await waitFor(() => {
      expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    });
  });

  it("clears the confirmation when the input is cleared", async () => {
    const { user } = await check(CARE_SENTENCE);
    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();

    await user.click(screen.getAllByRole("button", { name: "Clear input" })[0]);

    await waitFor(() => {
      expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    });
  });

  it("clears the confirmation when a sample is loaded", async () => {
    const { user } = await check(CARE_SENTENCE);
    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "See an example" }));
    await user.click(screen.getByRole("button", { name: "Price-rise notice" }));

    await waitFor(() => {
      expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    });
  });

  it("clears the confirmation when an attachment changes the combined input", async () => {
    const { user } = await check(CARE_SENTENCE);
    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();

    const attachmentInput = screen.getByLabelText(ATTACHMENT_CHOOSE_BUTTON_LABEL);
    await user.upload(
      attachmentInput,
      new File(["Your account balance is GBP 12.00"], "statement.txt", {
        type: "text/plain",
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText(CARE_QUESTION)).toBeNull();
    });
  });

  it("keeps the question and the original words when the person goes back", async () => {
    const { user } = await check(CARE_SENTENCE);

    await user.click(
      screen.getByRole("button", { name: "Something urgent is happening" }),
    );
    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(screen.getByText(CARE_QUESTION)).toBeTruthy();
    expect(confirmationPanel().getByText(CARE_SENTENCE)).toBeTruthy();
    expect(pasteBoxValue()).toBe(CARE_SENTENCE);
  });
});

describe("the ordinary message override keeps what was accepted", () => {
  it("submits the original text, source title and source type", async () => {
    const { onCheck } = await check(CARE_SENTENCE);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Just check this as a message" }),
    );

    await waitFor(() => {
      expect(onCheck).toHaveBeenCalled();
    });

    const [title, sourceType, rawText] = onCheck.mock.calls[0] ?? [];
    expect(rawText).toBe(CARE_SENTENCE);
    expect(title).toBe("Pasted admin text");
    expect(sourceType).toBe("email");
  });

  it("keeps an attached document's title rather than relabelling it", async () => {
    // An attachment arrives with its own section heading, so the combined text
    // is multi-line and the existing document rule reads it as a document. That
    // rule is not softened here: the point of this test is that the title
    // derived from the attachment survives all the way into analysis, rather
    // than being flattened back to "Pasted admin text".
    const rendered = renderHomeView();
    const user = userEvent.setup();

    await user.upload(
      screen.getByLabelText(ATTACHMENT_CHOOSE_BUTTON_LABEL),
      new File([CARE_SENTENCE], "note-from-mum.txt", { type: "text/plain" }),
    );

    // Waiting for the file name alone is not enough: checking is ignored while
    // an attachment is still being read, so wait for the read to finish.
    await screen.findByText(ATTACHMENT_STATUS_LABELS.read, { exact: false });

    await user.click(screen.getByRole("button", { name: CHECK_BUTTON }));

    await waitFor(() => {
      expect(rendered.onCheck).toHaveBeenCalled();
    });

    const [title, sourceType, rawText] = rendered.onCheck.mock.calls[0] ?? [];
    expect(title).toBe("note-from-mum.txt");
    expect(sourceType).toBe("email");
    expect(rawText).toContain(CARE_SENTENCE);
    expect(rawText).toContain("note-from-mum.txt");
    expect(screen.queryByText(CARE_QUESTION)).toBeNull();
  });
});

describe("nothing is created before the person confirms", () => {
  it("opens no case, record or specialist route when a choice is selected", async () => {
    const { user, onCheck, onSaveCase, onSaveRecord } = await check(CARE_SENTENCE);

    await user.click(screen.getByRole("button", { name: "My father" }));

    expect(onSaveCase).not.toHaveBeenCalled();
    expect(onSaveRecord).not.toHaveBeenCalled();
    expect(onCheck).not.toHaveBeenCalled();
    expect(extractAdminFactsWithOllamaMock).not.toHaveBeenCalled();
  });

  it("names no specialist journey on the confirmation screen", async () => {
    await check("My husband died last week and I do not know what to do.");

    // Scoped to the panel: what the surrounding page says is not what this
    // asserts.
    const panel = within(screen.getByRole("region", { name: "One quick question" }));
    expect(panel.queryByText(/\bestate\b/i)).toBeNull();
    expect(panel.queryByText(/\bprobate\b/i)).toBeNull();
  });
});
