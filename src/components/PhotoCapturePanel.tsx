import { useEffect, useReducer, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { photoCaptureAcceptAttribute } from "../lib/fileIntakeAccept";
import {
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  CAMERA_GUIDANCE_FRAME_CLASSNAME,
  CAMERA_GUIDANCE_TIPS,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_UNAVAILABLE_MESSAGE,
  PHOTO_ADJUST_AFTER_CAPTURE_MESSAGE,
  PHOTO_ADJUST_INSTRUCTION,
  PHOTO_ADJUST_TITLE,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_RETAKE_LABEL,
  PHOTO_REVIEW_ACTIONS_CLASSNAME,
  PHOTO_REVIEW_CONTENT_CLASSNAME,
  PHOTO_CROP_FALLBACK_WARNING,
  PHOTO_FULL_PHOTO_WARNING,
  PHOTO_READ_SELECTED_AREA_LABEL,
  PHOTO_UNREADABLE_FALLBACK_MESSAGE,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_ADD_CLOSE_UP_DESCRIPTION,
  PHOTO_ADD_CLOSE_UP_LABEL,
  PHOTO_USE_FULL_PHOTO_LABEL,
  capturePhotoFromVideoElement,
  cropImageBlobToRect,
  createCapturedPhotoFile,
  getDefaultManualCropRect,
  getCameraGuidanceFitMessage,
  getCapturedPhotoFileName,
  getPhotoCaptureSectionLabel,
  getPhotoCaptureSectionTitle,
  mapDisplayedFrameToImageCrop,
  photoCaptureReducer,
  requestEnvironmentCameraStream,
  stopMediaStreamTracks,
  type CapturedPhotoForOcr,
  type CropRectRatio,
  type PhotoCaptureSection,
} from "../lib/photoCapture";

type PhotoCapturePanelProps = {
  // Feeds a captured/uploaded photo straight into the existing photo intake
  // path (the same handler the compact "+" menu's "Take photo" already
  // uses) - this component never introduces a second intake path.
  onUsePhotos: (photos: CapturedPhotoForOcr[]) => void;
  onClose: () => void;
  defaultSection?: PhotoCaptureSection;
};

function UploadExistingPhotoInput({ onSelect }: { onSelect: (file: File) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus-within:ring-2 focus-within:ring-emerald-300/40">
      Upload existing photo
      <input
        type="file"
        accept={photoCaptureAcceptAttribute}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file);
          }
        }}
        className="sr-only"
      />
    </label>
  );
}

export function PhotoCapturePanel({ onUsePhotos, onClose, defaultSection }: PhotoCapturePanelProps) {
  const [stage, dispatch] = useReducer(photoCaptureReducer, "choice");
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState("");
  const [isCropping, setIsCropping] = useState(false);
  const [cropWarning, setCropWarning] = useState("");
  const [cropRect, setCropRect] = useState<CropRectRatio>(() => getDefaultManualCropRect());
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const cropAreaRef = useRef<HTMLDivElement | null>(null);
  const capturedFileRef = useRef<File | undefined>(undefined);
  const activeCropDragRef = useRef<{
    mode: "move" | "top_left" | "top_right" | "bottom_left" | "bottom_right";
    startX: number;
    startY: number;
    startRect: CropRectRatio;
  } | null>(null);

  // One photo per visit: the default flow captures a single full-page photo.
  // The panel only ever asks for a close-up when it was opened via the
  // optional "Add close-up photo" follow-up (defaultSection === "additional").
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

  const clearCapturedPreview = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }

    setCapturedPreviewUrl("");
    setCropWarning("");
    setIsCropping(false);
    setCropRect(getDefaultManualCropRect());
    capturedFileRef.current = undefined;
    activeCropDragRef.current = null;
  };

  const handleCancel = () => {
    stopActiveStream();
    clearCapturedPreview();
    dispatch({ type: "cancel" });
  };

  // Close whenever the reducer reaches "closed" - reached via cancel or
  // use_photo. Keeping this in one place means every path that closes the
  // panel (button clicks, Escape, use-photo) goes through the same cleanup.
  useEffect(() => {
    if (stage === "closed") {
      onClose();
    }
  }, [stage, onClose]);

  // Request the rear/environment camera whenever the user chooses "Take a
  // new photo" (or retakes). Guards against a stream resolving after the
  // panel has already moved on, so a late-arriving camera never stays live.
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

  // Attach the live stream to the <video> preview once it is rendered.
  useEffect(() => {
    if (stage === "camera_preview" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

  // Belt-and-suspenders cleanup: stop the camera if the whole component
  // unmounts (modal closed some other way) while a stream is still live.
  useEffect(() => {
    return () => {
      stopMediaStreamTracks(streamRef.current);
      streamRef.current = null;
      activeCropDragRef.current = null;
      window.removeEventListener("pointermove", updateCropFromPointer);
      window.removeEventListener("pointerup", stopCropDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleChooseTakePhoto = () => {
    dispatch({ type: "choose_take_photo" });
  };

  const handleUploadExisting = (file: File) => {
    capturedFileRef.current = file;
    setCropRect(getDefaultManualCropRect());
    setCropWarning("");
    setCapturedPreviewUrl(URL.createObjectURL(file));
    dispatch({ type: "photo_captured" });
  };

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
      const dimensions = {
        width: videoElement.videoWidth || CAMERA_IDEAL_WIDTH,
        height: videoElement.videoHeight || CAMERA_IDEAL_HEIGHT,
      };
      const frameElement = frameRef.current;
      const mappedCropRect = frameElement
        ? mapDisplayedFrameToImageCrop({
            mediaRect: videoElement.getBoundingClientRect(),
            frameRect: frameElement.getBoundingClientRect(),
            naturalWidth: dimensions.width,
            naturalHeight: dimensions.height,
            objectFit: "contain",
          })
        : null;
      // Capture-complete cleanup - the camera does not need to stay on once
      // a frame has been captured.
      stopActiveStream();
      capturedFileRef.current = file;
      setCropRect(getDefaultManualCropRect(mappedCropRect));
      setCropWarning("");
      setCapturedPreviewUrl(URL.createObjectURL(file));
      dispatch({ type: "photo_captured" });
    } catch {
      setErrorMessage("Could not capture a photo. Try again or upload a photo instead.");
    }
  };

  const handleRetake = () => {
    clearCapturedPreview();
    dispatch({ type: "retake" });
  };

  const updateCropFromPointer = (event: PointerEvent | ReactPointerEvent<HTMLDivElement>) => {
    const activeDrag = activeCropDragRef.current;
    const cropArea = cropAreaRef.current;

    if (!activeDrag || !cropArea) {
      return;
    }

    const bounds = cropArea.getBoundingClientRect();
    const deltaX = (event.clientX - activeDrag.startX) / bounds.width;
    const deltaY = (event.clientY - activeDrag.startY) / bounds.height;
    const start = activeDrag.startRect;

    setCropRect(() => {
      if (activeDrag.mode === "move") {
        const x = Math.min(Math.max(0, start.x + deltaX), 1 - start.width);
        const y = Math.min(Math.max(0, start.y + deltaY), 1 - start.height);
        return { ...start, x, y };
      }

      let left = start.x;
      let top = start.y;
      let right = start.x + start.width;
      let bottom = start.y + start.height;

      if (activeDrag.mode.includes("left")) {
        left = Math.min(Math.max(0, start.x + deltaX), right - 0.2);
      }
      if (activeDrag.mode.includes("right")) {
        right = Math.max(Math.min(1, start.x + start.width + deltaX), left + 0.2);
      }
      if (activeDrag.mode.includes("top")) {
        top = Math.min(Math.max(0, start.y + deltaY), bottom - 0.2);
      }
      if (activeDrag.mode.includes("bottom")) {
        bottom = Math.max(Math.min(1, start.y + start.height + deltaY), top + 0.2);
      }

      return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    });
  };

  const stopCropDrag = () => {
    activeCropDragRef.current = null;
    window.removeEventListener("pointermove", updateCropFromPointer);
    window.removeEventListener("pointerup", stopCropDrag);
  };

  const startCropDrag = (
    mode: NonNullable<typeof activeCropDragRef.current>["mode"],
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    activeCropDragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startRect: cropRect,
    };
    window.addEventListener("pointermove", updateCropFromPointer);
    window.addEventListener("pointerup", stopCropDrag, { once: true });
  };

  const sendPhotoToOcr = (file: File, warnings: string[] = []) => {
    onUsePhotos([
      {
        file,
        section: currentSection,
        label: getPhotoCaptureSectionLabel(currentSection),
        warnings,
      },
    ]);
    clearCapturedPreview();
    dispatch({ type: "use_photo" });
  };

  const handleReadSelectedArea = async () => {
    const sourceFile = capturedFileRef.current;

    if (!sourceFile || isCropping) {
      return;
    }

    setIsCropping(true);
    setCropWarning("");

    try {
      const croppedBlob = await cropImageBlobToRect(sourceFile, cropRect, {
        type: sourceFile.type,
        safety: "manual",
      });
      const croppedFile = createCapturedPhotoFile(
        croppedBlob,
        getCapturedPhotoFileName(currentSection),
      );
      sendPhotoToOcr(croppedFile);
    } catch {
      setCropWarning(PHOTO_CROP_FALLBACK_WARNING);
      sendPhotoToOcr(sourceFile, [PHOTO_CROP_FALLBACK_WARNING]);
    } finally {
      setIsCropping(false);
    }
  };

  const handleUseFullPhoto = () => {
    const sourceFile = capturedFileRef.current;

    if (!sourceFile) {
      return;
    }

    sendPhotoToOcr(sourceFile, [PHOTO_FULL_PHOTO_WARNING]);
  };

  const isCameraWorkStage = stage === "camera_preview" || stage === "captured";

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
        className={`w-full max-w-lg rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:p-6 ${
          isCameraWorkStage ? "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden" : ""
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 id="photo-capture-panel-title" className="text-xl font-bold text-white sm:text-2xl">
            Take or upload a photo
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            aria-label="Close photo capture"
          >
            Cancel
          </button>
        </div>

        {stage === "choice" ? (
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={handleChooseTakePhoto}
              className="rounded-lg border border-emerald-300/50 bg-emerald-400 px-4 py-4 text-left text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <span className="block text-base font-black">
                {currentSection === "additional" ? PHOTO_ADD_CLOSE_UP_LABEL : PHOTO_TAKE_NEW_PHOTO_LABEL}
              </span>
              <span className="mt-2 block text-sm font-semibold leading-6">
                {currentSection === "additional"
                  ? PHOTO_ADD_CLOSE_UP_DESCRIPTION
                  : PHOTO_TAKE_NEW_PHOTO_DESCRIPTION}
              </span>
            </button>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} />
          </div>
        ) : null}

        {stage === "requesting_camera" ? (
          <p className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
            Requesting camera access...
          </p>
        ) : null}

        {stage === "camera_preview" ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
            <div className="shrink-0 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-cyan-50">
              <p className="text-sm font-black">{currentSectionTitle}</p>
              <p className="mt-1 text-base font-black leading-6">{currentGuidanceMessage}.</p>
              <p className="mt-1 text-sm leading-6 text-cyan-50/85">
                Try to fill most of the frame. {PHOTO_ADJUST_AFTER_CAPTURE_MESSAGE}
              </p>
            </div>
            {/* The A4-shaped frame is a plain CSS guide, not real edge
                detection or the final crop. The user confirms the actual
                OCR area in the adjust step after taking the photo. */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[calc(100dvh-15rem)] min-h-0 w-full object-contain"
              />
              <div ref={frameRef} aria-hidden="true" className={CAMERA_GUIDANCE_FRAME_CLASSNAME} />
              <p
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs font-bold text-white [text-shadow:0_1px_3px_rgb(0_0_0_/_0.8)]"
              >
                {currentGuidanceMessage}
              </p>
            </div>
            <ul className="grid shrink-0 grid-cols-2 gap-x-3 gap-y-1 text-xs leading-5 text-slate-400 sm:grid-cols-4">
              {CAMERA_GUIDANCE_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <div className={CAMERA_PREVIEW_ACTIONS_CLASSNAME}>
              <button
                type="button"
                onClick={() => void handleTakePhotoClick()}
                className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                {PHOTO_TAKE_PHOTO_LABEL}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_CANCEL_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "captured" ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            <div className={PHOTO_REVIEW_CONTENT_CLASSNAME}>
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
                <p className="text-sm font-black text-emerald-50">{PHOTO_ADJUST_TITLE}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-50/85">
                  {PHOTO_ADJUST_INSTRUCTION}
                </p>
              </div>
              {capturedPreviewUrl ? (
                <div
                  ref={cropAreaRef}
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-black"
                >
                  <img
                    src={capturedPreviewUrl}
                    alt="Captured photo preview"
                    className="max-h-[min(46dvh,22rem)] w-full select-none object-contain"
                    draggable={false}
                  />
                  <div
                    className="absolute border-2 border-emerald-300 bg-emerald-300/10 shadow-[0_0_0_9999px_rgb(15_23_42_/_0.45)]"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.width * 100}%`,
                      height: `${cropRect.height * 100}%`,
                    }}
                    onPointerDown={(event) => startCropDrag("move", event)}
                    role="presentation"
                  >
                    {[
                      ["top_left", "left-0 top-0 -translate-x-1/2 -translate-y-1/2"],
                      ["top_right", "right-0 top-0 translate-x-1/2 -translate-y-1/2"],
                      ["bottom_left", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2"],
                      ["bottom_right", "bottom-0 right-0 translate-x-1/2 translate-y-1/2"],
                    ].map(([mode, className]) => (
                      <div
                        key={mode}
                        className={`absolute h-5 w-5 rounded-full border-2 border-slate-950 bg-emerald-300 ${className}`}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          startCropDrag(
                            mode as NonNullable<typeof activeCropDragRef.current>["mode"],
                            event,
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
                <p className="font-bold">OCR will use the selected area after you confirm.</p>
                <p className="mt-1 text-cyan-50/80">
                  Keep a small border around the text. Use the full photo if cropping feels wrong.
                </p>
              </div>
              {cropWarning ? (
                <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold leading-6 text-amber-100">
                  {cropWarning}
                </div>
              ) : null}
              <p className="text-sm leading-6 text-slate-400">{PHOTO_UNREADABLE_FALLBACK_MESSAGE}</p>
            </div>
            <div className={PHOTO_REVIEW_ACTIONS_CLASSNAME}>
              <button
                type="button"
                onClick={() => void handleReadSelectedArea()}
                disabled={isCropping}
                className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {isCropping ? "Preparing area..." : PHOTO_READ_SELECTED_AREA_LABEL}
              </button>
              <button
                type="button"
                onClick={handleUseFullPhoto}
                className="min-h-11 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-50 transition hover:border-cyan-200/50 hover:text-white"
              >
                {PHOTO_USE_FULL_PHOTO_LABEL}
              </button>
              <button
                type="button"
                onClick={handleRetake}
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_RETAKE_LABEL}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                {PHOTO_CANCEL_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {stage === "permission_denied" ? (
          <div className="mt-5 grid gap-3">
            <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              {CAMERA_PERMISSION_DENIED_MESSAGE}
            </p>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} />
          </div>
        ) : null}

        {stage === "camera_unavailable" ? (
          <div className="mt-5 grid gap-3">
            <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              {CAMERA_UNAVAILABLE_MESSAGE}
            </p>
            <UploadExistingPhotoInput onSelect={handleUploadExisting} />
          </div>
        ) : null}

        {errorMessage &&
        stage !== "permission_denied" &&
        stage !== "camera_unavailable" ? (
          <p className="mt-3 text-sm leading-6 text-amber-200">{errorMessage}</p>
        ) : null}

        <p className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
          {PHOTO_STAYS_LOCAL_MESSAGE}
        </p>
      </div>
    </div>
  );
}
