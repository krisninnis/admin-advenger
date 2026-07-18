// @vitest-environment jsdom

import {
  cleanup,
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
  PHOTO_SCAN_REVIEW_QUESTION,
  PHOTO_TRY_AGAIN_LABEL,
  PHOTO_USE_SCAN_LABEL,
} from "../../lib/photoCapture";

const { scanDocumentFileMock } = vi.hoisted(() => ({
  scanDocumentFileMock: vi.fn(),
}));

vi.mock("../../lib/documentScanner", () => ({
  scanDocumentFile: scanDocumentFileMock,
}));

const createObjectUrlMock = vi.fn((file: File) => `blob:${file.name}`);
const revokeObjectUrlMock = vi.fn();

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
});

afterEach(() => {
  cleanup();
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

describe("PhotoCapturePanel rendered scan confirmation", () => {
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
});
