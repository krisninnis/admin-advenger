// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PhotoCapturePanel } from "../PhotoCapturePanel";
import {
  CAMERA_GUIDANCE_FIT_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_DETECTING_MESSAGE,
  PHOTO_EDIT_MANUALLY_LABEL,
  PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE,
  PHOTO_NO_DOCUMENT_MESSAGE,
  PHOTO_RETAKE_PHOTO_LABEL,
  PHOTO_SCAN_REVIEW_QUESTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_TRY_AGAIN_LABEL,
  PHOTO_UPLOAD_CLEARER_LABEL,
  PHOTO_USE_ORIGINAL_LABEL,
  PHOTO_USE_ORIGINAL_WARNING,
  PHOTO_UPLOAD_ANOTHER_LABEL,
  PHOTO_USE_SCAN_LABEL,
} from "../../lib/photoCapture";
import {
  IMAGE_TOO_LARGE_MESSAGE,
  ImageResourceSafetyError,
} from "../../lib/imageResourceSafety";

const { inspectImageResourceSafetyMock, scanDocumentFileMock } = vi.hoisted(() => ({
  inspectImageResourceSafetyMock: vi.fn(),
  scanDocumentFileMock: vi.fn(),
}));

vi.mock("../../lib/imageResourceSafety", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/imageResourceSafety")>()),
  inspectImageResourceSafety: inspectImageResourceSafetyMock,
}));

vi.mock("../../lib/documentScanner", () => ({
  scanDocumentFile: scanDocumentFileMock,
}));

const createObjectUrlMock = vi.fn((file: File) => `blob:${file.name}`);
const revokeObjectUrlMock = vi.fn();
const originalMediaDevices = navigator.mediaDevices;

beforeEach(() => {
  vi.clearAllMocks();
  inspectImageResourceSafetyMock.mockResolvedValue({ width: 1600, height: 2200 });

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrlMock,
  });

  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrlMock,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
});

const createReadyScanFixture = () => {
  const sourceFile = new File(
    ["original photo"],
    "council-letter.jpg",
    { type: "image/jpeg" },
  );

  const scannedFile = new File(
    ["prepared scan"],
    "council-letter-scanned.jpg",
    { type: "image/jpeg" },
  );

  scanDocumentFileMock.mockResolvedValue({
    status: "ready",
    sourceFile,
    scannedFile,
    sourceDimensions: {
      width: 1600,
      height: 2200,
    },
    quad: {
      topLeft: { x: 100, y: 100 },
      topRight: { x: 1500, y: 100 },
      bottomRight: { x: 1500, y: 2100 },
      bottomLeft: { x: 100, y: 2100 },
    },
    warnings: ["Check the scan before relying on it."],
  });

  return { scannedFile, sourceFile };
};

const createPendingScanFixture = () => {
  const sourceFile = new File(["original photo"], "pending-letter.jpg", {
    type: "image/jpeg",
  });
  let resolveScan: (value: Awaited<ReturnType<typeof scanDocumentFileMock>>) => void =
    () => undefined;

  scanDocumentFileMock.mockReturnValue(
    new Promise((resolve) => {
      resolveScan = resolve;
    }),
  );

  return { resolveScan, sourceFile };
};

const createPendingSafetyInspection = () => {
  let resolveInspection: (dimensions: { width: number; height: number }) => void = () => undefined;
  let rejectInspection: (error: Error) => void = () => undefined;

  inspectImageResourceSafetyMock.mockReturnValue(
    new Promise((resolve, reject) => {
      resolveInspection = resolve;
      rejectInspection = reject;
    }),
  );

  return { rejectInspection, resolveInspection };
};

const createRejectedScanFixture = () => {
  const sourceFile = new File(["original cluttered photo"], "synthetic-letter-scene.jpg", {
    type: "image/jpeg",
  });

  scanDocumentFileMock.mockResolvedValue({
    status: "rejected",
    sourceFile,
    sourceDimensions: {
      width: 1600,
      height: 2200,
    },
    code: "too_much_background",
    message: PHOTO_NO_DOCUMENT_MESSAGE,
    warnings: [],
  });

  return { sourceFile };
};

const createCameraFixture = () => {
  const stopTrack = vi.fn();
  const stream = {
    getTracks: () => [{ stop: stopTrack }],
  } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  return { getUserMedia, stopTrack, stream };
};

const installCanvasCapture = () => {
  const drawImage = vi.fn();

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback: BlobCallback, type?: string) => {
      callback(new Blob(["captured photo"], { type: type ?? "image/jpeg" }));
    },
  );

  return { drawImage };
};

const installPendingCanvasCapture = () => {
  const drawImage = vi.fn();
  let resolveCapture: () => void = () => undefined;

  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback: BlobCallback, type?: string) => {
      resolveCapture = () => callback(new Blob(["captured photo"], { type: type ?? "image/jpeg" }));
    },
  );

  return {
    drawImage,
    resolveCapture: () => resolveCapture(),
  };
};

const chooseTakePhoto = async () => {
  const choiceLabel = screen.getByText(PHOTO_TAKE_NEW_PHOTO_LABEL);
  const choiceButton = choiceLabel.closest("button");

  expect(choiceButton).toBeTruthy();
  await userEvent.click(choiceButton as HTMLButtonElement);
};

const setVideoIntrinsicDimensions = (width: number, height: number) => {
  const video = document.querySelector("video");
  expect(video).toBeTruthy();
  Object.defineProperty(video, "videoWidth", { configurable: true, value: width });
  Object.defineProperty(video, "videoHeight", { configurable: true, value: height });
};

const createVideoTrackCameraFixture = () => {
  const stopTrack = vi.fn();
  const videoTrack = { stop: stopTrack };
  const stream = {
    getTracks: () => [videoTrack],
    getVideoTracks: () => [videoTrack],
  } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });

  return { getUserMedia, stopTrack, stream, videoTrack };
};

describe("PhotoCapturePanel rendered scan confirmation", () => {
  it("does not request camera permission on page load", () => {
    const { getUserMedia } = createCameraFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText(PHOTO_UPLOAD_ANOTHER_LABEL.replace("another ", "existing "))).toBeTruthy();
  });

  it("shows an unobstructed live camera preview with text guidance and no fixed A4 guide", async () => {
    const { getUserMedia } = createCameraFixture();
    const { container } = render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(CAMERA_GUIDANCE_FIT_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL })).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL })).toBeTruthy();
    expect(container.querySelector("[data-capture-guide]")).toBeNull();
    expect(container.querySelector("[data-testid='camera-lab-a4-guide']")).toBeNull();
    expect(screen.queryByText(/inside the guide/i)).toBeNull();
  });

  it("keeps manual capture available without requiring A4 readiness", async () => {
    createCameraFixture();
    installCanvasCapture();
    const { scannedFile } = createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_SCAN_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledWith([
      expect.objectContaining({
        file: scannedFile,
        isDocumentScan: true,
      }),
    ]);
  });

  it("still shows document-analysis status while preparing the scan", async () => {
    const { resolveScan, sourceFile } = createPendingScanFixture();

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(PHOTO_DETECTING_MESSAGE)).toBeTruthy();

    resolveScan({
      status: "rejected",
      code: "no_document",
      message: "No clear document.",
      sourceDimensions: { width: 1200, height: 800 },
      warnings: [],
    });

    expect(await screen.findByText("We couldn\u2019t find a clear document in this photo.")).toBeTruthy();
  });

  it("does not OCR the original photo when document detection fails", async () => {
    const { sourceFile } = createRejectedScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(PHOTO_NO_DOCUMENT_MESSAGE)).toBeTruthy();
    expect(screen.getByText(PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE)).toBeTruthy();
    expect(screen.getByText(PHOTO_USE_ORIGINAL_WARNING)).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_RETAKE_PHOTO_LABEL })).toBeTruthy();
    expect(screen.getByText(PHOTO_UPLOAD_CLEARER_LABEL)).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_USE_ORIGINAL_LABEL })).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_EDIT_MANUALLY_LABEL })).toBeTruthy();
    expect(onUsePhotos).not.toHaveBeenCalled();
  });

  it("only sends the original photo to OCR after explicit warned approval", async () => {
    const { sourceFile } = createRejectedScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(PHOTO_NO_DOCUMENT_MESSAGE);
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_ORIGINAL_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledTimes(1);
    expect(onUsePhotos).toHaveBeenCalledWith([
      expect.objectContaining({
        file: sourceFile,
        section: "full_page",
        warnings: [PHOTO_USE_ORIGINAL_WARNING],
        isDocumentScan: false,
        sourceFileName: "synthetic-letter-scene.jpg",
      }),
    ]);
  });

  it("keeps the prepared-scan review free of guide overlays", async () => {
    const { sourceFile } = createReadyScanFixture();
    const { container } = render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION)).toBeTruthy();
    expect(screen.getByAltText("Prepared document scan preview")).toBeTruthy();
    expect(container.querySelector("[data-capture-guide]")).toBeNull();
    expect(container.querySelector("[data-testid='camera-lab-a4-guide']")).toBeNull();
  });

  it("stops camera tracks after cancel", async () => {
    const { stopTrack } = createCameraFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL });
    await userEvent.click(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL }));

    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("stops camera tracks after successful capture", async () => {
    const { stopTrack } = createCameraFixture();
    installCanvasCapture();
    createReadyScanFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
  });

  it("stops camera tracks after unmount", async () => {
    const { stopTrack } = createCameraFixture();
    const { unmount } = render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL });

    unmount();

    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("does not hand a prepared scan to OCR until the user confirms it", async () => {
    const { scannedFile, sourceFile } = createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(scanDocumentFileMock).toHaveBeenCalledWith(sourceFile);
    });

    expect(
      await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION),
    ).toBeTruthy();

    expect(
      screen.getByAltText("Prepared document scan preview"),
    ).toBeTruthy();

    expect(onUsePhotos).not.toHaveBeenCalled();

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: PHOTO_USE_SCAN_LABEL,
      }),
    );

    expect(onUsePhotos).toHaveBeenCalledTimes(1);

    expect(onUsePhotos).toHaveBeenCalledWith([
      expect.objectContaining({
        file: scannedFile,
        section: "full_page",
        warnings: ["Check the scan before relying on it."],
        isDocumentScan: true,
        sourceFileName: "council-letter.jpg",
      }),
    ]);
  });

  it("does not hand a prepared scan to OCR when the user chooses to try again", async () => {
    const { sourceFile } = createReadyScanFixture();
    const onTryAgain = vi.fn();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
        onTryAgain={onTryAgain}
      />,
    );

    await waitFor(() => {
      expect(scanDocumentFileMock).toHaveBeenCalledWith(sourceFile);
    });

    expect(
      await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION),
    ).toBeTruthy();

    expect(onUsePhotos).not.toHaveBeenCalled();

    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: PHOTO_TRY_AGAIN_LABEL,
      }),
    );

    expect(onTryAgain).toHaveBeenCalledTimes(1);
    expect(onUsePhotos).not.toHaveBeenCalled();
  });

  it("rejects unsafe image dimensions before preview or document scanning", async () => {
    const sourceFile = new File(["compressed oversized image"], "huge.jpg", {
      type: "image/jpeg",
    });
    inspectImageResourceSafetyMock.mockRejectedValue(
      new ImageResourceSafetyError("excessive_width", IMAGE_TOO_LARGE_MESSAGE),
    );

    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect((await screen.findByRole("alert")).textContent).toContain(
      IMAGE_TOO_LARGE_MESSAGE,
    );
    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(scanDocumentFileMock).not.toHaveBeenCalled();
  });
});

// ---- Fail-closed production capture from the visible video frame ----
describe("PhotoCapturePanel production video-frame capture", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const installImageCapture = (target: {
    resolve: (blob: Blob) => void;
    reject: (reason: Error) => void;
  }) => {
    const takePhoto = vi.fn(
      () =>
        new Promise<Blob>((resolve, reject) => {
          target.resolve = resolve;
          target.reject = reject;
        }),
    );
    class FakeImageCapture {
      readonly takePhoto = takePhoto;
      constructor(_track: MediaStreamTrack) {}
    }

    vi.stubGlobal("ImageCapture", FakeImageCapture);

    return { takePhoto };
  };

  const installThrowingImageCapture = (error: Error) => {
    class FakeImageCapture {
      constructor(_track: MediaStreamTrack) {
        throw error;
      }
    }

    vi.stubGlobal("ImageCapture", FakeImageCapture);
  };

  const installRejectingImageCapture = () => {
    const takePhoto = vi.fn().mockRejectedValue(new Error("camera busy"));
    class FakeImageCapture {
      readonly takePhoto = takePhoto;
      constructor(_track: MediaStreamTrack) {}
    }

    vi.stubGlobal("ImageCapture", FakeImageCapture);

    return { takePhoto };
  };

  it("uses the visible intrinsic video frame even when ImageCapture is available", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { drawImage } = installCanvasCapture();
    createVideoTrackCameraFixture();
    createReadyScanFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    setVideoIntrinsicDimensions(1080, 1920);
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    expect(takePhoto).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledWith(expect.any(HTMLVideoElement), 0, 0, 1080, 1920);
    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
  });

  it("feeds the visible canvas frame through the existing review flow when ImageCapture is available", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    setVideoIntrinsicDimensions(1600, 2200);
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    expect(takePhoto).not.toHaveBeenCalled();

    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    const capturedFile = scanDocumentFileMock.mock.calls[0][0] as File;
    expect(inspectImageResourceSafetyMock).toHaveBeenCalledTimes(1);
    expect(inspectImageResourceSafetyMock).toHaveBeenCalledWith(capturedFile);
    expect(capturedFile.name).toBe("camera-photo.jpg");
    expect(capturedFile.type).toBe("image/jpeg");
    expect(await capturedFile.text()).toBe("captured photo");
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_SCAN_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("does not construct ImageCapture even when its constructor would throw", async () => {
    installThrowingImageCapture(new Error("not supported"));
    const { drawImage } = installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    expect(screen.queryByRole("alert")).toBeNull();
    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    const capturedFile = scanDocumentFileMock.mock.calls[0][0] as File;
    expect(capturedFile.name).toBe("camera-photo.jpg");
    expect(capturedFile.type).toBe("image/jpeg");
    expect(await capturedFile.text()).toBe("captured photo");
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_SCAN_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("never requests a potentially wider ImageCapture still and sends one canvas frame to the scanner", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { drawImage } = installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();

    inspectImageResourceSafetyMock
      .mockResolvedValueOnce({ width: 4000, height: 2250 })
      .mockResolvedValueOnce({ width: 1080, height: 1920 });

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    setVideoIntrinsicDimensions(1080, 1920);
    const shutter = await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL });
    fireEvent.click(shutter);
    fireEvent.click(shutter);

    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(takePhoto).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    const capturedFile = scanDocumentFileMock.mock.calls[0][0] as File;
    expect(await capturedFile.text()).toBe("captured photo");
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("uses JPEG canvas output without requesting any ImageCapture candidate format", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { drawImage } = installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(takePhoto).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    const capturedFile = scanDocumentFileMock.mock.calls[0][0] as File;
    expect(capturedFile.name).toBe("camera-photo.jpg");
    expect(capturedFile.type).toBe("image/jpeg");
    expect(await capturedFile.text()).toBe("captured photo");
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("uses canvas without invoking a rejecting ImageCapture implementation", async () => {
    const { takePhoto } = installRejectingImageCapture();
    const { drawImage } = installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));

    expect(screen.queryByRole("alert")).toBeNull();
    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(takePhoto).not.toHaveBeenCalled();
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_SCAN_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("guards a rapid double shutter press and performs at most one canvas capture", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { drawImage } = installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    const shutter = await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL });
    fireEvent.click(shutter);
    fireEvent.click(shutter);

    expect(takePhoto).not.toHaveBeenCalled();
    expect((shutter as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    await screen.findByText(PHOTO_SCAN_REVIEW_QUESTION);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(scanDocumentFileMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_SCAN_LABEL }));

    expect(onUsePhotos).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("ignores a late canvas result after cancel and stops the camera track", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { resolveCapture } = installPendingCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    expect(takePhoto).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL }));
    expect(stopTrack).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCapture();
      await Promise.resolve();
    });

    expect(scanDocumentFileMock).not.toHaveBeenCalled();
    expect(screen.queryByText(PHOTO_SCAN_REVIEW_QUESTION)).toBeNull();
    expect(onUsePhotos).not.toHaveBeenCalled();
  });

  it("ignores a late canvas result after unmount and stops the camera track", async () => {
    const target = { resolve: (_blob: Blob) => undefined, reject: (_e: Error) => undefined };
    const { takePhoto } = installImageCapture(target);
    const { resolveCapture } = installPendingCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();
    const onUsePhotos = vi.fn();

    const { unmount } = render(
      <PhotoCapturePanel
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    expect(takePhoto).not.toHaveBeenCalled();

    unmount();
    expect(stopTrack).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCapture();
      await Promise.resolve();
    });

    expect(scanDocumentFileMock).not.toHaveBeenCalled();
    expect(onUsePhotos).not.toHaveBeenCalled();
  });

  it("ignores a safety inspection that resolves after cancel", async () => {
    const { resolveInspection } = createPendingSafetyInspection();
    installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    await waitFor(() => expect(inspectImageResourceSafetyMock).toHaveBeenCalledTimes(1));
    expect(stopTrack).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL }));
    await act(async () => {
      resolveInspection({ width: 1600, height: 2200 });
      await Promise.resolve();
    });

    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(scanDocumentFileMock).not.toHaveBeenCalled();
    expect(screen.queryByText(PHOTO_SCAN_REVIEW_QUESTION)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("ignores a safety inspection that resolves after unmount", async () => {
    const { resolveInspection } = createPendingSafetyInspection();
    installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();

    const { unmount } = render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    await waitFor(() => expect(inspectImageResourceSafetyMock).toHaveBeenCalledTimes(1));
    expect(stopTrack).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      resolveInspection({ width: 1600, height: 2200 });
      await Promise.resolve();
    });

    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(scanDocumentFileMock).not.toHaveBeenCalled();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it("ignores a safety inspection error that arrives after cancel", async () => {
    const { rejectInspection } = createPendingSafetyInspection();
    installCanvasCapture();
    const { stopTrack } = createVideoTrackCameraFixture();
    createReadyScanFixture();

    render(
      <PhotoCapturePanel
        onUsePhotos={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    await waitFor(() => expect(inspectImageResourceSafetyMock).toHaveBeenCalledTimes(1));
    expect(stopTrack).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL }));
    await act(async () => {
      rejectInspection(new Error("late inspection failure"));
      await Promise.resolve();
    });

    expect(createObjectUrlMock).not.toHaveBeenCalled();
    expect(scanDocumentFileMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});
