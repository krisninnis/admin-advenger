// Local-first camera capture helpers for the "Take or upload a photo" flow.
//
// Nothing here uploads anything anywhere. getUserMedia only ever runs inside
// this browser tab, and a captured frame stays in memory as a Blob/File that
// is handed to the existing photo intake path (see handleImageUpload in
// src/views/HomeView.tsx and src/lib/photoIntake.ts) - exactly like a file
// chosen from disk. See src/components/PhotoCapturePanel.tsx for the UI that
// drives the state machine defined at the bottom of this file.

export type CameraErrorKind = "permission_denied" | "camera_unavailable" | "unknown";

export type CameraStartResult =
  | { status: "success"; stream: MediaStream }
  | { status: "error"; kind: CameraErrorKind; message: string };

export const CAMERA_PERMISSION_DENIED_MESSAGE =
  "Camera access was blocked. You can upload a photo instead.";

export const CAMERA_UNAVAILABLE_MESSAGE = "No camera was found. You can upload a photo instead.";

// Shown on every camera-flow screen so it is never implied that a photo has
// left the browser.
export const PHOTO_STAYS_LOCAL_MESSAGE = "Photo stays in this browser in this version.";

// Honest about OCR limits - shown before AdminAvenger has even tried to read
// the captured photo, so it never promises every image can be read.
export const PHOTO_UNREADABLE_FALLBACK_MESSAGE =
  "If the photo cannot be read clearly, upload a clearer image or paste the text manually.";

// Requested camera resolution for the "Take a new photo" flow. A full page
// of letter text needs enough pixels for Tesseract to resolve individual
// characters - 1920x1080 (or the closest the device actually offers) is a
// reasonable floor for that without asking for anything exotic.
export const CAMERA_IDEAL_WIDTH = 1920;
export const CAMERA_IDEAL_HEIGHT = 1080;

// ---- Document Capture Coach: live camera guidance copy ----
//
// Shown over/alongside the live camera preview (see
// src/components/PhotoCapturePanel.tsx) so the user lines up a good photo
// *before* taking it, rather than only finding out afterwards - this is the
// main lesson from modern document-scanner UX (Google ML Kit Document
// Scanner, OpenCV-style scanners): guide the capture, don't just clean up
// the result. Deliberately simple copy, no camera jargon, no page/contour
// detection promised - see src/lib/documentImageQuality.ts for the actual
// after-the-fact quality checks and its v2 TODOs for real page detection.
export const CAMERA_GUIDANCE_FIT_MESSAGE = "Fill this frame with the letter";

export const CAMERA_GUIDANCE_TIPS = [
  "Move closer if the text is small",
  "Use good light",
  "Keep the page flat",
  "Avoid shadows",
];

export const CAMERA_GUIDANCE_FRAME_CLASSNAME =
  "pointer-events-none absolute left-1/2 top-1/2 h-[82%] max-h-[88%] aspect-[1/1.414] -translate-x-1/2 -translate-y-1/2 rounded-sm border-[3px] border-emerald-300 shadow-[0_0_0_9999px_rgb(15_23_42_/_0.28)] ring-1 ring-white/70";

export const CAMERA_PREVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-2";

export const PHOTO_REVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-3";

export const PHOTO_TAKE_PHOTO_LABEL = "Take photo";
export const PHOTO_USE_THIS_PHOTO_LABEL = "Use this photo";
export const PHOTO_RETAKE_LABEL = "Retake";
export const PHOTO_RETAKE_RECOMMENDED_LABEL = "Retake recommended";
export const PHOTO_CANCEL_LABEL = "Cancel";

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
  | "captured"
  | "permission_denied"
  | "camera_unavailable"
  | "closed";

export type PhotoCaptureAction =
  | { type: "open" }
  | { type: "choose_take_photo" }
  | { type: "camera_ready" }
  | { type: "camera_error"; kind: CameraErrorKind }
  | { type: "photo_captured" }
  | { type: "retake" }
  | { type: "cancel" }
  | { type: "use_photo" };

// Drives the panel through: choice -> (requesting camera) -> camera_preview
// -> captured -> closed (or back to requesting_camera on retake).
//
// "Upload existing photo" does not go through this reducer at all - from the
// "choice" stage it opens a plain file input directly and hands the file
// straight to the existing intake path, so there is no separate state to
// model for it here.
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
    case "photo_captured":
      return stage === "camera_preview" ? "captured" : stage;
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
  stage === "choice" || stage === "permission_denied" || stage === "camera_unavailable";
