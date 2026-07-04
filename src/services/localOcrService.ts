import { normalizeOcrText } from "../lib/photoIntake";
import * as Tesseract from "tesseract.js";

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
