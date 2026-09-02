import JSZip from "jszip";

// AdminAvenger is designed for ordinary bills, letters, notices and similar
// life-admin documents, not arbitrary large Office archives. These limits sit
// behind the existing 20 MB outer-file limit and bound ZIP expansion before
// Mammoth is allowed to extract DOCX XML/text.
export const MAX_DOCX_ARCHIVE_ENTRY_COUNT = 1_000;
export const MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
export const MAX_DOCX_ARCHIVE_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
export const DOCX_EXPANSION_RATIO_MIN_UNCOMPRESSED_BYTES = 1024 * 1024;
export const MAX_DOCX_ENTRY_EXPANSION_RATIO = 200;

export type DocxArchiveResourceSafetyCode =
  | "archive_structure_unreadable"
  | "entry_count_exceeded"
  | "entry_metadata_unreadable"
  | "entry_too_large"
  | "archive_too_large"
  | "expansion_ratio_exceeded";

export class DocxArchiveResourceSafetyError extends Error {
  code: DocxArchiveResourceSafetyCode;

  constructor(code: DocxArchiveResourceSafetyCode) {
    super("DOCX archive resource safety check failed.");
    this.name = "DocxArchiveResourceSafetyError";
    this.code = code;
  }
}

type JsZipEntrySizeMetadata = {
  compressedSize: number;
  uncompressedSize: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTrustworthyZipSize = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isSafeInteger(value) &&
  value >= 0;

// Compatibility boundary for JSZip 3.10.1.
//
// JSZip exposes compressed/uncompressed sizes on loaded entries at runtime,
// but only through private `_data`; its public JSZipObject declarations do not
// include them. Keep that private representation quarantined here. If a future
// JSZip version changes it, fail closed rather than widening types or
// decompressing an entry merely to discover its size.
const readJsZipEntrySizeMetadata = (
  entry: unknown,
): JsZipEntrySizeMetadata | undefined => {
  if (!isRecord(entry)) {
    return undefined;
  }

  const privateData = entry._data;
  if (!isRecord(privateData)) {
    return undefined;
  }

  const compressedSize = privateData.compressedSize;
  const uncompressedSize = privateData.uncompressedSize;

  if (
    !isTrustworthyZipSize(compressedSize) ||
    !isTrustworthyZipSize(uncompressedSize)
  ) {
    return undefined;
  }

  return { compressedSize, uncompressedSize };
};

const getLoadedArchiveEntries = (archive: unknown): unknown[] => {
  if (!isRecord(archive) || !isRecord(archive.files)) {
    throw new DocxArchiveResourceSafetyError("archive_structure_unreadable");
  }

  return Object.values(archive.files);
};

export const validateLoadedDocxArchiveResources = (archive: unknown): void => {
  const entries = getLoadedArchiveEntries(archive);

  // Directories still count toward archive complexity even though they have
  // no content to expand.
  if (entries.length > MAX_DOCX_ARCHIVE_ENTRY_COUNT) {
    throw new DocxArchiveResourceSafetyError("entry_count_exceeded");
  }

  let cumulativeUncompressedBytes = 0;

  for (const entry of entries) {
    if (!isRecord(entry)) {
      throw new DocxArchiveResourceSafetyError("entry_metadata_unreadable");
    }

    if (entry.dir === true) {
      continue;
    }

    const sizes = readJsZipEntrySizeMetadata(entry);
    if (!sizes) {
      throw new DocxArchiveResourceSafetyError("entry_metadata_unreadable");
    }

    if (sizes.uncompressedSize > MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES) {
      throw new DocxArchiveResourceSafetyError("entry_too_large");
    }

    if (
      sizes.uncompressedSize >
      MAX_DOCX_ARCHIVE_UNCOMPRESSED_BYTES - cumulativeUncompressedBytes
    ) {
      throw new DocxArchiveResourceSafetyError("archive_too_large");
    }
    cumulativeUncompressedBytes += sizes.uncompressedSize;

    if (
      sizes.uncompressedSize >=
      DOCX_EXPANSION_RATIO_MIN_UNCOMPRESSED_BYTES
    ) {
      if (sizes.compressedSize === 0) {
        throw new DocxArchiveResourceSafetyError(
          "expansion_ratio_exceeded",
        );
      }

      const expansionRatio =
        sizes.uncompressedSize / sizes.compressedSize;
      if (expansionRatio > MAX_DOCX_ENTRY_EXPANSION_RATIO) {
        throw new DocxArchiveResourceSafetyError(
          "expansion_ratio_exceeded",
        );
      }
    }
  }
};

export const inspectDocxArchiveResourceSafety = async (
  arrayBuffer: ArrayBuffer,
): Promise<void> => {
  // CRC checking would require inflating entry content. Keep it explicitly
  // disabled so the security decision is made from ZIP metadata before any
  // document entry is decompressed by AdminAvenger.
  const archive = await JSZip.loadAsync(arrayBuffer, { checkCRC32: false });
  validateLoadedDocxArchiveResources(archive);
};
