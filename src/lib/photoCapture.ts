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

export type CropRectRatio = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// The default flow is deliberately one photo of the whole page. "additional"
// exists only for the optional "Add close-up photo" follow-up offered after
// OCR review - never as an upfront choice or a forced second photo.
export type PhotoCaptureSection = "full_page" | "additional";

export type CapturedPhotoForOcr = {
  file: File;
  section: PhotoCaptureSection;
  label: string;
  warnings?: string[];
};

export type DOMRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DisplayFrameMappingInput = {
  mediaRect: DOMRectLike;
  frameRect: DOMRectLike;
  naturalWidth: number;
  naturalHeight: number;
  objectFit: "contain";
};

export const A4_PORTRAIT_RATIO = 1 / 1.414;
export const MIN_SAFE_CROP_WIDTH_RATIO = 0.45;
export const MIN_SAFE_CROP_HEIGHT_RATIO = 0.55;
export const MIN_SAFE_A4_CROP_ASPECT_RATIO = 0.65;
export const MAX_SAFE_A4_CROP_ASPECT_RATIO = 0.8;

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

export const PHOTO_ADJUST_TITLE = "Adjust document area";
export const PHOTO_ADJUST_INSTRUCTION =
  "Drag the box around the letter. Anything outside the box will be ignored.";
export const PHOTO_ADJUST_AFTER_CAPTURE_MESSAGE =
  "You can adjust the document area after taking the photo.";
export const PHOTO_READ_SELECTED_AREA_LABEL = "Read this area";
export const PHOTO_USE_FULL_PHOTO_LABEL = "Use full photo";
export const PHOTO_FULL_PHOTO_WARNING =
  "The full photo may include background. OCR may make more mistakes.";
export const PHOTO_CROP_FALLBACK_WARNING =
  "We could not crop this area safely, so AdminAvenger will read the full photo. You can still edit the text manually.";

// One-photo default flow. No scan-mode choice, no numbered capture sequence -
// the user takes a single photo and can optionally add a close-up afterwards.
export const PHOTO_TAKE_NEW_PHOTO_LABEL = "Take a photo";
export const PHOTO_TAKE_NEW_PHOTO_DESCRIPTION = "Take one photo of the whole letter or message.";

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
// as simple photo guidance only. The user confirms the actual OCR area in
// the post-capture adjust step.
export const CAMERA_GUIDANCE_FIT_MESSAGE = "Take a clear photo of the letter.";
export const CAMERA_GUIDANCE_CLOSE_UP_MESSAGE =
  "Take a clear close-up photo of the hard-to-read section.";

export const CAMERA_GUIDANCE_TIPS = [
  "Try to fill the photo with the page.",
  "You can adjust the document area after taking the photo.",
  "Use good light.",
  "Keep the page flat.",
  "Avoid shadows.",
];

export const CAMERA_PREVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-2";

export const PHOTO_REVIEW_ACTIONS_CLASSNAME =
  "sticky bottom-0 z-10 mt-auto grid gap-2 rounded-xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur sm:grid-cols-4";

export const PHOTO_REVIEW_CONTENT_CLASSNAME =
  "min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1";

export const PHOTO_TAKE_PHOTO_LABEL = "Take photo";
export const PHOTO_RETAKE_LABEL = "Retake";
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
const GUIDE_FRAME_HEIGHT_RATIO = 0.82;
const GUIDE_FRAME_MAX_WIDTH_RATIO = 0.92;
export const DEFAULT_MANUAL_CROP_WIDTH_RATIO = 0.9;
export const DEFAULT_MANUAL_CROP_HEIGHT_RATIO = 0.88;
export const MIN_MANUAL_CROP_WIDTH_RATIO = 0.2;
export const MIN_MANUAL_CROP_HEIGHT_RATIO = 0.2;
export const MANUAL_CROP_MARGIN_RATIO = 0.02;

const clampRatio = (value: number): number => Math.max(0, Math.min(1, value));

export const getCropRectPixelAspectRatio = (
  rect: CropRectRatio,
  imageWidth: number,
  imageHeight: number,
): number => {
  if (!(rect.width > 0) || !(rect.height > 0) || !(imageWidth > 0) || !(imageHeight > 0)) {
    return 0;
  }

  return (rect.width * imageWidth) / (rect.height * imageHeight);
};

export const isCropRectSafe = (
  rect: CropRectRatio,
  imageWidth: number,
  imageHeight: number,
): boolean => {
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    return false;
  }

  if (rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  if (rect.x + rect.width > 1 || rect.y + rect.height > 1) {
    return false;
  }

  if (rect.width < MIN_SAFE_CROP_WIDTH_RATIO || rect.height < MIN_SAFE_CROP_HEIGHT_RATIO) {
    return false;
  }

  const aspectRatio = getCropRectPixelAspectRatio(rect, imageWidth, imageHeight);
  return (
    aspectRatio >= MIN_SAFE_A4_CROP_ASPECT_RATIO &&
    aspectRatio <= MAX_SAFE_A4_CROP_ASPECT_RATIO
  );
};

export const isManualCropRectSafe = (rect: CropRectRatio): boolean => {
  if (rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  if (rect.x + rect.width > 1 || rect.y + rect.height > 1) {
    return false;
  }

  if (rect.width < MIN_MANUAL_CROP_WIDTH_RATIO || rect.height < MIN_MANUAL_CROP_HEIGHT_RATIO) {
    return false;
  }

  const aspectRatio = rect.width / rect.height;
  return aspectRatio >= 0.25 && aspectRatio <= 4;
};

export const getCropRectWithMargin = (
  rect: CropRectRatio,
  marginRatio: number = MANUAL_CROP_MARGIN_RATIO,
): CropRectRatio => {
  const margin = Math.max(0, marginRatio);
  const left = clampRatio(rect.x - margin);
  const top = clampRatio(rect.y - margin);
  const right = clampRatio(rect.x + rect.width + margin);
  const bottom = clampRatio(rect.y + rect.height + margin);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
};

export const getDefaultManualCropRect = (suggestedRect?: CropRectRatio | null): CropRectRatio => {
  if (suggestedRect && isManualCropRectSafe(suggestedRect)) {
    return suggestedRect;
  }

  return {
    x: (1 - DEFAULT_MANUAL_CROP_WIDTH_RATIO) / 2,
    y: (1 - DEFAULT_MANUAL_CROP_HEIGHT_RATIO) / 2,
    width: DEFAULT_MANUAL_CROP_WIDTH_RATIO,
    height: DEFAULT_MANUAL_CROP_HEIGHT_RATIO,
  };
};

export const mapDisplayedFrameToImageCrop = ({
  mediaRect,
  frameRect,
  naturalWidth,
  naturalHeight,
}: DisplayFrameMappingInput): CropRectRatio | null => {
  if (
    !(mediaRect.width > 0) ||
    !(mediaRect.height > 0) ||
    !(frameRect.width > 0) ||
    !(frameRect.height > 0) ||
    !(naturalWidth > 0) ||
    !(naturalHeight > 0)
  ) {
    return null;
  }

  const naturalAspectRatio = naturalWidth / naturalHeight;
  const mediaAspectRatio = mediaRect.width / mediaRect.height;
  const renderedWidth =
    mediaAspectRatio > naturalAspectRatio ? mediaRect.height * naturalAspectRatio : mediaRect.width;
  const renderedHeight =
    mediaAspectRatio > naturalAspectRatio ? mediaRect.height : mediaRect.width / naturalAspectRatio;
  const renderedLeft = mediaRect.left + (mediaRect.width - renderedWidth) / 2;
  const renderedTop = mediaRect.top + (mediaRect.height - renderedHeight) / 2;

  const rawRect = {
    x: (frameRect.left - renderedLeft) / renderedWidth,
    y: (frameRect.top - renderedTop) / renderedHeight,
    width: frameRect.width / renderedWidth,
    height: frameRect.height / renderedHeight,
  };
  const left = clampRatio(rawRect.x);
  const top = clampRatio(rawRect.y);
  const right = clampRatio(rawRect.x + rawRect.width);
  const bottom = clampRatio(rawRect.y + rawRect.height);
  const mappedRect = {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };

  return isCropRectSafe(mappedRect, naturalWidth, naturalHeight) ? mappedRect : null;
};

export function getA4GuideCropRect(imageWidth: number, imageHeight: number): CropRectRatio {
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  let cropHeight = imageHeight * GUIDE_FRAME_HEIGHT_RATIO;
  let cropWidth = cropHeight * A4_PORTRAIT_RATIO;
  const maxCropWidth = imageWidth * GUIDE_FRAME_MAX_WIDTH_RATIO;

  if (cropWidth > maxCropWidth) {
    cropWidth = maxCropWidth;
    cropHeight = cropWidth / A4_PORTRAIT_RATIO;
  }

  if (cropHeight > imageHeight) {
    cropHeight = imageHeight;
    cropWidth = cropHeight * A4_PORTRAIT_RATIO;
  }

  const width = clampRatio(cropWidth / imageWidth);
  const height = clampRatio(cropHeight / imageHeight);

  const rect = {
    x: clampRatio((1 - width) / 2),
    y: clampRatio((1 - height) / 2),
    width,
    height,
  };

  return isCropRectSafe(rect, imageWidth, imageHeight)
    ? rect
    : { x: 0, y: 0, width: 1, height: 1 };
}

// Pure Blob -> File conversion, kept separate from the canvas/video capture
// step below so it can be unit tested without a DOM (this project's tests
// run without jsdom).
export const createCapturedPhotoFile = (
  blob: Blob,
  fileName: string = CAPTURED_PHOTO_FILE_NAME,
): File => new File([blob], fileName, { type: blob.type || CAPTURED_PHOTO_MIME_TYPE });

export const cropImageBlobToRect = (
  image: Blob,
  rect: CropRectRatio,
  options: {
    type?: string;
    quality?: number;
    safety?: "a4" | "manual";
    marginRatio?: number;
  } = {},
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(image);
    const element = new Image();
    const cleanUp = () => URL.revokeObjectURL(objectUrl);

    element.onload = () => {
      try {
        const cropRect = options.safety === "manual"
          ? getCropRectWithMargin(rect, options.marginRatio)
          : rect;
        const isSafe =
          options.safety === "manual"
            ? isManualCropRectSafe(cropRect)
            : isCropRectSafe(cropRect, element.naturalWidth, element.naturalHeight);

        if (!isSafe) {
          cleanUp();
          reject(new Error("Could not crop this photo safely."));
          return;
        }

        const sourceX = Math.round(clampRatio(cropRect.x) * element.naturalWidth);
        const sourceY = Math.round(clampRatio(cropRect.y) * element.naturalHeight);
        const requestedWidth = Math.round(clampRatio(cropRect.width) * element.naturalWidth);
        const requestedHeight = Math.round(clampRatio(cropRect.height) * element.naturalHeight);
        const sourceWidth = Math.max(
          1,
          Math.min(requestedWidth, element.naturalWidth - sourceX),
        );
        const sourceHeight = Math.max(
          1,
          Math.min(requestedHeight, element.naturalHeight - sourceY),
        );
        const canvas = document.createElement("canvas");
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
        const context = canvas.getContext("2d");

        if (!context) {
          cleanUp();
          reject(new Error("Could not crop this photo."));
          return;
        }

        context.drawImage(
          element,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight,
        );

        canvas.toBlob(
          (blob) => {
            cleanUp();
            if (!blob) {
              reject(new Error("Could not crop this photo."));
              return;
            }
            resolve(blob);
          },
          options.type ?? image.type ?? CAPTURED_PHOTO_MIME_TYPE,
          options.quality ?? CAPTURED_PHOTO_JPEG_QUALITY,
        );
      } catch (error) {
        cleanUp();
        reject(error instanceof Error ? error : new Error("Could not crop this photo."));
      }
    };

    element.onerror = () => {
      cleanUp();
      reject(new Error("Could not crop this photo."));
    };

    element.src = objectUrl;
  });

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
// -> captured/adjust -> closed (or back to requesting_camera on retake).
//
// "Upload existing photo" enters the same captured/adjust stage, so uploaded
// photos and camera photos share the same crop-confirm-before-OCR path.
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
      return stage === "camera_preview" ||
        stage === "choice" ||
        stage === "permission_denied" ||
        stage === "camera_unavailable"
        ? "captured"
        : stage;
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
