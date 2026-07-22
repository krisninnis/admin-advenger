import { useEffect, useId, useRef, useState } from "react";
import { photoCaptureAcceptAttribute } from "../lib/fileIntakeAccept";
import {
  OCR_CHECK_TEXT_UNRELIABLE_WARNING,
  OCR_EXTRACTED_TEXT_DISCLOSURE_HELP,
  OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
  OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
  OCR_UNRELIABLE_MESSAGE,
  OCR_UNRELIABLE_REVIEW_MESSAGE,
} from "../lib/photoOcr";

export const LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT =
  "Photo read, but not clearly enough. Important details are hidden until you retake, add a close-up, or review the text.";

export const LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE =
  "Your photo and extracted text are processed in this browser and are not uploaded to AdminAvenger. Nothing has been sent or saved to your cases.";

type LowConfidenceOcrReviewPanelProps = {
  previewUrl?: string;
  extractedText: string;
  onRetake: () => void;
  onAddCloseUp: () => void;
  onUploadClearer: (file: File) => void;
  onCheckCorrectedText: (text: string) => void;
  onCancel: () => void;
  disabled?: boolean;
};

export function LowConfidenceOcrReviewPanel({
  previewUrl,
  extractedText,
  onRetake,
  onAddCloseUp,
  onUploadClearer,
  onCheckCorrectedText,
  onCancel,
  disabled = false,
}: LowConfidenceOcrReviewPanelProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reviewText, setReviewText] = useState(extractedText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const disclosureId = useId();
  const editorId = useId();

  useEffect(() => {
    setReviewText(extractedText);
    setIsEditorOpen(false);
  }, [extractedText]);

  useEffect(() => {
    if (isEditorOpen) {
      textareaRef.current?.focus();
    }
  }, [isEditorOpen]);

  const handleCheckCorrectedText = () => {
    const cleanedText = reviewText.trim();

    if (!cleanedText || disabled) {
      return;
    }

    onCheckCorrectedText(cleanedText);
  };

  return (
    <section
      aria-labelledby="low-confidence-ocr-heading"
      className="mt-4 max-w-[1040px] rounded-lg border border-amber-200/25 bg-amber-200/[0.07] p-4 text-slate-100 md:grid md:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] md:gap-5 md:p-5"
    >
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT}
      </p>

      {previewUrl ? (
        <div className="md:sticky md:top-4 md:self-start">
          <img
            src={previewUrl}
            alt="Prepared document preview used for text reading"
            className="max-h-[120px] w-full rounded-lg border border-white/10 bg-slate-950 object-contain md:max-h-[360px]"
          />
        </div>
      ) : null}

      <div className={previewUrl ? "mt-4 md:mt-0" : ""}>
        <div className="rounded-lg border border-amber-200/30 bg-slate-950/70 px-4 py-3">
          <p className="text-sm font-bold text-amber-100">Needs a clearer read</p>
          <h1
            id="low-confidence-ocr-heading"
            className="mt-2 text-2xl font-black tracking-normal text-white"
          >
            {OCR_UNRELIABLE_MESSAGE}
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-50/90">
            {OCR_UNRELIABLE_REVIEW_MESSAGE}
          </p>
          <p className="mt-3 rounded-lg border border-amber-200/20 bg-amber-100/10 px-3 py-2 text-sm font-semibold leading-6 text-amber-50">
            {OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE}
          </p>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={onRetake}
            disabled={disabled}
            className="min-h-12 w-full rounded-lg bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            Retake photo
          </button>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAddCloseUp}
              disabled={disabled}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 transition hover:border-amber-200/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add a close-up
            </button>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={disabled}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100 transition hover:border-amber-200/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Upload a clearer photo
            </button>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept={photoCaptureAcceptAttribute}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                onUploadClearer(file);
              }
            }}
            className="sr-only"
          />
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3">
          <button
            type="button"
            aria-expanded={isEditorOpen}
            aria-controls={disclosureId}
            onClick={() => setIsEditorOpen((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left text-sm font-bold text-slate-100 transition focus:outline-none focus:ring-2 focus:ring-amber-200/50"
          >
            <span>{OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL}</span>
            <span aria-hidden="true" className="text-lg leading-none">
              {isEditorOpen ? "-" : "+"}
            </span>
          </button>

          {isEditorOpen ? (
            <div id={disclosureId} className="mt-3">
              <p className="text-xs leading-5 text-slate-300">
                {OCR_EXTRACTED_TEXT_DISCLOSURE_HELP}
              </p>
              <label htmlFor={editorId} className="mt-3 block text-sm font-bold text-slate-100">
                Text to correct
              </label>
              <textarea
                id={editorId}
                ref={textareaRef}
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                rows={9}
                className="mt-2 max-h-[360px] w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-amber-200 focus:ring-2 focus:ring-amber-200/20"
              />
              <p className="mt-2 rounded-lg border border-amber-200/25 bg-amber-100/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-50">
                {OCR_CHECK_TEXT_UNRELIABLE_WARNING}
              </p>
              <button
                type="button"
                onClick={handleCheckCorrectedText}
                disabled={!reviewText.trim() || disabled}
                className="mt-3 min-h-11 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
              >
                Check corrected text
              </button>
            </div>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-300">
          {LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE}
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="mt-3 min-h-11 rounded-lg px-2 py-2 text-sm font-bold text-slate-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-200/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
