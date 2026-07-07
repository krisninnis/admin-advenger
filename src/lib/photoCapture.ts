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
    const stream = await mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
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
export const capturePhotoFromVideoElement = (
  video: HTMLVideoElement,
  fileName: string = CAPTURED_PHOTO_FILE_NAME,
): Promise<File> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
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
      0.92,
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
