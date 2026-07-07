import { describe, expect, it } from "vitest";
import {
  photoAcceptAttribute,
  photoCaptureAcceptAttribute,
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

  it("the camera panel's 'Upload existing photo' option accepts png/jpeg/webp/heic/heif", () => {
    expect(photoCaptureAcceptAttribute).toContain("image/png");
    expect(photoCaptureAcceptAttribute).toContain("image/jpeg");
    expect(photoCaptureAcceptAttribute).toContain("image/webp");
    expect(photoCaptureAcceptAttribute).toContain("image/heic");
    expect(photoCaptureAcceptAttribute).toContain("image/heif");
  });
});
