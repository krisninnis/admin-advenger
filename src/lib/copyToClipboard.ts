// Copy Actions v1 - a small, dependency-free helper that does the one thing
// every copy button in AdminAvenger needs: try to write plain text to the
// clipboard, and never throw if that is not possible.
//
// This never sends, uploads, or transmits anything anywhere. It only ever
// writes text the user already sees on screen into their own device
// clipboard, using the standard browser Clipboard API.

export type ClipboardLike = {
  writeText: (text: string) => Promise<void>;
};

export type CopyResult = "copied" | "error";

// Shared button view-state, kept here (not in the CopyButton component file)
// so that file only ever exports the component itself - see
// react/only-export-components. Also lets this wording be unit tested
// directly, with no DOM/click simulation required.
export type CopyButtonStatus = "idle" | CopyResult;

export const COPY_BUTTON_IDLE_LABEL = "Copy";
export const COPY_BUTTON_SUCCESS_LABEL = "Copied";
export const COPY_BUTTON_SUCCESS_STATUS_MESSAGE = "Copied to your clipboard. Nothing has been sent.";
export const COPY_BUTTON_FAILURE_MESSAGE =
  "Could not copy. Select and copy the text manually.";

export const getCopyButtonLabel = (status: CopyButtonStatus): string =>
  status === "copied" ? COPY_BUTTON_SUCCESS_LABEL : COPY_BUTTON_IDLE_LABEL;

export const getCopyButtonStatusMessage = (status: CopyButtonStatus): string | undefined => {
  if (status === "copied") {
    return COPY_BUTTON_SUCCESS_STATUS_MESSAGE;
  }

  if (status === "error") {
    return COPY_BUTTON_FAILURE_MESSAGE;
  }

  return undefined;
};

// Resolves the real browser clipboard when one is available, without ever
// throwing if `navigator` or `navigator.clipboard` is missing (older
// browsers, insecure contexts, or non-browser test environments).
export const getBrowserClipboard = (): ClipboardLike | undefined => {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const clipboard = (navigator as { clipboard?: ClipboardLike }).clipboard;

  return clipboard && typeof clipboard.writeText === "function" ? clipboard : undefined;
};

// Copies `text` using the provided clipboard-like object (or the real
// browser clipboard by default). Always resolves - never rejects/throws -
// so a caller can safely await this without a try/catch of its own.
export const copyTextToClipboard = async (
  text: string,
  clipboard: ClipboardLike | undefined = getBrowserClipboard(),
): Promise<CopyResult> => {
  if (!clipboard) {
    return "error";
  }

  try {
    await clipboard.writeText(text);
    return "copied";
  } catch {
    return "error";
  }
};
