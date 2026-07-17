export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const FILE_SIZE_LIMIT_HELPER = `Maximum ${MAX_FILE_SIZE_MB} MB per file.`;

type FileSizeCandidate = Pick<File, "name" | "size">;

export const isFileWithinSizeLimit = (
  file: Pick<FileSizeCandidate, "size">,
): boolean => file.size <= MAX_FILE_SIZE_BYTES;

export const getFileTooLargeMessage = (
  file: FileSizeCandidate,
): string => {
  const fileLabel = file.name.trim() || "This file";

  return `${fileLabel} is larger than the ${MAX_FILE_SIZE_MB} MB limit. AdminAvenger did not read or upload it. Choose a smaller file or copy and paste the text.`;
};
