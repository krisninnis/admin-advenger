import { describe, expect, it, vi } from "vitest";
import { copyTextToClipboard, getBrowserClipboard, type ClipboardLike } from "../copyToClipboard";

describe("copyTextToClipboard", () => {
  it("writes the exact given text to the provided clipboard and resolves 'copied'", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboard: ClipboardLike = { writeText };

    const result = await copyTextToClipboard("Dear Sir/Madam, ...", clipboard);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("Dear Sir/Madam, ...");
    expect(result).toBe("copied");
  });

  it("resolves 'error' - and never throws - when the clipboard rejects", async () => {
    const clipboard: ClipboardLike = {
      writeText: vi.fn().mockRejectedValue(new Error("Clipboard permission denied")),
    };

    await expect(copyTextToClipboard("some text", clipboard)).resolves.toBe("error");
  });

  it("resolves 'error' - and never throws - when no clipboard is available", async () => {
    const result = await copyTextToClipboard("some text", undefined);

    expect(result).toBe("error");
  });

  it("falls back to the global browser clipboard when none is injected", () => {
    // In this project's non-jsdom test environment there is no real
    // navigator.clipboard, so the safe default is `undefined` - proving the
    // fallback lookup itself never throws even when clipboard support is
    // completely absent.
    expect(() => getBrowserClipboard()).not.toThrow();
  });
});
