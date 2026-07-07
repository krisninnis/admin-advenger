import { describe, expect, it, vi } from "vitest";
import {
  A4_PORTRAIT_RATIO,
  CAMERA_GUIDANCE_FRAME_CLASSNAME,
  CAMERA_GUIDANCE_FIT_MESSAGE,
  CAMERA_GUIDANCE_TIPS,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_UNAVAILABLE_MESSAGE,
  CAPTURED_PHOTO_JPEG_QUALITY,
  CAPTURED_PHOTO_MIME_TYPE,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_PRIMARY_RETAKE_BUTTON_CLASSNAME,
  PHOTO_PRIMARY_USE_BUTTON_CLASSNAME,
  PHOTO_RETAKE_RECOMMENDED_LABEL,
  PHOTO_REVIEW_ACTIONS_CLASSNAME,
  PHOTO_REVIEW_CONTENT_CLASSNAME,
  PHOTO_REVIEW_WARNING_CLASSNAME,
  PHOTO_CROP_FAILED_MESSAGE,
  PHOTO_CROPPED_TO_FRAME_MESSAGE,
  PHOTO_SECONDARY_USE_BUTTON_CLASSNAME,
  PHOTO_READS_INSIDE_FRAME_MESSAGE,
  PHOTO_UNREADABLE_FALLBACK_MESSAGE,
  PHOTO_USE_ANYWAY_LABEL,
  PHOTO_USE_THIS_PHOTO_LABEL,
  capturePhotoFromVideoElement,
  cropImageBlobToRect,
  classifyCameraError,
  createCapturedPhotoFile,
  getA4GuideCropRect,
  getCropRectPixelAspectRatio,
  getCameraErrorMessage,
  isCropRectSafe,
  isCameraCaptureSupported,
  mapDisplayedFrameToImageCrop,
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

    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
        width: { ideal: CAMERA_IDEAL_WIDTH },
        height: { ideal: CAMERA_IDEAL_HEIGHT },
      },
    });
  });

  // Intentional change from v1 (previously asserted `{ video: { facingMode:
  // "environment" } }` with no resolution hint at all). Full-page letters
  // were coming out too small/compressed to OCR reliably on mobile, so the
  // stream request now also asks for an ideal 1920x1080 - these are "ideal"
  // constraints, so a device that cannot do 1080p still gets a stream at its
  // best available resolution rather than failing.
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

// ---- Capture frame crop ----
describe("A4 guide-frame crop", () => {
  it("returns a centred portrait A4 crop rectangle", () => {
    const rect = getA4GuideCropRect(1200, 2000);
    const pixelRatio = (rect.width * 1200) / (rect.height * 2000);

    expect(pixelRatio).toBeCloseTo(A4_PORTRAIT_RATIO, 3);
    expect(rect.x + rect.width / 2).toBeCloseTo(0.5, 5);
    expect(rect.y + rect.height / 2).toBeCloseTo(0.5, 5);
  });

  it("keeps the crop rectangle within image bounds", () => {
    const testSizes = [
      [1200, 2000],
      [2000, 1200],
      [500, 500],
      [0, 0],
    ];

    for (const [width, height] of testSizes) {
      const rect = getA4GuideCropRect(width, height);
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(1);
      expect(rect.y + rect.height).toBeLessThanOrEqual(1);
    }
  });

  it("rejects too-narrow strip crops", () => {
    expect(isCropRectSafe({ x: 0.45, y: 0.1, width: 0.1, height: 0.8 }, 1200, 2000)).toBe(false);
  });

  it("rejects crops that remove too much of the source image", () => {
    expect(isCropRectSafe({ x: 0.2, y: 0.3, width: 0.5, height: 0.4 }, 1200, 2000)).toBe(false);
  });

  it("accepts a safe A4-ish portrait crop", () => {
    const rect = { x: 0.1, y: 0.08, width: 0.8, height: 0.84 };
    expect(getCropRectPixelAspectRatio(rect, 1200, 1600)).toBeCloseTo(0.714, 3);
    expect(isCropRectSafe(rect, 1200, 1600)).toBe(true);
  });

  it("maps a centred visible guide frame through object-fit contain", () => {
    const rect = mapDisplayedFrameToImageCrop({
      mediaRect: { left: 0, top: 0, width: 300, height: 500 },
      frameRect: { left: 16, top: 60, width: 268, height: 380 },
      naturalWidth: 1200,
      naturalHeight: 2000,
      objectFit: "contain",
    });

    expect(rect).not.toBeNull();
    expect(rect?.x).toBeCloseTo(0.05, 2);
    expect(rect?.y).toBeCloseTo(0.12, 2);
    expect(rect?.width).toBeCloseTo(0.89, 2);
    expect(rect?.height).toBeCloseTo(0.76, 2);
  });

  it("returns null for impossible or unsafe display-frame geometry", () => {
    expect(
      mapDisplayedFrameToImageCrop({
        mediaRect: { left: 0, top: 0, width: 300, height: 500 },
        frameRect: { left: 140, top: 50, width: 20, height: 420 },
        naturalWidth: 1200,
        naturalHeight: 2000,
        objectFit: "contain",
      }),
    ).toBeNull();

    expect(
      mapDisplayedFrameToImageCrop({
        mediaRect: { left: 0, top: 0, width: 0, height: 500 },
        frameRect: { left: 0, top: 0, width: 100, height: 300 },
        naturalWidth: 1200,
        naturalHeight: 2000,
        objectFit: "contain",
      }),
    ).toBeNull();
  });

  const withFakeImageCanvas = async (
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
        callback(new Blob(["cropped"], { type }));
      },
    };

    class FakeImage {
      naturalWidth = 1200;
      naturalHeight = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("document", {
      createElement: () => fakeCanvas,
    });
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake-photo"),
      revokeObjectURL: vi.fn(),
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

  it("crops to a Blob and preserves the image MIME type where possible", async () => {
    await withFakeImageCanvas(async (fakeCanvas) => {
      const source = new Blob(["full photo"], { type: "image/jpeg" });
      const blob = await cropImageBlobToRect(source, getA4GuideCropRect(1200, 2000));

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");
      expect(fakeCanvas.toBlobArgs[0]).toBe("image/jpeg");
    });
  });

  it("refuses to crop to an unsafe thin strip", async () => {
    await withFakeImageCanvas(async () => {
      const source = new Blob(["full photo"], { type: "image/jpeg" });

      await expect(
        cropImageBlobToRect(source, { x: 0.49, y: 0.05, width: 0.02, height: 0.9 }),
      ).rejects.toThrow("safely");
    });
  });

  it("draws only the centred guide-frame area to the crop canvas", async () => {
    await withFakeImageCanvas(async (fakeCanvas) => {
      const source = new Blob(["full photo"], { type: "image/jpeg" });
      await cropImageBlobToRect(source, getA4GuideCropRect(1200, 2000));

      expect(fakeCanvas.width).toBeGreaterThan(0);
      expect(fakeCanvas.height).toBeGreaterThan(0);
      expect(fakeCanvas.width / fakeCanvas.height).toBeCloseTo(A4_PORTRAIT_RATIO, 2);
      expect(fakeCanvas.drawImage).toHaveBeenCalledOnce();
      expect(fakeCanvas.drawImage.mock.calls[0][1]).toBeGreaterThan(0);
      expect(fakeCanvas.drawImage.mock.calls[0][2]).toBeGreaterThan(0);
    });
  });
});

// ---- Capture quality setting ----
// capturePhotoFromVideoElement itself touches canvas/video (DOM-only, so it
// is exercised manually per the comment in photoCapture.ts) - but the actual
// quality number it passes to canvas.toBlob is exported as a plain constant
// specifically so a regression back to a low/default JPEG quality (the root
// cause of the too-compressed, hard-to-OCR captures reported on mobile) is
// caught here without needing a DOM.
describe("captured photo JPEG quality", () => {
  it("is high enough that a full-page letter is not destroyed by compression", () => {
    expect(CAPTURED_PHOTO_JPEG_QUALITY).toBeGreaterThanOrEqual(0.92);
    expect(CAPTURED_PHOTO_JPEG_QUALITY).toBeLessThanOrEqual(0.95);
  });
});

// ---- Document Capture Coach live guidance ----
describe("document capture coach live guidance copy", () => {
  it("shows the required frame guidance message", () => {
    expect(CAMERA_GUIDANCE_FIT_MESSAGE).toBe("Fill the frame with the letter");
  });

  it("shows the required mobile capture tips", () => {
    expect(CAMERA_GUIDANCE_TIPS).toEqual([
      "Anything outside the frame may be ignored",
      "Move closer until the letter nearly fills the frame",
      "Move closer if the text is small",
      "Use good light",
      "Keep the page flat",
      "Avoid shadows",
    ]);
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

    for (const message of [CAMERA_GUIDANCE_FIT_MESSAGE, ...CAMERA_GUIDANCE_TIPS]) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("represents the guide frame as a portrait A4-style target", () => {
    expect(CAMERA_GUIDANCE_FRAME_CLASSNAME).toContain("aspect-[1/1.414]");
    expect(CAMERA_GUIDANCE_FRAME_CLASSNAME).toContain("left-1/2");
    expect(CAMERA_GUIDANCE_FRAME_CLASSNAME).toContain("top-1/2");
  });

  it("keeps capture and review actions represented as sticky mobile controls", () => {
    expect(CAMERA_PREVIEW_ACTIONS_CLASSNAME).toContain("sticky");
    expect(CAMERA_PREVIEW_ACTIONS_CLASSNAME).toContain("bottom-0");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("sticky");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("bottom-0");
  });

  it("has explicit labels for retake recommendation while keeping use-photo available", () => {
    expect(PHOTO_RETAKE_RECOMMENDED_LABEL).toBe("Retake recommended");
    expect(PHOTO_USE_THIS_PHOTO_LABEL).toBe("Use this photo");
    expect(PHOTO_USE_ANYWAY_LABEL).toBe("Use anyway");
  });

  it("makes Retake recommended the primary action for poor photos", () => {
    expect(PHOTO_PRIMARY_RETAKE_BUTTON_CLASSNAME).toContain("bg-amber-300");
    expect(PHOTO_PRIMARY_RETAKE_BUTTON_CLASSNAME).not.toContain("border border-white/10");
    expect(PHOTO_SECONDARY_USE_BUTTON_CLASSNAME).toContain("border border-white/10");
    expect(PHOTO_SECONDARY_USE_BUTTON_CLASSNAME).not.toContain("bg-emerald-400");
  });

  it("keeps Use this photo primary for good or okay photos", () => {
    expect(PHOTO_PRIMARY_USE_BUTTON_CLASSNAME).toContain("bg-emerald-400");
    expect(PHOTO_PRIMARY_USE_BUTTON_CLASSNAME).not.toContain("border border-white/10");
  });

  it("keeps the warning panel in scrollable content before the sticky action row", () => {
    expect(PHOTO_REVIEW_CONTENT_CLASSNAME).toContain("overflow-y-auto");
    expect(PHOTO_REVIEW_CONTENT_CLASSNAME).not.toContain("sticky");
    expect(PHOTO_REVIEW_WARNING_CLASSNAME).not.toContain("sticky");
    expect(PHOTO_REVIEW_ACTIONS_CLASSNAME).toContain("sticky");
  });
});

// ---- Capture resolution: intrinsic video size, not the CSS preview size ----
// This project's tests run without jsdom, so capturePhotoFromVideoElement is
// normally only exercised manually in the browser (it touches canvas/video).
// For this one regression - "captures came out smaller than the real camera
// frame" - a minimal fake `document`/canvas is stubbed in just for this test,
// which is enough to prove the canvas is sized from the video's own
// videoWidth/videoHeight (the real camera frame) and not some other,
// potentially-smaller, CSS-driven size.
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
      // A video whose real camera frame (videoWidth/videoHeight) is much
      // larger than however small the <video> preview element happens to be
      // rendered on screen - capture must follow the former, not the latter.
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
    PHOTO_UNREADABLE_FALLBACK_MESSAGE,
    PHOTO_CROPPED_TO_FRAME_MESSAGE,
    PHOTO_READS_INSIDE_FRAME_MESSAGE,
    PHOTO_CROP_FAILED_MESSAGE,
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
