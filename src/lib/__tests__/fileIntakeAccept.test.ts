import { describe, expect, it } from "vitest";
import {
  photoAcceptAttribute,
  quickUploadAcceptAttribute,
  textFileAcceptAttribute,
} from "../fileIntakeAccept";

describe("file intake accept attributes", () => {
  it("the photo control still accepts images", () => {
    expect(photoAcceptAttribute).toBe("image/*");
  });

  it("the file control still accepts the supported text/document types", () => {
    expect(textFileAcceptAttribute).toContain(".txt");
    expect(textFileAcceptAttribute).toContain(".md");
    expect(textFileAcceptAttribute).toContain(".csv");
    expect(textFileAcceptAttribute).toContain(".json");
  });

  it("the compact 'Add photo or file' upload option accepts both photos and documents", () => {
    expect(quickUploadAcceptAttribute).toContain(photoAcceptAttribute);
    expect(quickUploadAcceptAttribute).toContain(textFileAcceptAttribute);
  });
});
