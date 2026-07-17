export type PhotoIntakeMetadata = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  // Best-effort pixel dimensions, filled in separately via getImageDimensions
  // once the image has been decoded (createPhotoIntakeMetadata itself stays
  // synchronous and does not set these - see getImageDimensions below).
  width?: number;
  height?: number;
};

const supportedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const supportedImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export const isSupportedPhotoFile = (file: File) => {
  const fileName = file.name.toLowerCase();

  return (
    supportedImageTypes.has(file.type.toLowerCase()) ||
    supportedImageExtensions.some((extension) => fileName.endsWith(extension))
  );
};

export const createPhotoIntakeMetadata = (file: File): PhotoIntakeMetadata => ({
  fileName: file.name,
  fileSize: file.size,
  mimeType: file.type || "unknown",
});

export const metadataContainsEmbeddedImage = (metadata: PhotoIntakeMetadata) =>
  Object.values(metadata).some(
    (value) => typeof value === "string" && value.toLowerCase().includes("data:image"),
  );

export const normalizeOcrText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// ---- Image quality warnings (file size / pixel dimensions) ----
//
// These are separate from the text/confidence warnings in photoOcr.ts - they
// describe the photo itself, and can be shown as soon as a photo is chosen,
// before OCR has even run. Below this file size, a photo claiming to be a
// full page of letter text is suspiciously small - most likely a heavily
// compressed or low-resolution capture rather than a genuine full-resolution
// photo (the "0.07MB full-page letter" case this was written for).
const MIN_FULL_PAGE_FILE_SIZE_BYTES = 150 * 1024; // 150KB

// Below this on the longer edge, a photo is unlikely to have enough pixels
// per character for Tesseract to reliably tell letters apart on a full page
// of text.
const MIN_USEFUL_DIMENSION_PX = 900;

export const OCR_SMALL_IMAGE_WARNING =
  "This photo may be too small or unclear. Try taking a closer photo in better light, or paste the text manually.";

// Pure - given whatever is known about a captured/uploaded photo (file size
// always known; pixel dimensions only when they could be measured), returns
// plain-English warnings about the photo itself. Dimensions are optional
// because measuring them requires decoding the image first (see
// getImageDimensions) - a missing dimension is treated as "unknown", never
// as "too small", so this never produces a false warning just because
// decoding hadn't finished yet.
export const getImageQualityWarnings = (input: {
  fileSize: number;
  width?: number;
  height?: number;
}): string[] => {
  const hasKnownDimensions =
    typeof input.width === "number" && typeof input.height === "number";
  const tooSmallFile =
    !hasKnownDimensions &&
    input.fileSize > 0 &&
    input.fileSize < MIN_FULL_PAGE_FILE_SIZE_BYTES;
  const tooSmallDimensions =
    typeof input.width === "number" &&
    typeof input.height === "number" &&
    Math.max(input.width, input.height) < MIN_USEFUL_DIMENSION_PX;

  return tooSmallFile || tooSmallDimensions ? [OCR_SMALL_IMAGE_WARNING] : [];
};

// Decodes just enough of the image to read its natural pixel dimensions,
// without uploading, storing, or otherwise doing anything with the image
// beyond this local, in-memory decode. Touches the DOM (Image + object URL),
// so - like capturePhotoFromVideoElement in photoCapture.ts - this is
// exercised manually in the browser rather than unit tested directly;
// getImageQualityWarnings above (the pure decision logic) is unit tested.
// Never throws - resolves `undefined` on any failure so a photo that can't
// be measured this way still proceeds straight to OCR rather than blocking.
export const getImageDimensions = (
  image: File | Blob,
): Promise<{ width: number; height: number } | undefined> =>
  new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(image);
      const element = new Image();

      const cleanUp = () => URL.revokeObjectURL(objectUrl);

      element.onload = () => {
        cleanUp();
        resolve({ width: element.naturalWidth, height: element.naturalHeight });
      };
      element.onerror = () => {
        cleanUp();
        resolve(undefined);
      };
      element.src = objectUrl;
    } catch {
      resolve(undefined);
    }
  });
