import { useEffect, useReducer, useRef, useState } from "react";
import { photoCaptureAcceptAttribute } from "../lib/fileIntakeAccept";
import {
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  CAMERA_GUIDANCE_FRAME_CLASSNAME,
  CAMERA_GUIDANCE_TIPS,
  CAMERA_PREVIEW_ACTIONS_CLASSNAME,
  CAMERA_PERMISSION_DENIED_MESSAGE,
  CAMERA_UNAVAILABLE_MESSAGE,
  PHOTO_STAYS_LOCAL_MESSAGE,
  PHOTO_CANCEL_LABEL,
  PHOTO_PRIMARY_RETAKE_BUTTON_CLASSNAME,
  PHOTO_PRIMARY_USE_BUTTON_CLASSNAME,
  PHOTO_RETAKE_LABEL,
  PHOTO_RETAKE_RECOMMENDED_LABEL,
  PHOTO_REVIEW_ACTIONS_CLASSNAME,
  PHOTO_REVIEW_CONTENT_CLASSNAME,
  PHOTO_REVIEW_WARNING_CLASSNAME,
  PHOTO_CROP_FAILED_MESSAGE,
  PHOTO_CROPPED_TO_FRAME_MESSAGE,
  PHOTO_CROP_UNSAFE_MESSAGE,
  PHOTO_SECONDARY_RETAKE_BUTTON_CLASSNAME,
  PHOTO_SECONDARY_USE_BUTTON_CLASSNAME,
  PHOTO_READS_INSIDE_FRAME_MESSAGE,
  PHOTO_UNREADABLE_FALLBACK_MESSAGE,
  PHOTO_TAKE_PHOTO_LABEL,
  PHOTO_TAKE_NEW_PHOTO_DESCRIPTION,
  PHOTO_TAKE_NEW_PHOTO_LABEL,
  PHOTO_ADD_CLOSE_UP_DESCRIPTION,
  PHOTO_ADD_CLOSE_UP_LABEL,
  PHOTO_USE_ANYWAY_LABEL,
  PHOTO_USE_THIS_PHOTO_LABEL,
  capturePhotoFromVideoElement,
  cropImageBlobToRect,
  createCapturedPhotoFile,
  getCameraGuidanceFitMessage,
  getCapturedPhotoFileName,
  getPhotoCaptureSectionLabel,
  getPhotoCaptureSectionTitle,
  getPhotoReviewQualityScore,
  mapDisplayedFrameToImageCrop,
  photoCaptureReducer,
  requestEnvironmentCameraStream,
  stopMediaStreamTracks,
  type CapturedPhotoForOcr,
  type CropRectRatio,
  type PhotoCaptureSection,
} from "../lib/photoCapture";
import {
  DOCUMENT_QUALITY_CONTINUE_MESSAGE,
  DOCUMENT_QUALITY_GOOD_MESSAGE,
  DOCUMENT_QUALITY_TIP_MESSAGE,
  DOCUMENT_QUALITY_WARNING_MESSAGE,
  assessDocumentImageQuality,
  getVisibleDocumentQualityWarningMessages,
  shouldEmphasizeRetake,
  type DocumentImageQualityResult,
} from "../lib/documentImageQuality";

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
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState("");
  const [cropWarning, setCropWarning] = useState("");
  const [isCropping, setIsCropping] = useState(false);
  const [documentQuality, setDocumentQuality] = useState<DocumentImageQualityResult | undefined>();
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const capturedFileRef = useRef<File | undefined>(undefined);
  const fileForOcrRef = useRef<File | undefined>(undefined);
  const capturedCropRectRef = useRef<CropRectRatio | null>(null);
  const cropPromiseRef = useRef<Promise<void> | undefined>(undefined);

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
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
    }

    setCapturedPreviewUrl("");
    setCroppedPreviewUrl("");
    setCropWarning("");
    setIsCropping(false);
    capturedFileRef.current = undefined;
    fileForOcrRef.current = undefined;
    capturedCropRectRef.current = null;
    cropPromiseRef.current = undefined;
    setDocumentQuality(undefined);
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

  // Document Capture Coach - capture review step. First crops the photo to
  // the same approximate A4 guide frame the user saw in the camera preview,
  // then runs quality checks on that cropped local Blob. If crop fails, the
  // original photo is still used and the user gets a non-blocking warning.
  useEffect(() => {
    if (stage !== "captured" || !capturedFileRef.current) {
      return;
    }

    let cancelled = false;
    const sourceFile = capturedFileRef.current;
    const cropRect = capturedCropRectRef.current;

    setDocumentQuality(undefined);
    setCropWarning("");
    setIsCropping(true);

    const preparePhotoForOcr = async () => {
      if (!cropRect) {
        const quality = await assessDocumentImageQuality(sourceFile);

        if (!cancelled) {
          fileForOcrRef.current = sourceFile;
          setCropWarning(PHOTO_CROP_UNSAFE_MESSAGE);
          setDocumentQuality(quality);
          setIsCropping(false);
        }
        return;
      }

      try {
        const croppedBlob = await cropImageBlobToRect(sourceFile, cropRect, {
          type: sourceFile.type,
        });
        // Keeps the simple, human file name ("camera-photo.jpg" /
        // "extra-photo.jpg") - cropping is an internal step, not something
        // the file label needs to advertise.
        const croppedFile = createCapturedPhotoFile(
          croppedBlob,
          getCapturedPhotoFileName(currentSection),
        );
        const croppedUrl = URL.createObjectURL(croppedFile);
        const quality = await assessDocumentImageQuality(croppedFile);

        if (cancelled) {
          URL.revokeObjectURL(croppedUrl);
          return;
        }

        fileForOcrRef.current = croppedFile;
        setCroppedPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return croppedUrl;
        });
        setDocumentQuality(quality);
      } catch {
        const quality = await assessDocumentImageQuality(sourceFile);

        if (!cancelled) {
          fileForOcrRef.current = sourceFile;
          setCropWarning(PHOTO_CROP_FAILED_MESSAGE);
          setDocumentQuality(quality);
        }
      } finally {
        if (!cancelled) {
          setIsCropping(false);
        }
      }
    };

    const cropPromise = preparePhotoForOcr();
    cropPromiseRef.current = cropPromise;
    void cropPromise;

    return () => {
      cancelled = true;
    };
  }, [currentSection, stage]);

  // Belt-and-suspenders cleanup: stop the camera if the whole component
  // unmounts (modal closed some other way) while a stream is still live.
  useEffect(() => {
    return () => {
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

  const handleChooseTakePhoto = () => {
    dispatch({ type: "choose_take_photo" });
  };

  const handleUploadExisting = (file: File) => {
    onUsePhotos([
      { file, section: currentSection, label: getPhotoCaptureSectionLabel(currentSection) },
    ]);
    dispatch({ type: "use_photo" });
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
      fileForOcrRef.current = file;
      capturedCropRectRef.current = mappedCropRect;
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

  const handleUseThisPhoto = async () => {
    if (cropPromiseRef.current) {
      await cropPromiseRef.current;
    }

    const fileToUse = fileForOcrRef.current ?? capturedFileRef.current;

    if (!fileToUse) {
      return;
    }

    onUsePhotos([
      {
        file: fileToUse,
        section: currentSection,
        label: getPhotoCaptureSectionLabel(currentSection),
      },
    ]);
    clearCapturedPreview();
    dispatch({ type: "use_photo" });
  };

  const isCameraWorkStage = stage === "camera_preview" || stage === "captured";
  const reviewQualityScore =
    documentQuality ? getPhotoReviewQualityScore(documentQuality.score, Boolean(cropWarning)) : undefined;
  const retakeRecommended = reviewQualityScore ? shouldEmphasizeRetake(reviewQualityScore) : false;

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
            <div className="shrink-0 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
              <p className="text-sm font-black text-emerald-50">{currentSectionTitle}</p>
              <p className="mt-1 text-sm leading-6 text-emerald-50/80">{currentGuidanceMessage}.</p>
            </div>
            {/* Document Capture Coach - live guidance (see
                src/lib/documentImageQuality.ts for the after-the-fact checks
                and its v2 TODOs for real page/contour detection). The
                A4-shaped frame is a plain CSS overlay, not real edge
                detection - it gives the user a strong page target without
                promising automatic cropping. */}
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
                <p className="text-sm font-black text-emerald-50">{currentSectionTitle}</p>
                <p className="mt-1 text-sm leading-6 text-emerald-50/80">
                  {currentGuidanceMessage}.
                </p>
              </div>
              {croppedPreviewUrl || capturedPreviewUrl ? (
                <img
                  src={croppedPreviewUrl || capturedPreviewUrl}
                  alt={croppedPreviewUrl ? "Cropped photo preview" : "Captured photo preview"}
                  className="max-h-[min(36dvh,16rem)] w-full rounded-lg border border-white/10 object-contain"
                />
              ) : null}
              <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-6 text-cyan-50/90">
                <p className="font-bold">
                  {cropWarning
                    ? cropWarning
                    : croppedPreviewUrl
                    ? PHOTO_CROPPED_TO_FRAME_MESSAGE
                    : PHOTO_READS_INSIDE_FRAME_MESSAGE}
                </p>
                {isCropping ? <p className="mt-1 text-cyan-50/80">Cropping to the guide frame...</p> : null}
              </div>
              {/* Document Capture Coach - capture review. Never blocks:
                  "Use anyway" / "Use this photo" below always goes through
                  the same handler; poor photos only change the warning and
                  button hierarchy. */}
              {documentQuality ? (
                <div
                  className={`${PHOTO_REVIEW_WARNING_CLASSNAME} ${
                    reviewQualityScore === "good"
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-50"
                      : "border-amber-300/30 bg-amber-300/10 text-amber-50"
                  }`}
                >
                  <p className="font-bold">
                    {reviewQualityScore === "good"
                      ? DOCUMENT_QUALITY_GOOD_MESSAGE
                      : retakeRecommended
                        ? PHOTO_RETAKE_RECOMMENDED_LABEL
                        : DOCUMENT_QUALITY_WARNING_MESSAGE}
                  </p>
                  {reviewQualityScore !== "good" ? (
                    <>
                      <p className="mt-1">{DOCUMENT_QUALITY_WARNING_MESSAGE}</p>
                      {getVisibleDocumentQualityWarningMessages(documentQuality).length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {getVisibleDocumentQualityWarningMessages(documentQuality).map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-2">{DOCUMENT_QUALITY_TIP_MESSAGE}</p>
                      <p className="mt-1">{DOCUMENT_QUALITY_CONTINUE_MESSAGE}</p>
                    </>
                  ) : null}
                </div>
              ) : null}
              <p className="text-sm leading-6 text-slate-400">{PHOTO_UNREADABLE_FALLBACK_MESSAGE}</p>
            </div>
            <div className={PHOTO_REVIEW_ACTIONS_CLASSNAME}>
              {retakeRecommended ? (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className={PHOTO_PRIMARY_RETAKE_BUTTON_CLASSNAME}
                  >
                    {PHOTO_RETAKE_RECOMMENDED_LABEL}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUseThisPhoto()}
                    className={PHOTO_SECONDARY_USE_BUTTON_CLASSNAME}
                  >
                    {PHOTO_USE_ANYWAY_LABEL}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleUseThisPhoto()}
                    className={PHOTO_PRIMARY_USE_BUTTON_CLASSNAME}
                  >
                    {PHOTO_USE_THIS_PHOTO_LABEL}
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className={PHOTO_SECONDARY_RETAKE_BUTTON_CLASSNAME}
                  >
                    {PHOTO_RETAKE_LABEL}
                  </button>
                </>
              )}
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
