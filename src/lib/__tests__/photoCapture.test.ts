import { describe, expect, it, vi } from "vitest";
import {
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_UNAVAILABLE_MESSAGE,
  CAPTURED_PHOTO_MIME_TYPE,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_UNREADABLE_FALLBACK_MESSAGE,
  classifyCameraError,
  createCapturedPhotoFile,
  getCameraErrorMessage,
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

// ---- Panel state model ----
// PhotoCapturePanel always mounts starting from "choice" (it is only ever
// rendered while HomeView's showPhotoCapturePanel is true), so "opening the
// photo panel" is modelled as photoCaptureReducer(<any stage>, { type: "open" })
// resolving to "choice", exactly like clicking the mode-card button does.
describe("photo capture panel state model", () => {
  it("opening the panel (clicking the photo option) resolves to the choice stage", () => {
    expect(photoCaptureReducer("closed", { type: "open" })).toBe("choice");
    expect(photoCaptureReducer("captured", { type: "open" })).toBe("choice");
  });

  it("choosing 'Take a new photo' moves to requesting the camera", () => {
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

  it("taking the photo moves from camera_preview to captured", () => {
    expect(photoCaptureReducer("camera_preview", { type: "photo_captured" })).toBe("captured");
  });

  it("retaking from captured goes back to requesting_camera, allowing another capture", () => {
    expect(photoCaptureReducer("captured", { type: "retake" })).toBe("requesting_camera");
  });

  it("cancelling from any stage closes the panel", () => {
    const stages: PhotoCaptureStage[] = [
      "choice",
      "requesting_camera",
      "camera_preview",
      "captured",
      "permission_denied",
      "camera_unavailable",
    ];

    for (const stage of stages) {
      expect(photoCaptureReducer(stage, { type: "cancel" })).toBe("closed");
    }
  });

  it("using the captured photo closes the panel", () => {
    expect(photoCaptureReducer("captured", { type: "use_photo" })).toBe("closed");
  });

  it("only the camera_preview stage is considered to have an active camera stream", () => {
    expect(stageHasActiveCameraStream("camera_preview")).toBe(true);
    expect(stageHasActiveCameraStream("choice")).toBe(false);
    expect(stageHasActiveCameraStream("captured")).toBe(false);
    expect(stageHasActiveCameraStream("requesting_camera")).toBe(false);
  });

  it("the upload-existing-photo fallback is available on choice and on both error stages", () => {
    expect(stageShowsUploadFallback("choice")).toBe(true);
    expect(stageShowsUploadFallback("permission_denied")).toBe(true);
    expect(stageShowsUploadFallback("camera_unavailable")).toBe(true);
    expect(stageShowsUploadFallback("camera_preview")).toBe(false);
    expect(stageShowsUploadFallback("captured")).toBe(false);
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

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: "environment" } });
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
describe("stopMediaStreamTracks", () => {
  it("cancelling stops every track on the stream", () => {
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

// ---- Safety / local-first copy ----
describe("camera flow copy never implies a cloud upload, send, or contact", () => {
  const allMessages = [
    PHOTO_STAYS_LOCAL_MESSAGE,
    PHOTO_UNREADABLE_FALLBACK_MESSAGE,
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

  it("is honest that photos may not always be readable, without promising OCR success", () => {
    expect(PHOTO_UNREADABLE_FALLBACK_MESSAGE).toBe(
      "If the photo cannot be read clearly, upload a clearer image or paste the text manually.",
    );
  });
});

// ---- Terms gate compatibility ----
describe("the camera flow cannot be reached before the Terms & Safety gate is accepted", () => {
  // PhotoCapturePanel only ever mounts inside HomeView, and HomeView is only
  // rendered by App.tsx once hasAcceptedCurrentTerms() is true (see the
  // `if (!hasAcceptedTerms) return <TermsSafetyGate mode="blocking" ... />`
  // early return in App.tsx, above where <HomeView /> is rendered). So the
  // camera flow is gated by construction, not by any check inside the photo
  // capture code itself - this test pins down the underlying gate function
  // that guarantees that, specifically for a first-time user.
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
