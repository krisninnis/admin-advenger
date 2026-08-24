// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PhotoCapturePanel } from "../PhotoCapturePanel";
import {
  CAMERA_GUIDANCE_FIT_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_USE_ORIGINAL_LABEL,
  PHOTO_USE_ORIGINAL_WARNING,
} from "../../lib/photoCapture";
import type { DocumentScannerEngine } from "../../lib/documentScannerV2";

const sourceFile = new File(["original photo"], "council-letter.jpg", {
  type: "image/jpeg",
});
const scannedFile = new File(["prepared scan"], "scan-clean-council-letter.jpg", {
  type: "image/jpeg",
});
const detectedQuad = {
  topLeft: { x: 100, y: 120 },
  topRight: { x: 1500, y: 100 },
  bottomRight: { x: 1480, y: 2100 },
  bottomLeft: { x: 120, y: 2120 },
};

const { prepareMock, renderMock, detectPixelsMock, getDocumentScannerEngineMock } = vi.hoisted(
  () => ({
    prepareMock: vi.fn(),
    renderMock: vi.fn(),
    detectPixelsMock: vi.fn(),
    getDocumentScannerEngineMock: vi.fn(),
  }),
);

vi.mock("../../lib/documentScannerV2", async () => {
  const actual = await vi.importActual<typeof import("../../lib/documentScannerV2")>(
    "../../lib/documentScannerV2",
  );
  return {
    ...actual,
    getDocumentScannerEngine: getDocumentScannerEngineMock,
  };
});

const createObjectUrlMock = vi.fn((file: File) => `blob:${file.name}:${Math.random()}`);
const revokeObjectUrlMock = vi.fn();
const originalMediaDevices = navigator.mediaDevices;

const readyPreparation = {
  sourceFile,
  sourceDimensions: { width: 1600, height: 2200 },
  quad: detectedQuad,
  detectedQuad,
  detection: {
    status: "detected" as const,
    quad: detectedQuad,
    areaRatio: 0.8,
    documentPixelRatio: 0.6,
    warnings: [],
  },
  warnings: ["Check the scan before relying on it."],
};

const installEngine = (overrides: Partial<DocumentScannerEngine> = {}) => {
  const engine: DocumentScannerEngine = {
    id: "test-engine",
    status: "provisional_pending_device_acceptance",
    detectPixels: detectPixelsMock,
    prepare: prepareMock,
    render: renderMock,
    ...overrides,
  };
  getDocumentScannerEngineMock.mockResolvedValue(engine);
  return engine;
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectUrlMock,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectUrlMock,
  });
  prepareMock.mockResolvedValue(readyPreparation);
  renderMock.mockResolvedValue(scannedFile);
  detectPixelsMock.mockReturnValue({
    status: "rejected",
    code: "no_document_detected",
    message: "No document detected",
    warnings: [],
  });
  installEngine();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: originalMediaDevices,
  });
});

const createCameraFixture = () => {
  const stopTrack = vi.fn();
  const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { getUserMedia, stopTrack };
};

const installCanvasCapture = () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback: BlobCallback, type?: string) => {
      callback(new Blob(["captured photo"], { type: type ?? "image/jpeg" }));
    },
  );
};

const chooseTakePhoto = async () => {
  const choiceButton = screen.getByText(PHOTO_TAKE_NEW_PHOTO_LABEL).closest("button");
  expect(choiceButton).toBeTruthy();
  await userEvent.click(choiceButton as HTMLButtonElement);
};

describe("PhotoCapturePanel scanner v2", () => {
  it("does not request camera permission on page load", () => {
    const { getUserMedia } = createCameraFixture();
    render(<PhotoCapturePanel onUsePhotos={vi.fn()} onClose={vi.fn()} />);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Scan a document" })).toBeTruthy();
    expect(screen.getByText("Upload existing photo")).toBeTruthy();
  });

  it("keeps manual capture available with live document guidance", async () => {
    const { getUserMedia } = createCameraFixture();
    render(<PhotoCapturePanel onUsePhotos={vi.fn()} onClose={vi.fn()} />);
    await chooseTakePhoto();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(CAMERA_GUIDANCE_FIT_MESSAGE)).toBeTruthy();
    expect(screen.getByText(/Finding the page/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL })).toBeTruthy();
  });

  it("requires crop review and explicit Use scan before OCR handoff", async () => {
    const onUsePhotos = vi.fn();
    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Check the edges" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Top left corner" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset corners" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use full image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Original / Colour" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clean" })).toHaveAttribute("aria-pressed", "true");
    expect(onUsePhotos).not.toHaveBeenCalled();

    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: "Use scan" }));

    expect(onUsePhotos).toHaveBeenCalledWith([
      expect.objectContaining({
        file: scannedFile,
        isDocumentScan: true,
        sourceFileName: "council-letter.jpg",
      }),
    ]);
  });

  it("turns failed auto-detection into an adjustable manual crop instead of blocking intake", async () => {
    prepareMock.mockResolvedValue({
      sourceFile,
      sourceDimensions: { width: 1600, height: 2200 },
      quad: {
        topLeft: { x: 96, y: 132 },
        topRight: { x: 1504, y: 132 },
        bottomRight: { x: 1504, y: 2068 },
        bottomLeft: { x: 96, y: 2068 },
      },
      detection: {
        status: "rejected",
        code: "no_document_detected",
        message: "No clear page edges",
        warnings: [],
      },
      warnings: ["AdminAvenger could not find every page edge. Check the corners or use the full image before continuing."],
    });

    render(
      <PhotoCapturePanel initialPhotoFile={sourceFile} onUsePhotos={vi.fn()} onClose={vi.fn()} />,
    );

    expect(await screen.findByRole("heading", { name: "Check the edges" })).toBeTruthy();
    expect(screen.getByText(/could not find every page edge/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Use full image" })).toBeTruthy();
    expect(screen.queryByText(/scanner could not prepare/i)).toBeNull();
  });

  it("stops camera tracks after cancel, capture, and unmount", async () => {
    const { stopTrack } = createCameraFixture();
    const { unmount } = render(<PhotoCapturePanel onUsePhotos={vi.fn()} onClose={vi.fn()} />);
    await chooseTakePhoto();
    await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL });
    await userEvent.click(screen.getByRole("button", { name: PHOTO_CANCEL_LABEL }));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    unmount();

    const second = createCameraFixture();
    installCanvasCapture();
    render(<PhotoCapturePanel onUsePhotos={vi.fn()} onClose={vi.fn()} />);
    await chooseTakePhoto();
    await userEvent.click(await screen.findByRole("button", { name: PHOTO_TAKE_PHOTO_LABEL }));
    await waitFor(() => expect(second.stopTrack).toHaveBeenCalledTimes(1));
  });

  it("falls back to the original photo only after explicit approval if the engine fails", async () => {
    prepareMock.mockRejectedValue(new Error("scanner unavailable"));
    const onUsePhotos = vi.fn();
    render(
      <PhotoCapturePanel
        initialPhotoFile={sourceFile}
        onUsePhotos={onUsePhotos}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText(/scanner could not prepare this photo/i)).toBeTruthy();
    expect(onUsePhotos).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: PHOTO_USE_ORIGINAL_LABEL }));
    expect(onUsePhotos).toHaveBeenCalledWith([
      expect.objectContaining({
        file: sourceFile,
        isDocumentScan: false,
        warnings: [PHOTO_USE_ORIGINAL_WARNING],
      }),
    ]);
  });
});
