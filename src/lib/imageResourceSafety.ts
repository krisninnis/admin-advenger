export const MAX_IMAGE_DIMENSION_PX = 12_000;
export const MAX_IMAGE_PIXEL_COUNT = 50_000_000;
export const MAX_IMAGE_DECODED_RGBA_BYTES = MAX_IMAGE_PIXEL_COUNT * 4;

export const IMAGE_TOO_LARGE_MESSAGE =
  "This photo is too large to read safely in this browser. Choose a smaller photo or paste the text manually. The photo was not uploaded or sent anywhere.";

export const IMAGE_DIMENSIONS_UNREADABLE_MESSAGE =
  "We could not read this photo's dimensions safely. Try a JPG, PNG, or WEBP photo, or paste the text manually. The photo was not uploaded or sent anywhere.";

export type ImageResourceSafetyCode =
  | "invalid_dimensions"
  | "excessive_width"
  | "excessive_height"
  | "excessive_pixels";

export type ImageResourceSafetyResult =
  | {
      status: "safe";
      width: number;
      height: number;
      pixelCount: number;
    }
  | {
      status: "rejected";
      code: ImageResourceSafetyCode;
      message: string;
    };

export class ImageResourceSafetyError extends Error {
  code: ImageResourceSafetyCode;

  constructor(code: ImageResourceSafetyCode, message: string) {
    super(message);
    this.name = "ImageResourceSafetyError";
    this.code = code;
  }
}

export const validateImageResourceDimensions = (
  width: number,
  height: number,
): ImageResourceSafetyResult => {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      status: "rejected",
      code: "invalid_dimensions",
      message: IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
    };
  }

  if (width > MAX_IMAGE_DIMENSION_PX) {
    return {
      status: "rejected",
      code: "excessive_width",
      message: IMAGE_TOO_LARGE_MESSAGE,
    };
  }

  if (height > MAX_IMAGE_DIMENSION_PX) {
    return {
      status: "rejected",
      code: "excessive_height",
      message: IMAGE_TOO_LARGE_MESSAGE,
    };
  }

  // Division avoids multiplying attacker-controlled values before the limit
  // check. The per-edge checks above also keep accepted arithmetic far below
  // Number.MAX_SAFE_INTEGER.
  if (width > Math.floor(MAX_IMAGE_PIXEL_COUNT / height)) {
    return {
      status: "rejected",
      code: "excessive_pixels",
      message: IMAGE_TOO_LARGE_MESSAGE,
    };
  }

  return {
    status: "safe",
    width,
    height,
    pixelCount: width * height,
  };
};

export const assertImageResourceDimensionsSafe = (
  width: number,
  height: number,
): void => {
  const result = validateImageResourceDimensions(width, height);

  if (result.status === "rejected") {
    throw new ImageResourceSafetyError(result.code, result.message);
  }
};

export type LoadedSafeImage = {
  element: HTMLImageElement;
  dimensions: {
    width: number;
    height: number;
  };
};

// The browser's decoded natural dimensions are the authoritative boundary.
// Callers must use this before allocating canvases, pixel buffers, previews,
// or OCR workers for user-selected images.
export const loadSafeImageForProcessing = (
  image: File | Blob,
): Promise<LoadedSafeImage> =>
  new Promise((resolve, reject) => {
    if (
      typeof Image === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      reject(new Error("Image dimension inspection is unavailable."));
      return;
    }

    let objectUrl = "";

    try {
      objectUrl = URL.createObjectURL(image);
      const element = new Image();
      const cleanUp = () => {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // Cleanup failures must not prevent the safety decision from
            // resolving or rejecting.
          }
          objectUrl = "";
        }
      };

      element.onload = () => {
        cleanUp();

        try {
          assertImageResourceDimensionsSafe(
            element.naturalWidth,
            element.naturalHeight,
          );
          resolve({
            element,
            dimensions: {
              width: element.naturalWidth,
              height: element.naturalHeight,
            },
          });
        } catch (error) {
          reject(error);
        }
      };

      element.onerror = () => {
        cleanUp();
        reject(
          new ImageResourceSafetyError(
            "invalid_dimensions",
            IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
          ),
        );
      };

      element.src = objectUrl;
    } catch (error) {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Keep the original setup failure as the relevant signal.
        }
      }
      reject(
        error instanceof ImageResourceSafetyError
          ? error
          : new ImageResourceSafetyError(
              "invalid_dimensions",
              IMAGE_DIMENSIONS_UNREADABLE_MESSAGE,
            ),
      );
    }
  });

export const inspectImageResourceSafety = async (
  image: File | Blob,
): Promise<LoadedSafeImage["dimensions"]> => {
  const loaded = await loadSafeImageForProcessing(image);
  return loaded.dimensions;
};
