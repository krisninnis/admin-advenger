import { describe, expect, it, vi } from "vitest";
import photoCaptureSource from "../photoCapture.ts?raw";
import photoCapturePanelSource from "../../components/PhotoCapturePanel.tsx?raw";
import homeViewSource from "../../views/HomeView.tsx?raw";
import {
  CAMERA_GUIDANCE_CLOSE_UP_MESSAGE,
  CAMERA_GUIDANCE_FIT_MESSAGE,
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_UNAVAILABLE_MESSAGE,
  CAPTURED_PHOTO_FILE_NAME,
  CAPTURED_PHOTO_JPEG_QUALITY,
  CAPTURED_PHOTO_MIME_TYPE,
  EXTRA_PHOTO_FILE_NAME,
  PHOTO_ADD_CLOSE_UP_DESCRIPTION,
  PHOTO_ADD_CLOSE_UP_LABEL,
  PHOTO_CANCEL_LABEL,
  PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE,
  PHOTO_DETECTING_MESSAGE,
  PHOTO_EDIT_MANUALLY_LABEL,
  PHOTO_LOADING_MESSAGE,
  PHOTO_NO_DOCUMENT_MESSAGE,
  PHOTO_RETAKE_PHOTO_LABEL,
  PHOTO_REVIEW_ACTIONS_CLASSNAME,
  PHOTO_REVIEW_CONTENT_CLASSNAME,
  PHOTO_SCAN_REVIEW_QUESTION,
  PHOTO_SECTION_ADDITIONAL_LABEL,
  PHOTO_SECTION_ADDITIONAL_TITLE,
  PHOTO_SECTION_FULL_PAGE_LABEL,
  PHOTO_SECTION_FULL_PAGE_TITLE,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_TRY_AGAIN_LABEL,
  PHOTO_UPLOAD_ANOTHER_LABEL,
  PHOTO_UPLOAD_CLEARER_LABEL,
  PHOTO_USE_ORIGINAL_LABEL,
  PHOTO_USE_ORIGINAL_WARNING,
  PHOTO_USE_SCAN_LABEL,
  capturePhotoFromVideoElement,
  classifyCameraError,
  createCapturedPhotoFile,
  getCameraErrorMessage,
  getCameraGuidanceFitMessage,
  getCapturedPhotoFileName,
  getPhotoCaptureSectionLabel,
  getPhotoCaptureSectionTitle,
  isCameraCaptureSupported,
  photoCaptureReducer,
  requestEnvironmentCameraStream,
  stageHasActiveCameraStream,
  stageShowsUploadFallback,
  stopMediaStreamTracks,
  type PhotoCaptureStage,
} from "../photoCapture";
import {
  hasAcceptedCurrentTerms,
  recordTermsAcceptance,
  resetTermsAcceptance,
} from "../termsAcceptance";

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

// ---- Panel state model ----
// PhotoCapturePanel always mounts starting from "choice" (it is only ever
// rendered while HomeView's showPhotoCapturePanel is true), so "opening the
// photo panel" is modelled as photoCaptureReducer(<any stage>, { type: "open" })
// resolving to "choice", exactly like clicking the mode-card button does.
describe("photo capture panel state model", () => {
  it("opening the panel resolves to the choice stage", () => {
    expect(photoCaptureReducer("closed", { type: "open" })).toBe("choice");
    expect(photoCaptureReducer("captured", { type: "open" })).toBe("choice");
  });

  it("choosing 'Take a photo' moves to requesting the camera", () => {
    expect(photoCaptureReducer("choice", { type: "choose_take_photo" })).toBe("requesting_camera");
  });

  it("a successful camera result moves from requesting_camera to camera_preview", () => {
    expect(photoCaptureReducer("requesting_camera", { type: "camera_ready" })).toBe(
      "camera_preview",
    );
  });

  it("permission-denied and camera-unavailable errors land in their own dedicated stages", () => {
    expect(
      photoCaptureReducer("requesting_camera", { type: "camera_error", kind: "permission_denied" }),
    ).toBe("permission_denied");
    expect(
      photoCaptureReducer("requesting_camera", { type: "camera_error", kind: "camera_unavailable" }),
    ).toBe("camera_unavailable");
    expect(
      photoCaptureReducer("requesting_camera", { type: "camera_error", kind: "unknown" }),
    ).toBe("camera_unavailable");
  });

  it("taking or uploading a photo enters loading and document detection before review", () => {
    expect(photoCaptureReducer("camera_preview", { type: "photo_loading" })).toBe("loading_photo");
    expect(photoCaptureReducer("choice", { type: "photo_loading" })).toBe("loading_photo");
    expect(photoCaptureReducer("loading_photo", { type: "photo_captured" })).toBe(
      "detecting_document",
    );
  });

  it("gallery replacement recovers from failed detection without starting OCR", () => {
    expect(photoCaptureReducer("no_document", { type: "photo_loading" })).toBe("loading_photo");
  });

  it("uploading an existing photo recovers from camera permission and availability errors", () => {
    expect(photoCaptureReducer("permission_denied", { type: "photo_loading" })).toBe(
      "loading_photo",
    );
    expect(photoCaptureReducer("camera_unavailable", { type: "photo_loading" })).toBe(
      "loading_photo",
    );
  });

  it("a detected document moves to scan review and a failed scan moves to no_document", () => {
    expect(photoCaptureReducer("detecting_document", { type: "scan_ready" })).toBe("scan_ready");
    expect(photoCaptureReducer("detecting_document", { type: "scan_failed" })).toBe("no_document");
  });

  it("retaking from review or failure goes back to requesting_camera", () => {
    expect(photoCaptureReducer("scan_ready", { type: "retake" })).toBe("requesting_camera");
    expect(photoCaptureReducer("no_document", { type: "retake" })).toBe("requesting_camera");
  });

  it("cancelling from any visible stage closes the panel", () => {
    const stages: PhotoCaptureStage[] = [
      "choice",
      "requesting_camera",
      "camera_preview",
      "loading_photo",
      "detecting_document",
      "scan_ready",
      "no_document",
      "captured",
      "permission_denied",
      "camera_unavailable",
    ];

    for (const stage of stages) {
      expect(photoCaptureReducer(stage, { type: "cancel" })).toBe("closed");
    }
  });

  it("using the reviewed prepared scan closes the panel", () => {
    expect(photoCaptureReducer("scan_ready", { type: "use_photo" })).toBe("closed");
  });

  it("only the camera_preview stage is considered to have an active camera stream", () => {
    expect(stageHasActiveCameraStream("camera_preview")).toBe(true);
    expect(stageHasActiveCameraStream("choice")).toBe(false);
    expect(stageHasActiveCameraStream("captured")).toBe(false);
    expect(stageHasActiveCameraStream("scan_ready")).toBe(false);
    expect(stageHasActiveCameraStream("requesting_camera")).toBe(false);
  });

  it("the upload-existing-photo fallback is available on choice, camera errors, and no-document", () => {
    expect(stageShowsUploadFallback("choice")).toBe(true);
    expect(stageShowsUploadFallback("permission_denied")).toBe(true);
    expect(stageShowsUploadFallback("camera_unavailable")).toBe(true);
    expect(stageShowsUploadFallback("no_document")).toBe(true);
    expect(stageShowsUploadFallback("camera_preview")).toBe(false);
    expect(stageShowsUploadFallback("captured")).toBe(false);
    expect(stageShowsUploadFallback("scan_ready")).toBe(false);
  });
});

// ---- Simplified scanner review workflow ----
describe("simplified photo scan review workflow", () => {
  it("removes manual crop controls, manual-adjust actions, and full-photo fallback copy", () => {
    const sources = [photoCaptureSource, photoCapturePanelSource, homeViewSource].join("\n");
    const forbiddenSnippets = [
      "manual_adjust",
      "adjust_manually",
      "Adjust manually",
      "Use full photo",
      "Read this area",
      "PHOTO_ADJUST_MANUALLY_LABEL",
      "PHOTO_READ_SELECTED_AREA_LABEL",
      "PHOTO_USE_FULL_PHOTO_LABEL",
      "PHOTO_FULL_PHOTO_WARNING",
      "PHOTO_CROP_FALLBACK_WARNING",
      "cropImageBlobToRect",
      "getDefaultManualCropRect",
      "isManualCropRectSafe",
      "cropAreaRef",
      "activeCropDragRef",
      "onPointerDown",
    ];

    for (const snippet of forbiddenSnippets) {
      expect(sources).not.toContain(snippet);
    }
  });

  it("presents only the binary confirmation after an automatic scan succeeds", () => {
    expect(PHOTO_SCAN_REVIEW_QUESTION).toBe("Does the whole document look clear?");
    expect(PHOTO_USE_SCAN_LABEL).toBe("Yes, use this");
    expect(PHOTO_TRY_AGAIN_LABEL).toBe("No, try again");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("sm:grid-cols-2");
    expect(PHOTO_REVIEW_CONTENT_CLASSNAME).toContain("overflow-y-auto");
    expect(photoCapturePanelSource).toContain("Prepared document scan preview");
    expect(photoCapturePanelSource).toContain("PHOTO_SCAN_REVIEW_QUESTION");
    expect(photoCapturePanelSource).toContain("PHOTO_USE_SCAN_LABEL");
    expect(photoCapturePanelSource).toContain("PHOTO_TRY_AGAIN_LABEL");
  });

  it("uses the required plain-language failure screen and choices", () => {
    expect(PHOTO_NO_DOCUMENT_MESSAGE).toBe("We couldn\u2019t find a clear document in this photo.");
    expect(PHOTO_RETAKE_PHOTO_LABEL).toBe("Retake photo");
    expect(PHOTO_UPLOAD_CLEARER_LABEL).toBe("Upload clearer image");
    expect(PHOTO_USE_ORIGINAL_LABEL).toBe("Use original photo anyway");
    expect(PHOTO_EDIT_MANUALLY_LABEL).toBe("Edit or paste manually");
    expect(PHOTO_USE_ORIGINAL_WARNING).toContain("background text");
    expect(PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE).toContain("other printed material");
    expect(photoCapturePanelSource).toContain("PHOTO_NO_DOCUMENT_MESSAGE");
    expect(photoCapturePanelSource).toContain("PHOTO_RETAKE_PHOTO_LABEL");
    expect(photoCapturePanelSource).toContain("PHOTO_UPLOAD_CLEARER_LABEL");
    expect(photoCapturePanelSource).toContain("PHOTO_USE_ORIGINAL_LABEL");
    expect(photoCapturePanelSource).toContain("PHOTO_EDIT_MANUALLY_LABEL");
  });

  it("preserves loading and document-detection feedback before review", () => {
    expect(PHOTO_LOADING_MESSAGE).toBe("Loading your photo...");
    expect(PHOTO_DETECTING_MESSAGE).toBe("Finding the document...");
    expect(photoCapturePanelSource).toContain("PHOTO_LOADING_MESSAGE");
    expect(photoCapturePanelSource).toContain("PHOTO_DETECTING_MESSAGE");
    expect(photoCapturePanelSource).toContain('aria-live="polite"');
  });

  it("the Yes action passes only the prepared scan to OCR", () => {
    const readScanBlock = sliceBetween(
      photoCapturePanelSource,
      "const handleReadScan = () =>",
      "const handleUseOriginalPhoto",
    );

    expect(readScanBlock).toContain("scannedFileRef.current");
    expect(readScanBlock).toContain("sendPhotoToOcr(scannedFile, scanWarnings, true)");
    expect(readScanBlock).not.toContain("sourceFileRef.current");
    expect(photoCapturePanelSource).not.toContain("readTextFromImage");
  });

  it("the original photo fallback is explicit and warned, never part of automatic detection failure", () => {
    const originalFallbackBlock = sliceBetween(
      photoCapturePanelSource,
      "const handleUseOriginalPhoto = () =>",
      "const handleEditManually",
    );

    expect(originalFallbackBlock).toContain("sourceFileRef.current");
    expect(originalFallbackBlock).toContain("PHOTO_USE_ORIGINAL_WARNING");
    expect(originalFallbackBlock).toContain("sendPhotoToOcr(sourceFile, [PHOTO_USE_ORIGINAL_WARNING], false)");

    const failureScreenBlock = sliceBetween(
      photoCapturePanelSource,
      'stage === "no_document"',
      'stage === "permission_denied"',
    );

    expect(failureScreenBlock).toContain("PHOTO_USE_ORIGINAL_LABEL");
    expect(failureScreenBlock).toContain("PHOTO_USE_ORIGINAL_WARNING");
  });

  it("the No action returns to choosing another photo and does not start OCR", () => {
    const tryAgainBlock = sliceBetween(
      photoCapturePanelSource,
      "const handleTryAgain = () =>",
      "const handleRetake = () =>",
    );

    expect(tryAgainBlock).toContain('dispatch({ type: "open" })');
    expect(tryAgainBlock).not.toContain("sendPhotoToOcr");
    expect(tryAgainBlock).not.toContain("onUsePhotos");
  });

  it("rejected automatic detection cannot enter OCR from the panel", () => {
    const prepareBlock = sliceBetween(
      photoCapturePanelSource,
      "const preparePhotoForReview = async",
      "const handleChooseTakePhoto",
    );

    expect(prepareBlock).toContain('dispatch({ type: "scan_failed" })');
    expect(prepareBlock).not.toContain("sendPhotoToOcr");
    expect(prepareBlock).not.toContain("onUsePhotos");
    expect(prepareBlock).not.toContain("canUseFullPhoto");
  });

  it("camera capture, selected uploads, and initial image attachments share the same scanner path", () => {
    expect(photoCapturePanelSource).toContain("await preparePhotoForReview(file)");
    expect(photoCapturePanelSource).toContain("const handleUploadExisting = (file: File)");
    expect(photoCapturePanelSource).toContain("initialPhotoFile");
    expect(photoCapturePanelSource).toContain("void preparePhotoForReview(initialPhotoFile)");
    expect(homeViewSource).toContain("setPendingPhotoFile(file)");
    expect(homeViewSource).toContain("setShowPhotoCapturePanel(true)");
  });
});

// ---- Camera permission / availability classification ----
describe("camera error classification and fallback copy", () => {
  it("classifies NotAllowedError (and related names) as permission_denied", () => {
    expect(classifyCameraError(new DOMException("blocked", "NotAllowedError"))).toBe(
      "permission_denied",
    );
    expect(classifyCameraError(new DOMException("blocked", "PermissionDeniedError"))).toBe(
      "permission_denied",
    );
    expect(classifyCameraError(new DOMException("blocked", "SecurityError"))).toBe(
      "permission_denied",
    );
  });

  it("classifies NotFoundError (and related names) as camera_unavailable", () => {
    expect(classifyCameraError(new DOMException("none", "NotFoundError"))).toBe(
      "camera_unavailable",
    );
    expect(classifyCameraError(new DOMException("none", "DevicesNotFoundError"))).toBe(
      "camera_unavailable",
    );
    expect(classifyCameraError(new DOMException("none", "OverconstrainedError"))).toBe(
      "camera_unavailable",
    );
  });

  it("classifies anything else (or a non-DOMException) as unknown", () => {
    expect(classifyCameraError(new DOMException("oops", "AbortError"))).toBe("unknown");
    expect(classifyCameraError(new Error("not a camera error"))).toBe("unknown");
    expect(classifyCameraError("some string")).toBe("unknown");
  });

  it("permission-denied state shows the exact required upload fallback copy", () => {
    expect(getCameraErrorMessage("permission_denied")).toBe(CAMERA_PERMISSION_DENIED_MESSAGE);
    expect(CAMERA_PERMISSION_DENIED_MESSAGE).toBe(
      "Camera access was blocked. You can upload a photo instead.",
    );
    expect(photoCapturePanelSource).toContain("stage === \"permission_denied\"");
    expect(photoCapturePanelSource).toContain("<UploadExistingPhotoInput");
  });

  it("camera-unavailable state shows the exact required upload fallback copy", () => {
    expect(getCameraErrorMessage("camera_unavailable")).toBe(CAMERA_UNAVAILABLE_MESSAGE);
    expect(CAMERA_UNAVAILABLE_MESSAGE).toBe("No camera was found. You can upload a photo instead.");
  });

  it("isCameraCaptureSupported is false when getUserMedia is not a function", () => {
    expect(isCameraCaptureSupported(undefined)).toBe(false);
    expect(isCameraCaptureSupported({} as MediaDevices)).toBe(false);
  });

  it("isCameraCaptureSupported is true when getUserMedia exists", () => {
    const fakeMediaDevices = { getUserMedia: vi.fn() } as unknown as MediaDevices;
    expect(isCameraCaptureSupported(fakeMediaDevices)).toBe(true);
  });
});

// ---- requestEnvironmentCameraStream ----
describe("requestEnvironmentCameraStream", () => {
  it("prefers the rear/environment camera via facingMode", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream);

    await requestEnvironmentCameraStream({ getUserMedia });

    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: { ideal: CAMERA_IDEAL_WIDTH },
        height: { ideal: CAMERA_IDEAL_HEIGHT },
      },
    });
  });

  it("asks for a high-resolution stream (ideal, not exact) so full-page letters stay legible", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] } as unknown as MediaStream);

    await requestEnvironmentCameraStream({ getUserMedia });

    const call = getUserMedia.mock.calls[0][0];
    expect(call.video.width).toEqual({ ideal: 1920 });
    expect(call.video.height).toEqual({ ideal: 1080 });
  });

  it("returns a success result with the stream when getUserMedia resolves", async () => {
    const fakeStream = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream);

    const result = await requestEnvironmentCameraStream({ getUserMedia });

    expect(result).toEqual({ status: "success", stream: fakeStream });
  });

  it("classifies a rejected getUserMedia into a permission_denied error result", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException("blocked", "NotAllowedError"));

    const result = await requestEnvironmentCameraStream({ getUserMedia });

    expect(result).toEqual({
      status: "error",
      kind: "permission_denied",
      message: CAMERA_PERMISSION_DENIED_MESSAGE,
    });
  });

  it("treats a missing mediaDevices (no camera API at all) as camera_unavailable", async () => {
    const result = await requestEnvironmentCameraStream(undefined);

    expect(result).toEqual({
      status: "error",
      kind: "camera_unavailable",
      message: CAMERA_UNAVAILABLE_MESSAGE,
    });
  });
});

// ---- MediaStream cleanup ----
describe("camera stream cleanup", () => {
  it("stopMediaStreamTracks stops every track on the stream", () => {
    const trackA = { stop: vi.fn() };
    const trackB = { stop: vi.fn() };
    const fakeStream = { getTracks: () => [trackA, trackB] } as unknown as MediaStream;

    stopMediaStreamTracks(fakeStream);

    expect(trackA.stop).toHaveBeenCalledOnce();
    expect(trackB.stop).toHaveBeenCalledOnce();
  });

  it("does nothing (and does not throw) when there is no stream", () => {
    expect(() => stopMediaStreamTracks(undefined)).not.toThrow();
    expect(() => stopMediaStreamTracks(null)).not.toThrow();
  });

  it("PhotoCapturePanel stops camera tracks after capture, cancel, and unmount", () => {
    const cancelBlock = sliceBetween(
      photoCapturePanelSource,
      "const handleCancel = () =>",
      "useEffect(() =>",
    );
    const prepareBlock = sliceBetween(
      photoCapturePanelSource,
      "const preparePhotoForReview = async",
      "const handleChooseTakePhoto",
    );
    const unmountBlock = sliceBetween(
      photoCapturePanelSource,
      "return () => {\n      scanRequestIdRef.current += 1;",
      "  }, []);",
    );

    expect(cancelBlock).toContain("stopActiveStream()");
    expect(prepareBlock).toContain("stopActiveStream()");
    expect(unmountBlock).toContain("stopMediaStreamTracks(streamRef.current)");
  });
});

// ---- Captured photo file ----
describe("createCapturedPhotoFile", () => {
  it("the captured Blob/File has an image MIME type", () => {
    const blob = new Blob(["pretend jpeg bytes"], { type: "image/jpeg" });
    const file = createCapturedPhotoFile(blob, "camera-photo.jpg");

    expect(file).toBeInstanceOf(File);
    expect(file.type).toMatch(/^image\//);
    expect(file.type).toBe("image/jpeg");
    expect(file.name).toBe("camera-photo.jpg");
  });

  it("falls back to the default image MIME type if the blob has none", () => {
    const blob = new Blob(["pretend bytes"]);
    const file = createCapturedPhotoFile(blob);

    expect(file.type).toMatch(/^image\//);
    expect(file.type).toBe(CAPTURED_PHOTO_MIME_TYPE);
  });
});

// ---- Capture quality setting ----
describe("captured photo JPEG quality", () => {
  it("is high enough that a full-page letter is not destroyed by compression", () => {
    expect(CAPTURED_PHOTO_JPEG_QUALITY).toBeGreaterThanOrEqual(0.92);
    expect(CAPTURED_PHOTO_JPEG_QUALITY).toBeLessThanOrEqual(0.95);
  });
});

// ---- Document Capture Coach camera guidance ----
describe("document capture coach camera guidance copy", () => {
  it("defaults to a simple one-photo flow with no upfront scan-mode choice", () => {
    expect(PHOTO_TAKE_NEW_PHOTO_LABEL).toBe("Take a photo");
    expect(PHOTO_TAKE_NEW_PHOTO_DESCRIPTION).toBe(
      "Take one photo of the whole letter or message, then review the prepared scan before OCR.",
    );
  });

  it("keeps multi-photo only as an optional close-up follow-up, in plain language", () => {
    expect(PHOTO_ADD_CLOSE_UP_LABEL).toBe("Add close-up photo");
    expect(PHOTO_ADD_CLOSE_UP_DESCRIPTION).toBe(
      "If some text is missing or blurry, add a closer photo of that section.",
    );
    expect(PHOTO_RETAKE_PHOTO_LABEL).toBe("Retake photo");
  });

  it("shows the required simple camera guidance message", () => {
    expect(CAMERA_GUIDANCE_FIT_MESSAGE).toBe("Fit the whole page in the photo");
  });

  it("keeps the default flow as a single full-page photo with a simple label", () => {
    expect(getPhotoCaptureSectionTitle("full_page")).toBe(PHOTO_SECTION_FULL_PAGE_TITLE);
    expect(PHOTO_SECTION_FULL_PAGE_TITLE).toBe("Full page photo");
    expect(getCameraGuidanceFitMessage("full_page")).toBe("Fit the whole page in the photo");
    expect(getPhotoCaptureSectionLabel("full_page")).toBe(PHOTO_SECTION_FULL_PAGE_LABEL);
    expect(PHOTO_SECTION_FULL_PAGE_LABEL).toBe("Main photo");
  });

  it("guides the optional close-up photo without top/bottom-half naming", () => {
    expect(getPhotoCaptureSectionTitle("additional")).toBe(PHOTO_SECTION_ADDITIONAL_TITLE);
    expect(PHOTO_SECTION_ADDITIONAL_TITLE).toBe("Close-up photo");
    expect(getCameraGuidanceFitMessage("additional")).toBe(CAMERA_GUIDANCE_CLOSE_UP_MESSAGE);
    expect(CAMERA_GUIDANCE_CLOSE_UP_MESSAGE).toBe(
      "Take a clear close-up photo of the hard-to-read section.",
    );
    expect(getPhotoCaptureSectionLabel("additional")).toBe(PHOTO_SECTION_ADDITIONAL_LABEL);
    expect(PHOTO_SECTION_ADDITIONAL_LABEL).toBe("Close-up photo");
  });

  it("uses simple file names for captured photos, not numbered photo labels", () => {
    expect(getCapturedPhotoFileName("full_page")).toBe(CAPTURED_PHOTO_FILE_NAME);
    expect(CAPTURED_PHOTO_FILE_NAME).toBe("camera-photo.jpg");
    expect(getCapturedPhotoFileName("additional")).toBe(EXTRA_PHOTO_FILE_NAME);
    expect(EXTRA_PHOTO_FILE_NAME).toBe("extra-photo.jpg");
  });

  it("never shows forced two-photo or scan-mode wording anywhere in the camera-flow copy", () => {
    const allCopy = [
      PHOTO_TAKE_NEW_PHOTO_LABEL,
      PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
      PHOTO_ADD_CLOSE_UP_LABEL,
      PHOTO_ADD_CLOSE_UP_DESCRIPTION,
      PHOTO_RETAKE_PHOTO_LABEL,
      PHOTO_SECTION_FULL_PAGE_LABEL,
      PHOTO_SECTION_FULL_PAGE_TITLE,
      PHOTO_SECTION_ADDITIONAL_LABEL,
      PHOTO_SECTION_ADDITIONAL_TITLE,
      CAMERA_GUIDANCE_FIT_MESSAGE,
      CAMERA_GUIDANCE_CLOSE_UP_MESSAGE,
      PHOTO_TAKE_PHOTO_LABEL,
      PHOTO_USE_SCAN_LABEL,
      PHOTO_TRY_AGAIN_LABEL,
      PHOTO_CANCEL_LABEL,
      PHOTO_SCAN_REVIEW_QUESTION,
      PHOTO_NO_DOCUMENT_MESSAGE,
      PHOTO_UPLOAD_ANOTHER_LABEL,
    ];

    const forbiddenPatterns = [
      /Photo \d+ of \d+/i,
      /Photo \d+:/i,
      /\btop\s+half\b/i,
      /\bbottom\s+half\b/i,
      /\btake 2\b/i,
      /\btwo photos\b/i,
      /\bBest accuracy\b/i,
      /\bQuick scan\b/i,
      /\bscan mode\b/i,
      /\bconfidence\b/i,
      /\binside the guide\b/i,
    ];

    for (const message of allCopy) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("uses short, safe guidance copy", () => {
    const forbiddenPatterns = [
      /\bguaranteed?\b/i,
      /\bverified\b/i,
      /\bconfirmed\b/i,
      /\bvalid claim\b/i,
      /\binvalid claim\b/i,
      /\bpay this\b/i,
      /\bignore this\b/i,
    ];

    for (const message of [
      CAMERA_GUIDANCE_FIT_MESSAGE,
      CAMERA_GUIDANCE_CLOSE_UP_MESSAGE,
      PHOTO_SCAN_REVIEW_QUESTION,
      PHOTO_NO_DOCUMENT_MESSAGE,
    ]) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("keeps capture and review actions represented as large sticky mobile controls", () => {
    expect(CAMERA_PREVIEW_ACTIONS_CLASSNAME).toContain("sticky");
    expect(CAMERA_PREVIEW_ACTIONS_CLASSNAME).toContain("bottom-0");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("sticky");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("bottom-0");
    expect(photoCapturePanelSource).toContain("min-h-12");
  });

});

// ---- Capture resolution: intrinsic video size, not the CSS preview size ----
// This project's tests run without jsdom, so capturePhotoFromVideoElement is
// normally only exercised manually in the browser (it touches canvas/video).
// For this regression, a minimal fake `document`/canvas is enough to prove
// the canvas is sized from the video's own videoWidth/videoHeight.
describe("capturePhotoFromVideoElement uses the video's intrinsic resolution", () => {
  const withFakeDocument = async (
    run: (fakeCanvas: {
      width: number;
      height: number;
      drawImage: ReturnType<typeof vi.fn>;
      toBlobArgs: unknown[];
    }) => Promise<void>,
  ) => {
    const drawImage = vi.fn();
    let toBlobArgs: unknown[] = [];

    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (callback: (blob: Blob | null) => void, type: string, quality: number) => {
        toBlobArgs = [type, quality];
        callback(new Blob(["fake jpeg bytes"], { type }));
      },
    };

    vi.stubGlobal("document", {
      createElement: () => fakeCanvas,
    });

    try {
      await run({
        get width() {
          return fakeCanvas.width;
        },
        get height() {
          return fakeCanvas.height;
        },
        drawImage,
        get toBlobArgs() {
          return toBlobArgs;
        },
      });
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it("sizes the capture from video.videoWidth/videoHeight, not a smaller CSS preview size", async () => {
    await withFakeDocument(async (fakeCanvas) => {
      const fakeVideo = {
        videoWidth: 3024,
        videoHeight: 4032,
        clientWidth: 320,
        clientHeight: 427,
      } as unknown as HTMLVideoElement;

      await capturePhotoFromVideoElement(fakeVideo);

      expect(fakeCanvas.width).toBe(3024);
      expect(fakeCanvas.height).toBe(4032);
      expect(fakeCanvas.drawImage).toHaveBeenCalledWith(fakeVideo, 0, 0, 3024, 4032);
    });
  });

  it("captures at the required JPEG mime type and quality", async () => {
    await withFakeDocument(async (fakeCanvas) => {
      const fakeVideo = { videoWidth: 1920, videoHeight: 1080 } as unknown as HTMLVideoElement;

      await capturePhotoFromVideoElement(fakeVideo);

      expect(fakeCanvas.toBlobArgs).toEqual([CAPTURED_PHOTO_MIME_TYPE, CAPTURED_PHOTO_JPEG_QUALITY]);
    });
  });

  it("falls back to a high-resolution default only when videoWidth/videoHeight are unavailable", async () => {
    await withFakeDocument(async (fakeCanvas) => {
      const fakeVideo = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement;

      await capturePhotoFromVideoElement(fakeVideo);

      expect(fakeCanvas.width).toBe(1920);
      expect(fakeCanvas.height).toBe(1080);
    });
  });
});

// ---- Safety / local-first copy ----
describe("camera flow copy never implies a cloud upload, send, or contact", () => {
  const allMessages = [
    PHOTO_STAYS_LOCAL_MESSAGE,
    PHOTO_SCAN_REVIEW_QUESTION,
    PHOTO_NO_DOCUMENT_MESSAGE,
    CAMERA_PERMISSION_DENIED_MESSAGE,
    CAMERA_UNAVAILABLE_MESSAGE,
  ];

  const forbiddenPatterns = [
    /\bupload(ed|ing)? to\b/i,
    /\buploaded\b/i,
    /\bcloud\b/i,
    /\bsent\b/i,
    /\bsends?\b/i,
    /\bcontact(ed|ing)?\b/i,
    /\bguaranteed\b/i,
  ];

  it("no camera-flow message contains cloud/upload/send/contact wording", () => {
    for (const message of allMessages) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("explicitly states the photo stays in this browser", () => {
    expect(PHOTO_STAYS_LOCAL_MESSAGE).toBe("Photo stays in this browser in this version.");
  });
});

// ---- Terms gate compatibility ----
describe("the camera flow cannot be reached before the Terms & Safety gate is accepted", () => {
  const originalWindow = globalThis.window;

  class FakeLocalStorage implements Storage {
    private values = new Map<string, string>();
    get length() {
      return this.values.size;
    }
    clear() {
      this.values.clear();
    }
    getItem(key: string) {
      return this.values.get(key) ?? null;
    }
    key(index: number) {
      return Array.from(this.values.keys())[index] ?? null;
    }
    removeItem(key: string) {
      this.values.delete(key);
    }
    setItem(key: string, value: string) {
      this.values.set(key, value);
    }
  }

  it("a first-time user (no stored acceptance) has not accepted terms, so HomeView/PhotoCapturePanel would not render", () => {
    const localStorage = new FakeLocalStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
    });

    try {
      resetTermsAcceptance();
      expect(hasAcceptedCurrentTerms()).toBe(false);

      recordTermsAcceptance();
      expect(hasAcceptedCurrentTerms()).toBe(true);
    } finally {
      if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
        });
      }
    }
  });
});
