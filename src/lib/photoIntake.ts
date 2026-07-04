export type PhotoIntakeMetadata = {
  fileName: string;
  fileSize: number;
  mimeType: string;
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
