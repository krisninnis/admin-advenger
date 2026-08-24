import { useEffect, useReducer, useRef, useState } from "react";
import { DocumentCropReview } from "./DocumentCropReview";
import { photoCaptureAcceptAttribute } from "../lib/fileIntakeAccept";
import {
  FILE_SIZE_LIMIT_HELPER,
  getFileTooLargeMessage,
  isFileWithinSizeLimit,
} from "../lib/fileSizeLimit";
import {
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_UNAVAILABLE_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_EDIT_MANUALLY_LABEL,
  PHOTO_LOADING_MESSAGE,
  PHOTO_RETAKE_PHOTO_LABEL,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_UPLOAD_CLEARER_LABEL,
  PHOTO_USE_ORIGINAL_LABEL,
  PHOTO_USE_ORIGINAL_WARNING,
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
import type { DocumentScannerQuad } from "../lib/documentScanner";
import type {
  DocumentEnhancementMode,
  DocumentScannerEngine,
} from "../lib/documentScannerV2";

type PhotoCapturePanelProps = {
  onUsePhotos: (photos: CapturedPhotoForOcr[]) => void;
  onClose: () => void;
  onCancel?: () => void;
  onTryAgain?: () => void;
  onEditManually?: () => void;
  defaultSection?: PhotoCaptureSection;
  initialPhotoFile?: File;
};

type UploadExistingPhotoInputProps = {
  onSelect: (file: File) => void;
  disabled?: boolean;
  label?: string;
};

type LiveDetection = {
  quad: DocumentScannerQuad;
  width: number;
  height: number;
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

const closeEnough = (a: DocumentScannerQuad, b: DocumentScannerQuad, tolerance: number): boolean =>
  (Object.keys(a) as Array<keyof DocumentScannerQuad>).every((key) =>
    Math.hypot(a[key].x - b[key].x, a[key].y - b[key].y) <= tolerance,
  );

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
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [sourceDimensions, setSourceDimensions] = useState({ width: 0, height: 0 });
  const [quad, setQuad] = useState<DocumentScannerQuad | null>(null);
  const [detectedQuad, setDetectedQuad] = useState<DocumentScannerQuad | undefined>();
  const [enhancementMode, setEnhancementMode] = useState<DocumentEnhancementMode>("clean");
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [liveDetection, setLiveDetection] = useState<LiveDetection | null>(null);
  const [liveStatus, setLiveStatus] = useState("Finding the page…");

  const initialPhotoSeededRef = useRef(false);
  const scanRequestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceFileRef = useRef<File | undefined>(undefined);
  const scannedFileRef = useRef<File | undefined>(undefined);
  const sourceOriginRef = useRef<"camera" | "upload">("upload");
  const engineRef = useRef<DocumentScannerEngine | null>(null);

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
    setLiveDetection(null);
    setLiveStatus("Finding the page…");
  };

  const revokeUrl = (url: string) => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  };

  const resetPhotoReviewState = () => {
    previewRequestIdRef.current += 1;
    setSourcePreviewUrl((current) => {
      revokeUrl(current);
      return "";
    });
    setProcessedPreviewUrl((current) => {
      revokeUrl(current);
      return "";
    });
    setStatusMessage("");
    setScanWarnings([]);
    setSourceDimensions({ width: 0, height: 0 });
    setQuad(null);
    setDetectedQuad(undefined);
    setEnhancementMode("clean");
    setIsRenderingPreview(false);
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

  useEffect(() => {
    if (stage !== "camera_preview") {
      return;
    }

    let cancelled = false;
    let running = false;
    let previousQuad: DocumentScannerQuad | null = null;
    let stableFrames = 0;
    const analysisCanvas = document.createElement("canvas");

    const analyse = async () => {
      if (cancelled || running) {
        return;
      }
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return;
      }
      running = true;
      try {
        if (!engineRef.current) {
          const { getDocumentScannerEngine } = await import("../lib/documentScannerV2");
          engineRef.current = await getDocumentScannerEngine();
        }
        const maxLongEdge = 480;
        const scale = Math.min(1, maxLongEdge / Math.max(video.videoWidth, video.videoHeight));
        analysisCanvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        analysisCanvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = analysisCanvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return;
        }
        context.drawImage(video, 0, 0, analysisCanvas.width, analysisCanvas.height);
        const pixels = context.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
        const detection = engineRef.current.detectPixels(
          pixels.data,
          analysisCanvas.width,
          analysisCanvas.height,
        );
        if (cancelled) {
          return;
        }
        if (detection.status === "detected") {
          const tolerance = Math.max(analysisCanvas.width, analysisCanvas.height) * 0.035;
          stableFrames = previousQuad && closeEnough(previousQuad, detection.quad, tolerance)
            ? stableFrames + 1
            : 0;
          previousQuad = detection.quad;
          setLiveDetection({
            quad: detection.quad,
            width: analysisCanvas.width,
            height: analysisCanvas.height,
          });
          setLiveStatus(stableFrames >= 2 ? "Hold steady…" : "Page found");
        } else {
          previousQuad = null;
          stableFrames = 0;
          setLiveDetection(null);
          setLiveStatus("Couldn't find all the edges — you can still take the photo.");
        }
      } catch {
        if (!cancelled) {
          setLiveDetection(null);
          setLiveStatus("Couldn't find all the edges — you can still take the photo.");
        }
      } finally {
        running = false;
      }
    };

    setLiveStatus("Finding the page…");
    void analyse();
    const timer = window.setInterval(() => void analyse(), 450);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [stage]);

  useEffect(() => {
    return () => {
      scanRequestIdRef.current += 1;
      previewRequestIdRef.current += 1;
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

  const renderPreview = async (
    sourceFile: File,
    nextQuad: DocumentScannerQuad,
    mode: DocumentEnhancementMode,
  ) => {
    previewRequestIdRef.current += 1;
    const requestId = previewRequestIdRef.current;
    setIsRenderingPreview(true);
    try {
      if (!engineRef.current) {
        const { getDocumentScannerEngine } = await import("../lib/documentScannerV2");
        engineRef.current = await getDocumentScannerEngine();
      }
      const rendered = await engineRef.current.render(sourceFile, nextQuad, mode);
      if (previewRequestIdRef.current !== requestId) {
        return;
      }
      scannedFileRef.current = rendered;
      setProcessedPreviewUrl((current) => {
        revokeUrl(current);
        return URL.createObjectURL(rendered);
      });
      setErrorMessage("");
    } catch {
      if (previewRequestIdRef.current === requestId) {
        scannedFileRef.current = undefined;
        setProcessedPreviewUrl((current) => {
          revokeUrl(current);
          return "";
        });
        setErrorMessage("That crop could not be prepared. Move the corners apart or use the full image.");
      }
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setIsRenderingPreview(false);
      }
    }
  };

  useEffect(() => {
    if (stage !== "scan_ready" || !quad || !sourceFileRef.current) {
      return;
    }
    const sourceFile = sourceFileRef.current;
    const timer = window.setTimeout(
      () => void renderPreview(sourceFile, quad, enhancementMode),
      140,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, quad, enhancementMode]);

  const preparePhotoForReview = async (file: File, origin: "camera" | "upload") => {
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
    sourceOriginRef.current = origin;
    setSourcePreviewUrl(URL.createObjectURL(file));
    dispatch({ type: "photo_loading" });
    await Promise.resolve();
    if (scanRequestIdRef.current !== requestId) {
      return;
    }

    setStatusMessage("Finding the page edges…");
    dispatch({ type: "photo_captured" });
    try {
      const { getDocumentScannerEngine } = await import("../lib/documentScannerV2");
      const engine = await getDocumentScannerEngine();
      engineRef.current = engine;
      const prepared = await engine.prepare(file);
      if (scanRequestIdRef.current !== requestId) {
        return;
      }
      setSourceDimensions(prepared.sourceDimensions);
      setQuad(prepared.quad);
      setDetectedQuad(prepared.detectedQuad);
      setScanWarnings(prepared.warnings);
      setStatusMessage("");
      dispatch({ type: "scan_ready" });
    } catch {
      if (scanRequestIdRef.current !== requestId) {
        return;
      }
      setStatusMessage("");
      setErrorMessage("The scanner could not prepare this photo. You can retake it or use the original photo.");
      dispatch({ type: "scan_failed" });
    }
  };

  const handleChooseTakePhoto = () => dispatch({ type: "choose_take_photo" });
  const handleUploadExisting = (file: File) => void preparePhotoForReview(file, "upload");

  useEffect(() => {
    if (initialPhotoFile && !initialPhotoSeededRef.current) {
      initialPhotoSeededRef.current = true;
      void preparePhotoForReview(initialPhotoFile, "upload");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTakePhotoClick = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    try {
      const file = await capturePhotoFromVideoElement(
        video,
        getCapturedPhotoFileName(currentSection),
      );
      await preparePhotoForReview(file, "camera");
    } catch {
      stopActiveStream();
      setErrorMessage("Could not capture a photo. Try again or upload a photo instead.");
    }
  };

  const handleTryAgain = () => {
    scanRequestIdRef.current += 1;
    stopActiveStream();
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
        origin: sourceOriginRef.current,
      },
    ]);
    resetPhotoReviewState();
    dispatch({ type: "use_photo" });
  };

  const handleUseScan = () => {
    if (scannedFileRef.current && !isRenderingPreview) {
      sendPhotoToOcr(scannedFileRef.current, scanWarnings, true);
    }
  };

  const handleUseOriginalPhoto = () => {
    if (sourceFileRef.current) {
      sendPhotoToOcr(sourceFileRef.current, [PHOTO_USE_ORIGINAL_WARNING], false);
    }
  };

  const handleEditManually = () => {
    onEditManually?.();
    scanRequestIdRef.current += 1;
    stopActiveStream();
    resetPhotoReviewState();
    dispatch({ type: "cancel" });
  };

  const isCameraWorkStage = stage === "camera_preview" || stage === "scan_ready";
  const isBusy = stage === "loading_photo" || stage === "detecting_document";

  return (
    <div
      className={`fixed inset-0 z-[90] flex justify-center bg-slate-950/90 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-sm sm:px-4 sm:py-5 ${
        isCameraWorkStage
          ? "items-stretch overflow-hidden"
          : "items-start overflow-y-auto sm:items-center"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-capture-panel-title"
    >
      <div
        className={`w-full rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:p-6 ${
          isCameraWorkStage
            ? "flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden"
            : ""
        } ${isCameraWorkStage ? "max-w-5xl" : "max-w-lg"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="photo-capture-panel-title" className="text-xl font-bold text-white sm:text-2xl">
              Scan a document
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-300">
              Fit the whole page inside the frame. AdminAvenger will try to find the edges.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-12 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            aria-label="Close document scanner"
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
              className="min-h-12 rounded-lg border border-emerald-300/50 bg-emerald-400 px-4 py-4 text-left text-slate-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <span className="block text-base font-black">{PHOTO_TAKE_NEW_PHOTO_LABEL}</span>
              <span className="mt-2 block text-sm font-semibold leading-6">
                {currentSection === "additional"
                  ? "Take one closer photo of the hard-to-read section, then check the crop before OCR."
                  : PHOTO_TAKE_NEW_PHOTO_DESCRIPTION}
              </span>
            </button>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} />
          </div>
        ) : null}

        {stage === "requesting_camera" ? (
          <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
            Requesting camera access…
          </p>
        ) : null}

        {stage === "camera_preview" ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
            <div role="status" aria-live="polite" aria-atomic="true" className="shrink-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-cyan-50">
              <p className="text-sm font-black">{currentSectionTitle}</p>
              <p className="mt-1 text-sm font-semibold leading-6">{currentGuidanceMessage}</p>
              <p className="mt-1 text-base font-black leading-6">{liveStatus}</p>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[calc(100dvh-17rem)] min-h-0 h-full w-full object-contain"
              />
              {liveDetection ? (
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${liveDetection.width} ${liveDetection.height}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <polygon
                    points={[
                      liveDetection.quad.topLeft,
                      liveDetection.quad.topRight,
                      liveDetection.quad.bottomRight,
                      liveDetection.quad.bottomLeft,
                    ]
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                    fill="rgba(16,185,129,0.10)"
                    stroke="rgb(110 231 183)"
                    strokeWidth="4"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : null}
            </div>
            <div className={CAMERA_PREVIEW_ACTIONS_CLASSNAME}>
              <button
                type="button"
                onClick={() => void handleTakePhotoClick()}
                className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {PHOTO_TAKE_PHOTO_LABEL}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200"
              >
                {PHOTO_CANCEL_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {isBusy ? (
          <div className="mt-5 grid gap-3">
            <p role="status" aria-live="polite" className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-bold leading-6 text-cyan-50">
              {statusMessage || "Finding the page edges…"}
            </p>
            {sourcePreviewUrl ? (
              <img src={sourcePreviewUrl} alt="Selected photo preview" className="max-h-64 w-full rounded-lg border border-white/10 object-contain" />
            ) : null}
          </div>
        ) : null}

        {stage === "scan_ready" && sourcePreviewUrl && quad ? (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
            <DocumentCropReview
              sourcePreviewUrl={sourcePreviewUrl}
              processedPreviewUrl={processedPreviewUrl}
              dimensions={sourceDimensions}
              quad={quad}
              detectedQuad={detectedQuad}
              mode={enhancementMode}
              warnings={scanWarnings}
              isRendering={isRenderingPreview}
              onQuadChange={setQuad}
              onModeChange={setEnhancementMode}
              onResetCorners={() => detectedQuad && setQuad(detectedQuad)}
              onUseFullImage={() => setScanWarnings([])}
              onRetake={handleRetake}
              onUseScan={handleUseScan}
            />
          </div>
        ) : null}

        {stage === "no_document" ? (
          <div className="mt-5 grid gap-3">
            <div role="alert" aria-live="assertive" className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-4 text-sm leading-6 text-amber-50">
              <p className="font-black">The scanner could not prepare this photo.</p>
              <p className="mt-2">You can use the original photo, retake it, upload another image, or edit the text manually.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={handleRetake} className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950">
                {PHOTO_RETAKE_PHOTO_LABEL}
              </button>
              <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} label={PHOTO_UPLOAD_CLEARER_LABEL} />
              <button type="button" onClick={handleUseOriginalPhoto} className="min-h-12 rounded-lg border border-amber-200/40 bg-slate-950/60 px-4 py-3 text-sm font-bold text-amber-50">
                {PHOTO_USE_ORIGINAL_LABEL}
              </button>
              <button type="button" onClick={handleEditManually} className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200">
                {PHOTO_EDIT_MANUALLY_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "permission_denied" || stage === "camera_unavailable" ? (
          <div className="mt-5 grid gap-3">
            <p role="alert" aria-live="assertive" className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              {stage === "permission_denied"
                ? CAMERA_PERMISSION_DENIED_MESSAGE
                : CAMERA_UNAVAILABLE_MESSAGE}
            </p>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} disabled={isBusy} />
          </div>
        ) : null}

        {errorMessage && stage !== "permission_denied" && stage !== "camera_unavailable" ? (
          <p role="alert" aria-live="assertive" className="mt-3 text-sm leading-6 text-amber-200">
            {errorMessage}
          </p>
        ) : null}

        <p className="mt-4 shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
          {PHOTO_STAYS_LOCAL_MESSAGE}
        </p>
      </div>
    </div>
  );
}
