import { describe, expect, it } from "vitest";
import { shouldSubmitOnEnterKey } from "../checkInputKeyboard";

const baseInput = {
  key: "Enter",
  shiftKey: false,
  isComposing: false,
  hasText: true,
  isBusy: false,
  isCoarsePointer: false,
};

describe("shouldSubmitOnEnterKey", () => {
  it("submits on plain Enter when there is text, on desktop, and nothing is busy", () => {
    expect(shouldSubmitOnEnterKey(baseInput)).toBe(true);
  });

  it("never submits on Shift+Enter, so it can insert a new line instead", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, shiftKey: true })).toBe(false);
  });

  it("does not submit when the input is empty", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, hasText: false })).toBe(false);
  });

  it("does not submit while checking, reading a photo, or reading with AI", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, isBusy: true })).toBe(false);
  });

  it("does not submit on coarse-pointer (touch/mobile) environments", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, isCoarsePointer: true })).toBe(false);
  });

  it("does not submit mid IME composition", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, isComposing: true })).toBe(false);
  });

  it("ignores keys other than Enter", () => {
    expect(shouldSubmitOnEnterKey({ ...baseInput, key: "a" })).toBe(false);
  });
});
