import { useEffect, useReducer, useRef, useState } from "react";
import { photoCaptureAcceptAttribute } from "../lib/fileIntakeAccept";
import { FILE_SIZE_LIMIT_HELPER, getFileTooLargeMessage, isFileWithinSizeLimit } from "../lib/fileSizeLimit";
import {
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_UNAVAILABLE_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_DETECTING_MESSAGE,
  PHOTO_EDIT_MANUALLY_LABEL,
  PHOTO_LOADING_MESSAGE,
  PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE,
  PHOTO_NO_DOCUMENT_MESSAGE,
  PHOTO_RETAKE_PHOTO_LABEL,
  PHOTO_REVIEW_ACTIONS_CLASSNAME,
  PHOTO_REVIEW_CONTENT_CLASSNAME,
  PHOTO_SCAN_REVIEW_QUESTION,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_TRY_AGAIN_LABEL,
  PHOTO_UPLOAD_CLEARER_LABEL,
  PHOTO_USE_ORIGINAL_LABEL,
  PHOTO_USE_ORIGINAL_WARNING,
  PHOTO_USE_SCAN_LABEL,
  capturePhotoFromVideoElement,
  getCameraGuidanceFitMessage,
  getCapturedPhotoFileName,
  getPhotoCaptureSectionLabel,
  getPhotoCaptureSectionTitle,
  photoCaptureReducer,
  requestEnvironmentCameraStream,
  stopMediaStreamTracks,
  type CapturedPhotoForOcr,
  type PhotoCaptureSection,
} from "../lib/photoCapture";

type PhotoCapturePanelProps = {
  // Feeds a reviewed scan/photo into the existing on-device OCR intake path.
  // This component never uploads, sends, saves, or checks anything itself.
  onUsePhotos: (photos: CapturedPhotoForOcr[]) => void;
  onClose: () => void;
  onCancel?: () => void;
  onTryAgain?: () => void;
  onEditManually?: () => void;
  defaultSection?: PhotoCaptureSection;
  // When an image is chosen elsewhere (e.g. the compact upload menu), it is
  // handed here so every image goes through the same scan/review gate before
  // OCR.
  initialPhotoFile?: File;
};

type UploadExistingPhotoInputProps = {
  onSelect: (file: File) => void;
  disabled?: boolean;
  label?: string;
};

function UploadExistingPhotoInput({
  onSelect,
  disabled = false,
  label = "Upload existing photo",
}: UploadExistingPhotoInputProps) {
  return (
    <label
      className={`flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition focus-within:ring-2 focus-within:ring-emerald-300/40 ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
      <input
        type="file"
        accept={photoCaptureAcceptAttribute}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onSelect(file);
          }
        }}
        className="sr-only"
      />
    </label>
  );
}

export function PhotoCapturePanel({
  onUsePhotos,
  onClose,
  onCancel,
  onTryAgain,
  onEditManually,
  defaultSection,
  initialPhotoFile,
}: PhotoCapturePanelProps) {
  const [stage, dispatch] = useReducer(photoCaptureReducer, "choice");
  const [errorMessage, setErrorMessage] = useState("");
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState("");
  const [scanPreviewUrl, setScanPreviewUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const initialPhotoSeededRef = useRef(false);
  const scanRequestIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceFileRef = useRef<File | undefined>(undefined);
  const scannedFileRef = useRef<File | undefined>(undefined);

  const currentSection: PhotoCaptureSection =
    defaultSection === "additional" ? "additional" : "full_page";
  const currentSectionTitle = getPhotoCaptureSectionTitle(currentSection);
  const currentGuidanceMessage = getCameraGuidanceFitMessage(currentSection);

  const stopActiveStream = () => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const resetPhotoReviewState = () => {
    setSourcePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
    setScanPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return "";
    });
    setStatusMessage("");
    setScanWarnings([]);
    sourceFileRef.current = undefined;
    scannedFileRef.current = undefined;
  };

  const handleCancel = () => {
    onCancel?.();
    scanRequestIdRef.current += 1;
    stopActiveStream();
    resetPhotoReviewState();
    dispatch({ type: "cancel" });
  };

  useEffect(() => {
    if (stage === "closed") {
      onClose();
    }
  }, [stage, onClose]);

  useEffect(() => {
    if (stage !== "requesting_camera") {
      return;
    }

    let cancelled = false;
    setErrorMessage("");

    const start = async () => {
      const result = await requestEnvironmentCameraStream(
        typeof navigator === "undefined" ? undefined : navigator.mediaDevices,
      );

      if (cancelled) {
        if (result.status === "success") {
          stopMediaStreamTracks(result.stream);
        }
        return;
      }

      if (result.status === "success") {
        streamRef.current = result.stream;
        dispatch({ type: "camera_ready" });
      } else {
        setErrorMessage(result.message);
        dispatch({ type: "camera_error", kind: result.kind });
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [stage]);

  useEffect(() => {
    if (stage === "camera_preview" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  useEffect(
    () => () => {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl);
      }
    },
    [sourcePreviewUrl],
  );

  useEffect(
    () => () => {
      if (scanPreviewUrl) {
        URL.revokeObjectURL(scanPreviewUrl);
      }
    },
    [scanPreviewUrl],
  );

  useEffect(() => {
    return () => {
      scanRequestIdRef.current += 1;
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preparePhotoForReview = async (file: File) => {
    scanRequestIdRef.current += 1;
    const requestId = scanRequestIdRef.current;

    stopActiveStream();
    resetPhotoReviewState();

    if (!isFileWithinSizeLimit(file)) {
      setErrorMessage(getFileTooLargeMessage(file));
      return;
    }

    setErrorMessage("");
    setStatusMessage(PHOTO_LOADING_MESSAGE);
    sourceFileRef.current = file;
    setSourcePreviewUrl(URL.createObjectURL(file));
    dispatch({ type: "photo_loading" });
    await Promise.resolve();

    if (scanRequestIdRef.current !== requestId) {
      return;
    }

    setStatusMessage(PHOTO_DETECTING_MESSAGE);
    dispatch({ type: "photo_captured" });

    try {
      const { scanDocumentFile } = await import("../lib/documentScanner");
      const result = await scanDocumentFile(file);

      if (scanRequestIdRef.current !== requestId) {
        return;
      }

      if (result.status === "ready") {
        scannedFileRef.current = result.scannedFile;
        setScanPreviewUrl(URL.createObjectURL(result.scannedFile));
        setScanWarnings(result.warnings);
        setStatusMessage("");
        dispatch({ type: "scan_ready" });
      } else {
        setScanWarnings([]);
        setStatusMessage("");
        dispatch({ type: "scan_failed" });
      }
    } catch {
      if (scanRequestIdRef.current !== requestId) {
        return;
      }

      setScanWarnings([]);
      setStatusMessage("");
      dispatch({ type: "scan_failed" });
    }
  };

  const handleChooseTakePhoto = () => {
    dispatch({ type: "choose_take_photo" });
  };

  const handleUploadExisting = (file: File) => {
    void preparePhotoForReview(file);
  };

  useEffect(() => {
    if (initialPhotoFile && !initialPhotoSeededRef.current) {
      initialPhotoSeededRef.current = true;
      void preparePhotoForReview(initialPhotoFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTakePhotoClick = async () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    try {
      const file = await capturePhotoFromVideoElement(
        videoElement,
        getCapturedPhotoFileName(currentSection),
      );
      await preparePhotoForReview(file);
    } catch {
      stopActiveStream();
      setErrorMessage("Could not capture a photo. Try again or upload a photo instead.");
    }
  };

  const handleTryAgain = () => {
    scanRequestIdRef.current += 1;
    resetPhotoReviewState();
    if (onTryAgain) {
      onTryAgain();
      return;
    }
    dispatch({ type: "open" });
  };

  const handleRetake = () => {
    scanRequestIdRef.current += 1;
    resetPhotoReviewState();
    dispatch({ type: "retake" });
  };

  const sendPhotoToOcr = (
    file: File,
    warnings: string[] = [],
    isDocumentScan = false,
  ) => {
    onUsePhotos([
      {
        file,
        section: currentSection,
        label: getPhotoCaptureSectionLabel(currentSection),
        warnings,
        isDocumentScan,
        sourceFileName: sourceFileRef.current?.name,
      },
    ]);
    resetPhotoReviewState();
    dispatch({ type: "use_photo" });
  };

  const handleReadScan = () => {
    const scannedFile = scannedFileRef.current;

    if (!scannedFile) {
      return;
    }

    sendPhotoToOcr(scannedFile, scanWarnings, true);
  };

  const handleUseOriginalPhoto = () => {
    const sourceFile = sourceFileRef.current;

    if (!sourceFile) {
      return;
    }

    sendPhotoToOcr(sourceFile, [PHOTO_USE_ORIGINAL_WARNING], false);
  };

  const handleEditManually = () => {
    onEditManually?.();
    scanRequestIdRef.current += 1;
    stopActiveStream();
    resetPhotoReviewState();
    dispatch({ type: "cancel" });
  };

  const isCameraWorkStage =
    stage === "camera_preview" ||
    stage === "scan_ready";
  const isBusy = stage === "loading_photo" || stage === "detecting_document";

  return (
    <div
      className={`fixed inset-0 z-[90] flex justify-center bg-slate-950/85 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm sm:px-4 sm:py-6 ${
        isCameraWorkStage ? "items-stretch overflow-hidden" : "items-start overflow-y-auto sm:items-center"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-capture-panel-title"
    >
      <div
        className={`w-full rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:p-6 ${
          isCameraWorkStage ? "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden" : ""
        } ${isCameraWorkStage ? "max-w-3xl" : "max-w-lg"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 id="photo-capture-panel-title" className="text-xl font-bold text-white sm:text-2xl">
            Take or upload a photo
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-12 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            aria-label="Close photo capture"
          >
            Cancel
          </button>
        </div>

        <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
          {FILE_SIZE_LIMIT_HELPER}
        </p>

        {stage === "choice" ? (
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleChooseTakePhoto}
              className="rounded-lg border border-emerald-300/50 bg-emerald-400 px-4 py-4 text-left text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <span className="block text-base font-black">{PHOTO_TAKE_NEW_PHOTO_LABEL}</span>
              <span className="mt-2 block text-sm font-semibold leading-6">
                {currentSection === "additional"
                  ? "Take one closer photo of the hard-to-read section, then review the prepared scan before OCR."
                  : PHOTO_TAKE_NEW_PHOTO_DESCRIPTION}
              </span>
            </button>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} />
          </div>
        ) : null}

        {stage === "requesting_camera" ? (
          <p role="status" aria-live="polite" aria-atomic="true" className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
            Requesting camera access...
          </p>
        ) : null}

        {stage === "camera_preview" ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="shrink-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-cyan-50"
            >
              <p className="text-sm font-black">{currentSectionTitle}</p>
              <p className="mt-1 text-base font-black leading-6">{currentGuidanceMessage}</p>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[calc(100dvh-15rem)] min-h-0 w-full object-contain"
              />
            </div>
            <div className={CAMERA_PREVIEW_ACTIONS_CLASSNAME}>
              <button
                type="button"
                onClick={() => void handleTakePhotoClick()}
                className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {PHOTO_TAKE_PHOTO_LABEL}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_CANCEL_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {isBusy ? (
          <div className="mt-5 grid gap-3">
            <p role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold leading-6 text-cyan-50">
              {statusMessage || PHOTO_DETECTING_MESSAGE}
            </p>
            {sourcePreviewUrl ? (
              <img
                src={sourcePreviewUrl}
                alt="Selected photo preview"
                className="max-h-64 w-full rounded-lg border border-white/10 object-contain"
              />
            ) : null}
          </div>
        ) : null}

        {stage === "scan_ready" ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <div className={PHOTO_REVIEW_CONTENT_CLASSNAME}>
              {scanPreviewUrl ? (
                <img
                  src={scanPreviewUrl}
                  alt="Prepared document scan preview"
                  className="max-h-[min(62dvh,36rem)] w-full rounded-lg border border-white/10 bg-black object-contain"
                />
              ) : null}
              <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-lg font-black leading-7 text-emerald-50">
                {PHOTO_SCAN_REVIEW_QUESTION}
              </p>
            </div>
            <div className={PHOTO_REVIEW_ACTIONS_CLASSNAME}>
              <button
                type="button"
                onClick={handleReadScan}
                className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {PHOTO_USE_SCAN_LABEL}
              </button>
              <button
                type="button"
                onClick={handleTryAgain}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_TRY_AGAIN_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "no_document" ? (
          <div className="mt-5 grid gap-3">
            <div role="alert" aria-live="assertive" aria-atomic="true" className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-50">
              <p className="font-black">{PHOTO_NO_DOCUMENT_MESSAGE}</p>
              <p className="mt-2 text-sm leading-6 text-amber-100/90">
                {PHOTO_CAPTURE_LOW_QUALITY_GUIDANCE}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-100/90">
                {PHOTO_USE_ORIGINAL_WARNING}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleRetake}
                className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {PHOTO_RETAKE_PHOTO_LABEL}
              </button>
              <UploadExistingPhotoInput
                onSelect={handleUploadExisting}
                disabled={isBusy}
                label={PHOTO_UPLOAD_CLEARER_LABEL}
              />
              <button
                type="button"
                onClick={handleUseOriginalPhoto}
                className="min-h-12 rounded-lg border border-amber-200/40 bg-slate-950/60 px-4 py-3 text-sm font-bold text-amber-50 transition hover:border-amber-100 hover:text-white"
              >
                {PHOTO_USE_ORIGINAL_LABEL}
              </button>
              <button
                type="button"
                onClick={handleEditManually}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_EDIT_MANUALLY_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "permission_denied" ? (
          <div className="mt-5 grid gap-3">
            <p role="alert" aria-live="assertive" aria-atomic="true" className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              {CAMERA_PERMISSION_DENIED_MESSAGE}
            </p>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} />
          </div>
        ) : null}

        {stage === "camera_unavailable" ? (
          <div className="mt-5 grid gap-3">
            <p role="alert" aria-live="assertive" aria-atomic="true" className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              {CAMERA_UNAVAILABLE_MESSAGE}
            </p>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} />
          </div>
        ) : null}

        {errorMessage &&
        stage !== "permission_denied" &&
        stage !== "camera_unavailable" ? (
          <p role="alert" aria-live="assertive" aria-atomic="true" className="mt-3 text-sm leading-6 text-amber-200">{errorMessage}</p>
        ) : null}

        <p className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
          {PHOTO_STAYS_LOCAL_MESSAGE}
        </p>
      </div>
    </div>
  );
}
