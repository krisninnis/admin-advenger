// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../components/Sidebar";
import { CameraCalibrationLabView } from "../CameraCalibrationLabView";
import type { CameraCalibrationLabDependencies } from "../CameraCalibrationLabView";
import type { CameraLabCaptureResult } from "../../lib/cameraCalibrationLab";

const createFakeCamera = (options: {
  capabilities?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  applyConstraints?: ReturnType<typeof vi.fn>;
} = {}) => {
  const stop = vi.fn();
  const applyConstraints = options.applyConstraints ?? vi.fn(async () => undefined);
  const settings = {
    deviceId: "camera-1",
    facingMode: "environment",
    width: 1280,
    height: 720,
    frameRate: 30,
    ...options.settings,
  };
  const track = {
    stop,
    applyConstraints,
    getCapabilities: vi.fn(() => options.capabilities ?? {}),
    getSettings: vi.fn(() => settings),
  } as unknown as MediaStreamTrack;
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream;

  return { stream, track, stop, applyConstraints };
};

const createDependencies = (
  stream: MediaStream,
  overrides: Partial<CameraCalibrationLabDependencies> = {},
): CameraCalibrationLabDependencies => ({
  requestStream: vi.fn(async () => stream),
  enumerateDevices: vi.fn(async () => []),
  getSupportedConstraints: vi.fn(() => ({
    width: true,
    height: true,
    frameRate: true,
    facingMode: true,
  })),
  createObjectURL: vi.fn(() => "blob:scan-preview"),
  revokeObjectURL: vi.fn(),
  now: vi.fn(() => 1000),
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, "ImageCapture");
});

describe("CameraCalibrationLabView", () => {
  it("does not request camera access before deliberate user action", async () => {
    const { stream } = createFakeCamera();
    const requestStream = vi.fn(async () => stream);

    render(
      <CameraCalibrationLabView
        dependencies={createDependencies(stream, { requestStream })}
      />,
    );

    expect(requestStream).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));

    expect(requestStream).toHaveBeenCalledTimes(1);
    await screen.findByText("Camera opened. No image has been uploaded or saved.");
  });

  it("disables capability controls when the track does not support them", async () => {
    const { stream } = createFakeCamera({ capabilities: {} });

    render(<CameraCalibrationLabView dependencies={createDependencies(stream)} />);
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));

    expect((await screen.findByLabelText("Zoom") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Focus mode") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText("Torch") as HTMLInputElement).disabled).toBe(true);
  });

  it("shows actual MediaStreamTrack settings after camera open", async () => {
    const { stream } = createFakeCamera({
      settings: {
        width: 1920,
        height: 1080,
        frameRate: 60,
        zoom: 2,
      },
      capabilities: {
        zoom: { min: 1, max: 4, step: 0.1 },
      },
    });

    render(<CameraCalibrationLabView dependencies={createDependencies(stream)} />);
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));

    await waitFor(() => expect(screen.getAllByText(/"width": 1920/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/"height": 1080/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"frameRate": 60/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"zoom": 2/).length).toBeGreaterThan(0);
  });

  it("reports rejected camera constraints without crashing", async () => {
    const applyConstraints = vi.fn(async () => {
      throw new Error("zoom rejected");
    });
    const { stream } = createFakeCamera({
      capabilities: {
        zoom: { min: 1, max: 4, step: 0.1 },
      },
      applyConstraints,
    });

    render(<CameraCalibrationLabView dependencies={createDependencies(stream)} />);
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply camera settings" }));

    expect((await screen.findByRole("alert")).textContent).toContain("zoom rejected");
    expect(applyConstraints).toHaveBeenCalledTimes(1);
  });

  it("enables ImageCapture selection only when the browser supports it", async () => {
    const { stream } = createFakeCamera();
    Object.defineProperty(window, "ImageCapture", {
      configurable: true,
      value: class FakeImageCapture {},
    });

    render(<CameraCalibrationLabView dependencies={createDependencies(stream)} />);
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));

    const captureMethod = await screen.findByLabelText("Capture method");
    expect((captureMethod as HTMLSelectElement).value).toBe("canvas");
    expect((screen.getByRole("option", { name: "ImageCapture.takePhoto()" }) as HTMLOptionElement).disabled).toBe(false);
  });

  it("uses the canvas capture path when ImageCapture is unavailable", async () => {
    const { stream } = createFakeCamera();
    const capturedFile = new File(["synthetic lab image"], "camera-lab-capture.jpg", {
      type: "image/jpeg",
    });
    const captureResult: CameraLabCaptureResult = {
      file: capturedFile,
      method: "canvas",
      sourceDimensions: { width: 1280, height: 720 },
      outputDimensions: { width: 1280, height: 720 },
    };
    const captureCanvasFrame = vi.fn(async () => captureResult);
    const scanDocumentFile = vi.fn(async (file: File) => ({
      status: "rejected" as const,
      sourceFile: file,
      sourceDimensions: { width: 1280, height: 720 },
      code: "no_document_detected" as const,
      message: "No clear document",
      warnings: [],
    }));

    render(
      <CameraCalibrationLabView
        dependencies={createDependencies(stream, { captureCanvasFrame, scanDocumentFile })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    expect(
      (screen.getByRole("option", { name: /ImageCapture\.takePhoto\(\) \(unavailable\)/ }) as HTMLOptionElement)
        .disabled,
    ).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Manual capture" }));

    await waitFor(() => expect(captureCanvasFrame).toHaveBeenCalledTimes(1));
    expect(scanDocumentFile).toHaveBeenCalledWith(capturedFile);
    expect(await screen.findByText("rejected")).toBeTruthy();
  });

  it("uses the ImageCapture path when selected and supported", async () => {
    const { stream, track } = createFakeCamera();
    const capturedFile = new File(["synthetic image-capture lab image"], "camera-lab-capture.jpg", {
      type: "image/jpeg",
    });
    const scannedFile = new File(["prepared synthetic scan"], "scan-camera-lab-capture.jpg", {
      type: "image/jpeg",
    });
    const captureResult: CameraLabCaptureResult = {
      file: capturedFile,
      method: "image_capture",
      sourceDimensions: { width: 4032, height: 3024 },
      outputDimensions: { width: 4032, height: 3024 },
    };
    const captureImageCapturePhoto = vi.fn(async () => captureResult);
    const scanDocumentFile = vi.fn(async (file: File) => ({
      status: "ready" as const,
      sourceFile: file,
      scannedFile,
      sourceDimensions: { width: 4032, height: 3024 },
      quad: {
        topLeft: { x: 100, y: 100 },
        topRight: { x: 2100, y: 100 },
        bottomRight: { x: 2100, y: 2900 },
        bottomLeft: { x: 100, y: 2900 },
      },
      warnings: [],
    }));
    Object.defineProperty(window, "ImageCapture", {
      configurable: true,
      value: class FakeImageCapture {},
    });

    render(
      <CameraCalibrationLabView
        dependencies={createDependencies(stream, {
          captureImageCapturePhoto,
          scanDocumentFile,
        })}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await userEvent.selectOptions(screen.getByLabelText("Capture method"), "image_capture");
    await userEvent.click(screen.getByRole("button", { name: "Manual capture" }));

    await waitFor(() => expect(captureImageCapturePhoto).toHaveBeenCalledWith(track));
    expect(scanDocumentFile).toHaveBeenCalledWith(capturedFile);
    expect(await screen.findByText("ready")).toBeTruthy();
    expect(screen.getByAltText("Prepared scan from calibration capture")).toBeTruthy();
  });

  it("downloads telemetry only after a local capture and excludes image payloads", async () => {
    const { stream } = createFakeCamera();
    const capturedFile = new File(["synthetic lab image"], "camera-lab-capture.jpg", {
      type: "image/jpeg",
    });
    const downloadJson = vi.fn();
    const captureCanvasFrame = vi.fn(async () => ({
      file: capturedFile,
      method: "canvas" as const,
      sourceDimensions: { width: 1280, height: 720 },
      outputDimensions: { width: 1280, height: 720 },
    }));
    const scanDocumentFile = vi.fn(async (file: File) => ({
      status: "rejected" as const,
      sourceFile: file,
      sourceDimensions: { width: 1280, height: 720 },
      code: "no_document_detected" as const,
      message: "No clear document",
      warnings: [],
    }));

    render(
      <CameraCalibrationLabView
        dependencies={createDependencies(stream, {
          captureCanvasFrame,
          scanDocumentFile,
          downloadJson,
        })}
      />,
    );

    const downloadButton = screen.getByRole("button", { name: "Download telemetry JSON" });
    expect((downloadButton as HTMLButtonElement).disabled).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await userEvent.click(screen.getByRole("button", { name: "Manual capture" }));
    await waitFor(() => expect((downloadButton as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(downloadButton);

    expect(downloadJson).toHaveBeenCalledTimes(1);
    const payload = JSON.stringify(downloadJson.mock.calls[0][1]);
    expect(payload).not.toContain("synthetic lab image");
    expect(payload).not.toContain("camera-lab-capture.jpg");
    expect(payload).not.toContain("sourceFile");
  });

  it("stops camera tracks on close and unmount", async () => {
    const first = createFakeCamera();
    const firstDependencies = createDependencies(first.stream);
    const onClose = vi.fn();
    const { unmount, rerender } = render(
      <CameraCalibrationLabView dependencies={firstDependencies} onClose={onClose} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    await userEvent.click(screen.getByRole("button", { name: "Close lab" }));

    expect(first.stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    const second = createFakeCamera();
    rerender(<CameraCalibrationLabView dependencies={createDependencies(second.stream)} />);
    await userEvent.click(screen.getByRole("button", { name: "Open camera" }));
    unmount();

    expect(second.stop).toHaveBeenCalled();
  });
});

describe("production navigation", () => {
  it("does not expose the development camera lab in the normal sidebar", () => {
    render(
      <Sidebar
        currentView="home"
        onNavigate={vi.fn()}
        caseCount={0}
        findingCount={0}
      />,
    );

    expect(screen.queryByText(/camera calibration lab/i)).toBeNull();
    expect(screen.queryByText(/camera lab/i)).toBeNull();
  });
});
