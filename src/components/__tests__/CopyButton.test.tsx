import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyButton } from "../CopyButton";
import {
  COPY_BUTTON_FAILURE_MESSAGE,
  COPY_BUTTON_IDLE_LABEL,
  COPY_BUTTON_SUCCESS_LABEL,
  COPY_BUTTON_SUCCESS_STATUS_MESSAGE,
  getCopyButtonLabel,
  getCopyButtonStatusMessage,
} from "../../lib/copyToClipboard";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

describe("CopyButton", () => {
  it("renders with the required 'Copy' label and an accessible name", () => {
    const html = renderToStaticMarkup(
      <CopyButton label="draft/checklist" getText={() => "Some draft text"} />,
    );

    expect(html).toContain(`>${COPY_BUTTON_IDLE_LABEL}<`);
    expect(html).toContain('aria-label="Copy draft/checklist"');
    expect(html).toContain('type="button"');
  });

  it("falls back to a generic accessible name when no label is given", () => {
    const html = renderToStaticMarkup(<CopyButton getText={() => "text"} />);

    expect(html).toContain('aria-label="Copy"');
  });

  it("does not render a status message before any copy attempt (idle state)", () => {
    const html = renderToStaticMarkup(<CopyButton getText={() => "text"} />);

    expect(html).not.toContain(COPY_BUTTON_SUCCESS_STATUS_MESSAGE);
    expect(html).not.toContain(COPY_BUTTON_FAILURE_MESSAGE);
  });

  // The button's visible label and status message are driven entirely by
  // these two pure functions (see CopyButton.tsx). Testing them directly
  // exercises the exact success/failure/idle behaviour a click produces,
  // without needing a browser DOM or a real click event - this project's
  // tests run without jsdom (see photoCapture.test.ts and others).
  describe("view-state helpers (what a click would show, without simulating one)", () => {
    it("shows 'Copy' while idle", () => {
      expect(getCopyButtonLabel("idle")).toBe(COPY_BUTTON_IDLE_LABEL);
      expect(getCopyButtonStatusMessage("idle")).toBeUndefined();
    });

    it("shows 'Copied' and a success message after a successful copy", () => {
      expect(getCopyButtonLabel("copied")).toBe(COPY_BUTTON_SUCCESS_LABEL);
      expect(getCopyButtonStatusMessage("copied")).toBe(COPY_BUTTON_SUCCESS_STATUS_MESSAGE);
    });

    it("keeps the 'Copy' label but shows a manual-copy message after a failed copy", () => {
      expect(getCopyButtonLabel("error")).toBe(COPY_BUTTON_IDLE_LABEL);
      expect(getCopyButtonStatusMessage("error")).toBe(COPY_BUTTON_FAILURE_MESSAGE);
    });
  });

  it("never uses forbidden safety wording, and never claims to send or submit anything", () => {
    const idleHtml = renderToStaticMarkup(<CopyButton getText={() => "text"} />);

    expect(findForbiddenSafetyPhrases(idleHtml)).toEqual([]);
    expect(findForbiddenSafetyPhrases(COPY_BUTTON_SUCCESS_STATUS_MESSAGE)).toEqual([]);
    expect(findForbiddenSafetyPhrases(COPY_BUTTON_FAILURE_MESSAGE)).toEqual([]);
    expect(COPY_BUTTON_SUCCESS_STATUS_MESSAGE.toLowerCase()).toContain("nothing has been sent");
  });
});
