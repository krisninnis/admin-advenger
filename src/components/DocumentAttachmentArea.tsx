import type { ChangeEvent, DragEvent } from "react";
import {
  ATTACHMENT_CHOOSE_BUTTON_LABEL,
  ATTACHMENT_CHOOSE_HELPER,
  ATTACHMENT_COMBINED_TEXT_NOTE,
  ATTACHMENT_DRAG_ACTIVE_LABEL,
  ATTACHMENT_DRAG_DROP_LABEL,
  ATTACHMENT_HEADING,
  ATTACHMENT_HELPER,
  ATTACHMENT_KIND_LABELS,
  ATTACHMENT_LOCAL_ONLY_NOTE,
  ATTACHMENT_OCR_CAUTION_NOTE,
  ATTACHMENT_REMOVE_BUTTON_LABEL,
  ATTACHMENT_STATUS_LABELS,
  type AttachedFile,
} from "../lib/documentAttachmentIntake";
import { attachmentPickerAcceptAttribute } from "../lib/fileIntakeAccept";
import { FILE_SIZE_LIMIT_HELPER } from "../lib/fileSizeLimit";

export type DocumentAttachmentAreaProps = {
  files: AttachedFile[];
  isDraggingOver: boolean;
  disabled?: boolean;
  showCombinedTextNote: boolean;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
};

const fileListFromEvent = (event: ChangeEvent<HTMLInputElement>): File[] => {
  const files = event.target.files ? Array.from(event.target.files) : [];
  // Reset so choosing the exact same file again still fires onChange.
  event.target.value = "";
  return files;
};

// Attach document photos - complements the paste box (never replaces it).
// Offers two local-only ways to bring in supporting documents: the browser's
// own "choose photos or files" picker (which is what surfaces Photos/Gallery/
// Google Photos/Files on a phone - see docs/product/document-attachment-intake-v1.md
// for why AdminAvenger does not integrate directly with any of those cloud
// photo services), and a desktop drag-and-drop zone. The main "Take photo"
// route lives in PhotoCapturePanel so all camera photos share one scanner/
// review flow before OCR. Every file stays on-device and flows through the
// existing OCR/text intake and "Check a message" pipeline - this component
// only collects files and reports status; it never analyses anything itself.
export function DocumentAttachmentArea({
  files,
  isDraggingOver,
  disabled = false,
  showCombinedTextNote,
  onFilesSelected,
  onRemoveFile,
  onDragOver,
  onDragLeave,
  onDrop,
}: DocumentAttachmentAreaProps) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/50 p-4">
      <p className="text-sm font-bold text-white">{ATTACHMENT_HEADING}</p>
      <p className="mt-1 text-sm leading-6 text-slate-400">{ATTACHMENT_HELPER}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{FILE_SIZE_LIMIT_HELPER}</p>

      <div
        role="group"
        aria-label={ATTACHMENT_HEADING}
        onDragOver={(event) => {
          event.preventDefault();
          onDragOver(event);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          onDragLeave(event);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDrop(event);
        }}
        className={`mt-3 rounded-lg border-2 border-dashed p-4 transition ${
          isDraggingOver
            ? "border-emerald-300/70 bg-emerald-300/10"
            : "border-white/15 bg-slate-950/40"
        }`}
      >
        <p className="text-sm font-semibold text-slate-200">
          {isDraggingOver ? ATTACHMENT_DRAG_ACTIVE_LABEL : ATTACHMENT_DRAG_DROP_LABEL}
        </p>

        <div className="mt-3 grid gap-3">
          <label className="flex cursor-pointer flex-col rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-emerald-50 transition hover:border-emerald-300/40">
            {ATTACHMENT_CHOOSE_BUTTON_LABEL}
            <span className="mt-1 text-xs font-normal leading-5 text-slate-400">
              {ATTACHMENT_CHOOSE_HELPER}
            </span>
            <input
              type="file"
              accept={attachmentPickerAcceptAttribute}
              multiple
              disabled={disabled}
              aria-label={ATTACHMENT_CHOOSE_BUTTON_LABEL}
              onChange={(event) => onFilesSelected(fileListFromEvent(event))}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">{ATTACHMENT_LOCAL_ONLY_NOTE}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{ATTACHMENT_OCR_CAUTION_NOTE}</p>
      {showCombinedTextNote ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-cyan-200">
          {ATTACHMENT_COMBINED_TEXT_NOTE}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {files.map((attached) => (
            <li
              key={attached.id}
              className="rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{attached.file.name}</p>
                  <p role="status" aria-live="polite" aria-atomic="true" className="text-xs text-slate-400">
                    {ATTACHMENT_KIND_LABELS[attached.kind]}{" \u00b7 "}{ATTACHMENT_STATUS_LABELS[attached.status]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(attached.id)}
                  aria-label={`${ATTACHMENT_REMOVE_BUTTON_LABEL} ${attached.file.name}`}
                  className="flex-none rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-white/25 hover:text-white"
                >
                  {ATTACHMENT_REMOVE_BUTTON_LABEL}
                </button>
              </div>
              {attached.errorMessage ? (
                <p role="alert" aria-live="assertive" aria-atomic="true" className="mt-1 text-xs leading-5 text-amber-200">{attached.errorMessage}</p>
              ) : null}
              {attached.warnings.map((warning) => (
                <p key={warning} className="mt-1 text-xs leading-5 text-amber-200">
                  {warning}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
