// Pure keyboard-behaviour rules for the "Check a message" primary textarea.
// Kept side-effect free and separate from HomeView so the Enter-to-check
// rules can be unit tested directly.

export type EnterSubmitInput = {
  key: string;
  shiftKey: boolean;
  /** True while an IME composition (e.g. Japanese/Chinese input) is in progress. */
  isComposing?: boolean;
  /** True when the textarea currently has non-whitespace content. */
  hasText: boolean;
  /** True while the app is already checking, reading a photo, or reading with AI. */
  isBusy: boolean;
  /** True on touch/coarse-pointer devices, where Enter should behave normally. */
  isCoarsePointer: boolean;
};

/**
 * Decide whether a keydown event on the primary "Check a message" textarea
 * should trigger "What does this mean?" instead of inserting a newline.
 *
 * Rules:
 * - Only the Enter key can submit, and only without Shift (Shift+Enter always
 *   stays a plain newline).
 * - Never submits mid IME composition, while empty, or while busy
 *   (checking/reading photo/reading with AI).
 * - Never submits on coarse-pointer (touch/mobile) environments, so normal
 *   mobile keyboard behaviour is left alone.
 */
export const shouldSubmitOnEnterKey = ({
  key,
  shiftKey,
  isComposing,
  hasText,
  isBusy,
  isCoarsePointer,
}: EnterSubmitInput): boolean => {
  if (key !== "Enter") {
    return false;
  }

  if (shiftKey || isComposing) {
    return false;
  }

  if (!hasText || isBusy || isCoarsePointer) {
    return false;
  }

  return true;
};

/**
 * Best-effort detection of a coarse (touch/mobile) pointer environment.
 * Falls back to `false` (treat as desktop) if matchMedia is unavailable,
 * e.g. in non-browser test environments.
 */
export const isCoarsePointerEnvironment = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};
