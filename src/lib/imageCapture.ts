// Small shared boundary around the browser's optional ImageCapture API.
// Callers own validation, fallback, lifecycle, and any capture-specific
// metadata so this primitive stays reusable without coupling production to
// the development camera lab.

export type ImageCaptureLike = {
  takePhoto: () => Promise<Blob>;
};

export type ImageCaptureConstructorLike = new (track: MediaStreamTrack) => ImageCaptureLike;

export const getBrowserImageCaptureConstructor = (): ImageCaptureConstructorLike | undefined =>
  (globalThis as { ImageCapture?: ImageCaptureConstructorLike }).ImageCapture;

export const takePhotoBlobFromTrack = (
  track: MediaStreamTrack,
  imageCaptureConstructor: ImageCaptureConstructorLike,
): Promise<Blob> => {
  const imageCapture = new imageCaptureConstructor(track);
  return imageCapture.takePhoto();
};
