// Superseded by src/lib/photoOcr.ts (readTextFromImage), which HomeView.tsx
// now uses directly. Kept here only so this file isn't silently deleted
// without the user's say-so - safe to remove in a follow-up cleanup once
// nothing else references it.
import { normalizeOcrText } from "../lib/photoIntake";

type TesseractModule = typeof import("tesseract.js");

const loadTesseract = async (): Promise<TesseractModule> => import("tesseract.js");

export type LocalOcrProgress = {
  status: string;
  progress: number;
};

export type LocalOcrResult = {
  text: string;
  confidence: number;
};

export const readTextFromPhoto = async (
  file: File,
  onProgress?: (progress: LocalOcrProgress) => void,
): Promise<LocalOcrResult> => {
  const Tesseract = await loadTesseract();
  const result = await Tesseract.recognize(file, "eng", {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        progress: Math.max(0, Math.min(1, message.progress)),
      });
    },
  });

  return {
    text: normalizeOcrText(result.data.text),
    confidence: result.data.confidence,
  };
};
