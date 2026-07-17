import { describe, expect, it } from "vitest";
import {
  FILE_SIZE_LIMIT_HELPER,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  getFileTooLargeMessage,
  isFileWithinSizeLimit,
} from "../fileSizeLimit";

describe("file size limit", () => {
  it("uses a 20 MB per-file limit", () => {
    expect(MAX_FILE_SIZE_MB).toBe(20);
    expect(MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
    expect(FILE_SIZE_LIMIT_HELPER).toBe("Maximum 20 MB per file.");
  });

  it("accepts files at or below the limit", () => {
    expect(isFileWithinSizeLimit({ size: MAX_FILE_SIZE_BYTES })).toBe(true);
    expect(isFileWithinSizeLimit({ size: 1 })).toBe(true);
  });

  it("rejects files above the limit", () => {
    expect(isFileWithinSizeLimit({ size: MAX_FILE_SIZE_BYTES + 1 })).toBe(false);
  });

  it("explains that an oversized file was neither read nor uploaded", () => {
    const message = getFileTooLargeMessage({
      name: "large-statement.pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
    });

    expect(message).toContain("large-statement.pdf");
    expect(message).toContain("20 MB");
    expect(message).toContain("did not read or upload it");
  });
});
