import { getAdviserExportFilename } from "./adviserExportPack";

export const downloadAdviserExportMarkdown = (
  markdown: string,
  filename = getAdviserExportFilename(),
) => {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
};
