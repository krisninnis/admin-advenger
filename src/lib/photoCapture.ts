// Local-first camera capture helpers for the "Take or upload a photo" flow.
//
// Nothing here uploads anything anywhere. getUserMedia only ever runs inside
// this browser tab, and a captured frame stays in memory as a Blob/File that
// is handed to the browser-local document scanner before OCR. See
// src/components/PhotoCapturePanel.tsx for the UI that drives the state
// machine defined at the bottom of this file.

export type CameraErrorKind = "permission_denied" | "camera_unavailable" | "unknown";

export type CameraStartResult =
  | { status: "success"; stream: MediaStream }
  | { status: "error"; kind: CameraErrorKind; message: string };

// The default flow is deliberately one photo of the whole page. "additional"
// exists only for the optional "Add close-up photo" follow-up offered after
// OCR review - never as an upfront choice or a forced second photo.
export type PhotoCaptureSection = "full_page" | "additional";

export type CapturedPhotoForOcr = {
  file: File;
  section: PhotoCaptureSection;
  label: string;
  warnings?: string[];
  isDocumentScan?: boolean;
  sourceFileName?: string;
};

export const CAMERA_PERMISSION_DENIED_MESSAGE =
  "Camera access was blocked. You can upload a photo instead.";

export const CAMERA_UNAVAILABLE_MESSAGE = "No camera was found. You can upload a photo instead.";

// Shown on every camera-flow screen so it is never implied that a photo has
// left the browser.
export const PHOTO_STAYS_LOCAL_MESSAGE = "Photo stays in this browser in this version.";

export const PHOTO_LOADING_MESSAGE = "Loading your photo...";
export const PHOTO_DETECTING_MESSAGE = "Finding the document...";
export const PHOTO_SCAN_REVIEW_QUESTION = "Does the whole document look clear?";
export const PHOTO_NO_DOCUMENT_MESSAGE =
  "We couldn\u2019t find a clear document in this photo.";
export const PHOTO_PREPARE_AFTER_CAPTURE_MESSAGE =
  "AdminAvenger will prepare the document automatically after you take the photo.";
export const PHOTO_USE_SCAN_LABEL = "Yes, use this";
export const PHOTO_TRY_AGAIN_LABEL = "No, try again";
export const PHOTO_UPLOAD_ANOTHER_LABEL = "Upload another photo";

// One-photo default flow. No scan-mode choice, no numbered capture sequence -
// the user takes a single photo and can optionally add a close-up afterwards.
export const PHOTO_TAKE_NEW_PHOTO_LABEL = "Take a photo";
export const PHOTO_TAKE_NEW_PHOTO_DESCRIPTION =
  "Take one photo of the whole letter or message, then review the prepared scan before OCR.";

// Optional follow-up offered after OCR review - never forced, never numbered.
export const PHOTO_ADD_CLOSE_UP_LABEL = "Add close-up photo";
export const PHOTO_ADD_CLOSE_UP_DESCRIPTION =
  "If some text is missing or blurry, add a closer photo of that section.";
export const PHOTO_RETAKE_PHOTO_LABEL = "Retake photo";

// Simple labels used in the combined OCR text and section warnings - plain
// words, no photo numbering or page-half naming.
export const PHOTO_SECTION_FULL_PAGE_LABEL = "Main photo";
export const PHOTO_SECTION_ADDITIONAL_LABEL = "Close-up photo";

export const PHOTO_SECTION_FULL_PAGE_TITLE = "Full page photo";
export const PHOTO_SECTION_ADDITIONAL_TITLE = "Close-up photo";

// Requested camera resolution for the "Take a new photo" flow. A full page
// of letter text needs enough pixels for Tesseract to resolve individual
// characters - 1920x1080 (or the closest the device actually offers) is a
// reasonable floor for that without asking for anything exotic.
export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

// ---- Document Capture Coach: camera guidance copy ----
//
// Shown around the camera preview (see src/components/PhotoCapturePanel.tsx)
// as simple photo guidance only. The user confirms the prepared scan after
// AdminAvenger has found the document locally.
export const CAMERA_GUIDANCE_FIT_MESSAGE = "Line the page up inside the guide.";
export const CAMERA_GUIDANCE_CLOSE_UP_MESSAGE =
  "Take a clear close-up photo of the hard-to-read section.";

export const CAMERA_GUIDANCE_TIPS = [
  "Fill most of the guide with the page.",
  "Review the prepared scan before reading the text.",
  "Use good light.",
  "Keep the page flat.",
  "Avoid shadows.",
];

export const CAMERA_PREVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-2";

export const PHOTO_REVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-2";

export const PHOTO_REVIEW_CONTENT_CLASSNAME =
  "min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1";

export const PHOTO_TAKE_PHOTO_LABEL = "Take photo";
export const PHOTO_CANCEL_LABEL = "Cancel";

export const getPhotoCaptureSectionLabel = (section: PhotoCaptureSection): string =>
  section === "additional" ? PHOTO_SECTION_ADDITIONAL_LABEL : PHOTO_SECTION_FULL_PAGE_LABEL;

export const getPhotoCaptureSectionTitle = (section: PhotoCaptureSection): string =>
  section === "additional" ? PHOTO_SECTION_ADDITIONAL_TITLE : PHOTO_SECTION_FULL_PAGE_TITLE;

export const getCameraGuidanceFitMessage = (section: PhotoCaptureSection): string =>
  section === "additional" ? CAMERA_GUIDANCE_CLOSE_UP_MESSAGE : CAMERA_GUIDANCE_FIT_MESSAGE;

const permissionDeniedErrorNames = new Set(["NotAllowedError", "PermissionDeniedError", "SecurityError"]);

const cameraUnavailableErrorNames = new Set([
  "NotFoundError",
  "DevicesNotFoundError",
  "OverconstrainedError",
]);

// DOMException.name based classification - the standard web-platform way to
// tell "user said no" apart from "there is no camera to ask about".
export const classifyCameraError = (error: unknown): CameraErrorKind => {
  const name = error instanceof DOMException ? error.name : undefined;

  if (name && permissionDeniedErrorNames.has(name)) {
    return "permission_denied";
  }

  if (name && cameraUnavailableErrorNames.has(name)) {
    return "camera_unavailable";
  }

  return "unknown";
};

export const getCameraErrorMessage = (kind: CameraErrorKind): string =>
  kind === "permission_denied" ? CAMERA_PERMISSION_DENIED_MESSAGE : CAMERA_UNAVAILABLE_MESSAGE;

export const isCameraCaptureSupported = (
  mediaDevices: MediaDevices | undefined = typeof navigator === "undefined" ? undefined : navigator.mediaDevices,
): boolean => typeof mediaDevices?.getUserMedia === "function";

// mediaDevices is a parameter (rather than always reading navigator.mediaDevices
// internally) so this can be unit tested with a fake getUserMedia instead of
// needing a real browser/camera.
export const requestEnvironmentCameraStream = async (
  mediaDevices: Pick<MediaDevices, "getUserMedia"> | undefined,
): Promise<CameraStartResult> => {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
    return {
      status: "error",
      kind: "camera_unavailable",
      message: CAMERA_UNAVAILABLE_MESSAGE,
    };
  }

  try {
    // Ask for a high enough resolution stream that a full-page letter is
    // still legible after capture. These are "ideal" constraints, not
    // "exact" - the browser/camera will pick the closest resolution it
    // actually supports rather than failing if 1920x1080 is unavailable, so
    // this never turns into a new way for camera access to fail.
    const stream = await mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: CAMERA_IDEAL_WIDTH },
        height: { ideal: CAMERA_IDEAL_HEIGHT },
      },
    });
    return { status: "success", stream };
  } catch (error) {
    const kind = classifyCameraError(error);
    return { status: "error", kind, message: getCameraErrorMessage(kind) };
  }
};

// Stops every track on the stream - the only thing that actually turns the
// camera light off. Called on capture-complete, cancel, retake, modal-close,
// and component-unmount so the camera is never left running in the background.
export const stopMediaStreamTracks = (stream?: MediaStream | null): void => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const CAPTURED_PHOTO_MIME_TYPE = "image/jpeg";
export const CAPTURED_PHOTO_FILE_NAME = "camera-photo.jpg";
export const EXTRA_PHOTO_FILE_NAME = "extra-photo.jpg";

// Simple, human file names shown after capture - never "Photo 1: full page".
export const getCapturedPhotoFileName = (section: PhotoCaptureSection): string =>
  section === "additional" ? EXTRA_PHOTO_FILE_NAME : CAPTURED_PHOTO_FILE_NAME;

// JPEG quality used when saving the captured frame. Kept high (top of the
// 0.92-0.95 range a full-page letter needs) so compression artefacts don't
// destroy small print - a fixed, exported constant so this can be checked by
// a unit test without needing a DOM/canvas.
export const CAPTURED_PHOTO_JPEG_QUALITY = 0.95;

// Fallback canvas size used only if a video element somehow reports zero for
// videoWidth/videoHeight (e.g. captured before metadata has loaded). The
// real capture always prefers the video's own intrinsic dimensions below -
// this is a safety net, not the expected path, and is deliberately a fairly
// high resolution rather than a low default so a fallback capture is still
// legible.
const FALLBACK_CAPTURE_WIDTH = 1920;
const FALLBACK_CAPTURE_HEIGHT = 1080;

// Pure Blob -> File conversion, kept separate from the canvas/video capture
// step below so it can be unit tested without a DOM (this project's tests
// run without jsdom).
export const createCapturedPhotoFile = (
  blob: Blob,
  fileName: string = CAPTURED_PHOTO_FILE_NAME,
): File => new File([blob], fileName, { type: blob.type || CAPTURED_PHOTO_MIME_TYPE });

// Draws the current video frame to a canvas and resolves a File. This
// touches the DOM (canvas/video elements), so it is exercised manually in the
// browser rather than by a unit test - createCapturedPhotoFile above is the
// part of this that is unit tested.
//
// Always captures at the video's own intrinsic resolution (videoWidth /
// videoHeight - the actual camera frame size) rather than whatever size the
// <video> preview happens to be rendered at on screen. The CSS preview size
// is a layout detail and is often smaller than the real camera frame on
// mobile, which is what was producing small, low-quality captures.
export const capturePhotoFromVideoElement = (
  video: HTMLVideoElement,
  fileName: string = CAPTURED_PHOTO_FILE_NAME,
): Promise<File> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || FALLBACK_CAPTURE_WIDTH;
    canvas.height = video.videoHeight || FALLBACK_CAPTURE_HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Could not capture a photo from the camera."));
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not capture a photo from the camera."));
          return;
        }

        resolve(createCapturedPhotoFile(blob, fileName));
      },
      CAPTURED_PHOTO_MIME_TYPE,
      CAPTURED_PHOTO_JPEG_QUALITY,
    );
  });

// ---- Panel state machine (pure, testable, no DOM/React involved) ----
//
// PhotoCapturePanel only ever mounts while its parent has chosen to show it
// (see showPhotoCapturePanel in HomeView.tsx), so there is no need for a
// separate "hidden" state here - the panel always starts at "choice".
export type PhotoCaptureStage =
  | "choice"
  | "requesting_camera"
  | "camera_preview"
  | "loading_photo"
  | "detecting_document"
  | "scan_ready"
  | "no_document"
  | "captured"
  | "permission_denied"
  | "camera_unavailable"
  | "closed";

export type PhotoCaptureAction =
  | { type: "open" }
  | { type: "choose_take_photo" }
  | { type: "camera_ready" }
  | { type: "camera_error"; kind: CameraErrorKind }
  | { type: "photo_loading" }
  | { type: "photo_captured" }
  | { type: "scan_ready" }
  | { type: "scan_failed" }
  | { type: "retake" }
  | { type: "cancel" }
  | { type: "use_photo" };

// Drives the panel through: choice -> (requesting camera) -> camera_preview
// -> document detection -> scan review -> closed (or back to requesting
// camera / choice when the user wants another photo).
//
// "Upload existing photo" enters the same loading/detection/review path, so
// uploaded photos and camera photos share the same scan-confirm-before-OCR
// path.
export const photoCaptureReducer = (
  stage: PhotoCaptureStage,
  action: PhotoCaptureAction,
): PhotoCaptureStage => {
  switch (action.type) {
    case "open":
      return "choice";
    case "choose_take_photo":
      return "requesting_camera";
    case "camera_ready":
      return stage === "requesting_camera" ? "camera_preview" : stage;
    case "camera_error":
      return action.kind === "permission_denied" ? "permission_denied" : "camera_unavailable";
    case "photo_loading":
      return stage === "camera_preview" ||
        stage === "choice" ||
        stage === "permission_denied" ||
        stage === "camera_unavailable" ||
        stage === "no_document"
        ? "loading_photo"
        : stage;
    case "photo_captured":
      return stage === "camera_preview" ||
        stage === "choice" ||
        stage === "permission_denied" ||
        stage === "camera_unavailable" ||
        stage === "loading_photo"
        ? "detecting_document"
        : stage;
    case "scan_ready":
      return stage === "loading_photo" || stage === "detecting_document" ? "scan_ready" : stage;
    case "scan_failed":
      return stage === "loading_photo" || stage === "detecting_document" ? "no_document" : stage;
    case "retake":
      return "requesting_camera";
    case "cancel":
      return "closed";
    case "use_photo":
      return "closed";
    default:
      return stage;
  }
};

// Stages where a live MediaStream should be showing (and therefore needs
// stopping on cleanup).
export const stageHasActiveCameraStream = (stage: PhotoCaptureStage): boolean =>
  stage === "camera_preview";

// Stages where the "Upload existing photo" fallback must still be offered
// (both required error states, per the UX spec).
export const stageShowsUploadFallback = (stage: PhotoCaptureStage): boolean =>
  stage === "choice" ||
  stage === "permission_denied" ||
  stage === "camera_unavailable" ||
  stage === "no_document";
