import { describe, expect, it, vi } from "vitest";
import {
  IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
  IMAGE_TOO_LARGE_MESSAGE,
  MAX_IMAGE_DECODED_RGBA_BYTES,
  MAX_IMAGE_DIMENSION_PX,
  MAX_IMAGE_PIXEL_COUNT,
  loadSafeImageForProcessing,
  validateImageResourceDimensions,
} from "../imageResourceSafety";

describe("image resource safety boundary", () => {
  it("accepts an ordinary mobile document photo", () => {
    expect(validateImageResourceDimensions(4032, 3024)).toEqual({
      status: "safe",
      width: 4032,
      height: 3024,
      pixelCount: 12_192_768,
    });
  });

  it("accepts a common high-resolution 48 MP phone photo", () => {
    expect(validateImageResourceDimensions(8064, 6048)).toMatchObject({
      status: "safe",
      pixelCount: 48_771_072,
    });
  });

  it("accepts the exact total-pixel boundary", () => {
    expect(validateImageResourceDimensions(10_000, 5_000)).toEqual({
      status: "safe",
      width: 10_000,
      height: 5_000,
      pixelCount: MAX_IMAGE_PIXEL_COUNT,
    });
  });

  it("accepts the exact per-edge boundary when total pixels remain safe", () => {
    expect(validateImageResourceDimensions(MAX_IMAGE_DIMENSION_PX, 1)).toMatchObject({
      status: "safe",
    });
    expect(validateImageResourceDimensions(1, MAX_IMAGE_DIMENSION_PX)).toMatchObject({
      status: "safe",
    });
  });

  it("rejects width one pixel over the boundary", () => {
    expect(validateImageResourceDimensions(MAX_IMAGE_DIMENSION_PX + 1, 1)).toEqual({
      status: "rejected",
      code: "excessive_width",
      message: IMAGE_TOO_LARGE_MESSAGE,
    });
  });

  it("rejects height one pixel over the boundary", () => {
    expect(validateImageResourceDimensions(1, MAX_IMAGE_DIMENSION_PX + 1)).toEqual({
      status: "rejected",
      code: "excessive_height",
      message: IMAGE_TOO_LARGE_MESSAGE,
    });
  });

  it("rejects total pixels one row over the boundary", () => {
    expect(validateImageResourceDimensions(10_000, 5_001)).toEqual({
      status: "rejected",
      code: "excessive_pixels",
      message: IMAGE_TOO_LARGE_MESSAGE,
    });
  });

  it.each([
    [0, 100],
    [-1, 100],
    [100, 0],
    [100.5, 100],
    [Number.NaN, 100],
    [Number.POSITIVE_INFINITY, 100],
    [Number.MAX_SAFE_INTEGER + 1, 1],
  ])("rejects malformed or unsafe dimensions %s x %s", (width, height) => {
    expect(validateImageResourceDimensions(width, height)).toEqual({
      status: "rejected",
      code: "invalid_dimensions",
      message: IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
    });
  });

  it("documents the decoded RGBA budget represented by the pixel limit", () => {
    expect(MAX_IMAGE_DECODED_RGBA_BYTES).toBe(200_000_000);
  });

  it("fails safely when the browser cannot decode readable dimensions", async () => {
    class UnreadableImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onerror?.();
      }
    }

    vi.stubGlobal("Image", UnreadableImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:unreadable-image"),
      revokeObjectURL: vi.fn(),
    });

    try {
      await expect(
        loadSafeImageForProcessing(
          new Blob(["malformed image"], { type: "image/jpeg" }),
        ),
      ).rejects.toMatchObject({
        name: "ImageResourceSafetyError",
        code: "invalid_dimensions",
        message: IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
