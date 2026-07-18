import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  CAMERA_LAB_ROUTE_PATH,
  CAMERA_LAB_TELEMETRY_FILE_NAME,
  analyzeCameraLabFrame,
  buildCameraLabVideoConstraints,
  captureCameraLabCanvasFrame,
  captureCameraLabImageCapturePhoto,
  createCameraLabFileCaptureResult,
  createA4GuideRect,
  createCameraLabTelemetryEntry,
  createCameraLabTelemetryExport,
  evaluateQuadStability,
  measureCameraLabFileSharpness,
  getCameraLabReadinessLabel,
  getDefaultCameraLabSettings,
  hasCapability,
  isImageCaptureAvailable,
  selectCameraLabGuidanceInstruction,
  shouldTriggerAssistedCapture,
  type CameraLabCaptureMethod,
  type CameraLabCaptureDimensions,
  type CameraLabCaptureResult,
  type CameraLabLifecycleEvent,
  type CameraLabLifecycleRecord,
  type CameraLabQualityMeasurements,
  type CameraLabSettings,
  type CameraLabTelemetryEntry,
} from "../lib/cameraCalibrationLab";
import { scanDocumentFile as scanDocumentFileDefault, type DocumentScanFileResult } from "../lib/documentScanner";
import { stopMediaStreamTracks } from "../lib/photoCapture";

type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: { min?: number; max?: number; step?: number };
  focusMode?: string[];
  torch?: boolean;
};

type ExtendedSettings = MediaTrackSettings & {
  zoom?: number;
  focusMode?: string;
  torch?: boolean;
};

export type CameraCalibrationLabDependencies = {
  requestStream?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  enumerateDevices?: () => Promise<MediaDeviceInfo[]>;
  getSupportedConstraints?: () => MediaTrackSupportedConstraints;
  scanDocumentFile?: typeof scanDocumentFileDefault;
  captureCanvasFrame?: typeof captureCameraLabCanvasFrame;
  captureImageCapturePhoto?: typeof captureCameraLabImageCapturePhoto;
  inspectFileDimensions?: (blob: Blob) => Promise<CameraLabCaptureDimensions>;
  measureCaptureSharpness?: typeof measureCameraLabFileSharpness;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
  downloadJson?: (fileName: string, payload: unknown) => void;
  now?: () => number;
};

type CameraCalibrationLabViewProps = {
  onClose?: () => void;
  dependencies?: CameraCalibrationLabDependencies;
};

const createEmptyMeasurements = (): CameraLabQualityMeasurements => ({
  readyState: "not_ready",
  allFourCornersVisible: false,
  documentInsideFrame: false,
  coverageWithinRange: false,
  skewAcceptable: false,
  brightnessAcceptable: false,
  glareAcceptable: true,
  sharpnessAcceptable: false,
  cameraStable: false,
  quadStable: false,
  documentCoverage: 0,
  skewMetric: 1,
  brightnessMetric: 0,
  glareMetric: 0,
  sharpnessMetric: 0,
  quadIoU: 0,
  quadAreaDelta: 1,
  stabilityDurationMs: 0,
  warnings: ["Open the camera to begin."],
});

const defaultDownloadJson = (fileName: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const defaultRequestStream = (constraints: MediaStreamConstraints) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not available in this browser.");
  }

  return navigator.mediaDevices.getUserMedia(constraints);
};

const defaultEnumerateDevices = async () => navigator.mediaDevices?.enumerateDevices?.() ?? [];

const defaultGetSupportedConstraints = () =>
  navigator.mediaDevices?.getSupportedConstraints?.() ?? {};

const defaultNow = () => performance.now();

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => (
  <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
    <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
    <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  </div>
);

const BooleanMetric = ({ label, value }: { label: string; value: boolean }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
    <span className="text-sm font-semibold text-slate-200">{label}</span>
    <span className={value ? "text-sm font-black text-emerald-200" : "text-sm font-black text-amber-200"}>
      {value ? "Yes" : "No"}
    </span>
  </div>
);

const MetricValue = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-white">{value}</p>
  </div>
);

export function CameraCalibrationLabView({
  onClose,
  dependencies = {},
}: CameraCalibrationLabViewProps) {
  const requestStream = dependencies.requestStream ?? defaultRequestStream;
  const enumerateDevices = dependencies.enumerateDevices ?? defaultEnumerateDevices;
  const getSupportedConstraints = dependencies.getSupportedConstraints ?? defaultGetSupportedConstraints;
  const scanDocumentFile = dependencies.scanDocumentFile ?? scanDocumentFileDefault;
  const captureCanvasFrame = dependencies.captureCanvasFrame ?? captureCameraLabCanvasFrame;
  const captureImageCapturePhoto = dependencies.captureImageCapturePhoto ?? captureCameraLabImageCapturePhoto;
  const inspectFileDimensions = dependencies.inspectFileDimensions;
  const measureCaptureSharpness = dependencies.measureCaptureSharpness ?? measureCameraLabFileSharpness;
  const createObjectURL = dependencies.createObjectURL ?? URL.createObjectURL.bind(URL);
  const revokeObjectURL = dependencies.revokeObjectURL ?? URL.revokeObjectURL.bind(URL);
  const downloadJson = dependencies.downloadJson ?? defaultDownloadJson;
  const now = dependencies.now ?? defaultNow;

  const [settings, setSettings] = useState<CameraLabSettings>(getDefaultCameraLabSettings);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [supportedConstraints, setSupportedConstraints] = useState<MediaTrackSupportedConstraints>({});
  const [capabilities, setCapabilities] = useState<ExtendedCapabilities>();
  const [trackSettings, setTrackSettings] = useState<ExtendedSettings>();
  const [activeConstraints, setActiveConstraints] = useState<MediaStreamConstraints>();
  const [cameraError, setCameraError] = useState("");
  const [constraintError, setConstraintError] = useState("");
  const [zoomValue, setZoomValue] = useState(1);
  const [focusMode, setFocusMode] = useState("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [measurements, setMeasurements] = useState<CameraLabQualityMeasurements>(createEmptyMeasurements);
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const [captureNotice, setCaptureNotice] = useState("");
  const [lastCapture, setLastCapture] = useState<CameraLabCaptureResult>();
  const [lastCaptureSharpness, setLastCaptureSharpness] = useState<number>();
  const [lastScannerResult, setLastScannerResult] = useState<DocumentScanFileResult>();
  const [telemetry, setTelemetry] = useState<CameraLabTelemetryEntry[]>([]);
  const [lifecycleRecords, setLifecycleRecords] = useState<CameraLabLifecycleRecord[]>([]);
  const [scanPreviewUrl, setScanPreviewUrl] = useState("");
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const systemCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanPreviewUrlRef = useRef("");
  const originalPreviewUrlRef = useRef("");
  const revokeObjectURLRef = useRef(revokeObjectURL);
  const stableSinceRef = useRef<number | undefined>(undefined);
  const previousQuadRef = useRef<CameraLabQualityMeasurements["quad"]>(undefined);
  const assistedCaptureTriggeredRef = useRef(false);
  const captureInProgressRef = useRef(false);
  const lastAutoCaptureAtRef = useRef<number | undefined>(undefined);
  const lifecycleRecordsRef = useRef<CameraLabLifecycleRecord[]>([]);

  const imageCaptureSupported = useMemo(() => {
    const track = stream?.getVideoTracks()[0];
    return Boolean(track) && isImageCaptureAvailable(window as unknown as { ImageCapture?: unknown });
  }, [stream]);

  const appendLifecycleRecord = useCallback(
    (
      event: CameraLabLifecycleEvent,
      hadStream: boolean,
      stoppedTrackCount: number,
      updateState = true,
    ): CameraLabLifecycleRecord => {
      const record = {
        event,
        timestamp: new Date().toISOString(),
        hadStream,
        stoppedTrackCount,
      };
      lifecycleRecordsRef.current = [...lifecycleRecordsRef.current, record];
      if (updateState) {
        setLifecycleRecords(lifecycleRecordsRef.current);
      }
      return record;
    },
    [],
  );

  const stopStreamForLifecycle = useCallback(
    (event: CameraLabLifecycleEvent, updateState = true): CameraLabLifecycleRecord => {
      const currentStream = streamRef.current;
      const tracks = currentStream?.getTracks() ?? [];
      const record = appendLifecycleRecord(event, Boolean(currentStream), tracks.length, updateState);

      stopMediaStreamTracks(currentStream);
      streamRef.current = null;
      previousQuadRef.current = undefined;
      stableSinceRef.current = undefined;
      assistedCaptureTriggeredRef.current = false;
      if (updateState) {
        setStream(null);
        setMeasurements(createEmptyMeasurements());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      return record;
    },
    [appendLifecycleRecord],
  );

  const stopCurrentStream = useCallback(() => {
    stopMediaStreamTracks(streamRef.current);
    streamRef.current = null;
    previousQuadRef.current = undefined;
    stableSinceRef.current = undefined;
    assistedCaptureTriggeredRef.current = false;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const replaceScanPreviewUrl = useCallback((nextUrl: string) => {
    if (scanPreviewUrlRef.current) {
      revokeObjectURLRef.current(scanPreviewUrlRef.current);
    }
    scanPreviewUrlRef.current = nextUrl;
    setScanPreviewUrl(nextUrl);
  }, []);

  const replaceOriginalPreviewUrl = useCallback((nextUrl: string) => {
    if (originalPreviewUrlRef.current) {
      revokeObjectURLRef.current(originalPreviewUrlRef.current);
    }
    originalPreviewUrlRef.current = nextUrl;
    setOriginalPreviewUrl(nextUrl);
  }, []);

  useEffect(() => {
    setSupportedConstraints(getSupportedConstraints());
  }, [getSupportedConstraints]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    revokeObjectURLRef.current = revokeObjectURL;
  }, [revokeObjectURL]);

  useEffect(
    () => () => {
      if (streamRef.current) {
        const currentStream = streamRef.current;
        const trackCount = currentStream.getTracks().length;
        appendLifecycleRecord("unmount", true, trackCount, false);
        stopMediaStreamTracks(currentStream);
        streamRef.current = null;
      }
      if (scanPreviewUrlRef.current) {
        revokeObjectURLRef.current(scanPreviewUrlRef.current);
      }
      if (originalPreviewUrlRef.current) {
        revokeObjectURLRef.current(originalPreviewUrlRef.current);
      }
    },
    [appendLifecycleRecord],
  );

  useEffect(() => {
    const handleRouteChange = () => {
      if (streamRef.current) {
        stopStreamForLifecycle("route_change");
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    window.addEventListener("hashchange", handleRouteChange);
    return () => {
      window.removeEventListener("popstate", handleRouteChange);
      window.removeEventListener("hashchange", handleRouteChange);
    };
  }, [stopStreamForLifecycle]);

  const refreshTrackDetails = useCallback(
    (currentStream: MediaStream) => {
      const track = currentStream.getVideoTracks()[0];
      const nextCapabilities = (track.getCapabilities?.() ?? {}) as ExtendedCapabilities;
      const nextSettings = (track.getSettings?.() ?? {}) as ExtendedSettings;

      setCapabilities(nextCapabilities);
      setTrackSettings(nextSettings);
      setZoomValue(typeof nextSettings.zoom === "number" ? nextSettings.zoom : nextCapabilities.zoom?.min ?? 1);
      setFocusMode(nextSettings.focusMode ?? nextCapabilities.focusMode?.[0] ?? "");
      setTorchEnabled(Boolean(nextSettings.torch));
    },
    [],
  );

  const handleOpenCamera = async () => {
    setCameraError("");
    setConstraintError("");
    const constraints = buildCameraLabVideoConstraints(settings, selectedDeviceId || undefined);
    setActiveConstraints(constraints);

    try {
      stopCurrentStream();
      const nextStream = await requestStream(constraints);
      setStream(nextStream);
      refreshTrackDetails(nextStream);
      setDevices((await enumerateDevices()).filter((device) => device.kind === "videoinput"));
      setCaptureNotice("Camera opened. No image has been uploaded or saved.");
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Could not open the camera.");
    }
  };

  const handleApplyConstraints = async () => {
    const track = stream?.getVideoTracks()[0];

    if (!track) {
      return;
    }

    const advanced: Record<string, unknown> = {};
    if (capabilities?.zoom) {
      advanced.zoom = zoomValue;
    }
    if (capabilities?.focusMode?.length && focusMode) {
      advanced.focusMode = focusMode;
    }
    if (capabilities?.torch) {
      advanced.torch = torchEnabled;
    }

    const constraints: MediaTrackConstraints = {
      width: { ideal: settings.preferredWidth },
      height: { ideal: settings.preferredHeight },
      frameRate: { ideal: settings.frameRate },
      facingMode: settings.facingMode,
      ...(Object.keys(advanced).length > 0 ? { advanced: [advanced as MediaTrackConstraintSet] } : {}),
    };

    setConstraintError("");
    try {
      await track.applyConstraints?.(constraints);
      setActiveConstraints({ video: constraints });
      setTrackSettings(track.getSettings?.() as ExtendedSettings);
      setCaptureNotice("Camera settings applied.");
    } catch (error) {
      setConstraintError(error instanceof Error ? error.message : "Camera rejected those settings.");
    }
  };

  useEffect(() => {
    if (!stream) {
      return;
    }

    const interval = window.setInterval(() => {
      const video = videoRef.current;

      if (!video || !(video.videoWidth > 0) || !(video.videoHeight > 0)) {
        return;
      }

      const scale = Math.min(1, 360 / Math.max(video.videoWidth, video.videoHeight));
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = analysisCanvasRef.current ?? document.createElement("canvas");
      analysisCanvasRef.current = canvas;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      const withoutStability = analyzeCameraLabFrame(
        pixels,
        width,
        height,
        settings,
        0,
      );
      const quadStability = evaluateQuadStability(
        withoutStability.quad,
        previousQuadRef.current,
        settings,
      );
      const currentTime = now();
      const basicQualityReady =
        Boolean(withoutStability.quad) &&
        withoutStability.allFourCornersVisible &&
        withoutStability.documentInsideFrame &&
        withoutStability.coverageWithinRange &&
        withoutStability.skewAcceptable &&
        withoutStability.brightnessAcceptable &&
        withoutStability.glareAcceptable &&
        withoutStability.sharpnessAcceptable &&
        quadStability.quadStable;

      if (basicQualityReady) {
        stableSinceRef.current ??= currentTime;
      } else {
        stableSinceRef.current = undefined;
        assistedCaptureTriggeredRef.current = false;
      }

      const stableDuration = stableSinceRef.current ? currentTime - stableSinceRef.current : 0;
      const nextMeasurements = analyzeCameraLabFrame(
        pixels,
        width,
        height,
        settings,
        stableDuration,
        quadStability,
      );
      previousQuadRef.current = withoutStability.quad;
      setMeasurements(nextMeasurements);
    }, 250);

    return () => window.clearInterval(interval);
  }, [now, settings, stream]);

  const processCaptureResult = useCallback(
    async (capture: CameraLabCaptureResult, notice?: string) => {
      if (captureInProgressRef.current) {
        return;
      }

      setCaptureInProgress(true);
      captureInProgressRef.current = true;
      setCaptureNotice("");
      const startedAt = now();

      try {
        const captureSharpnessMetric = await measureCaptureSharpness(capture.file);
        const scannerResult = await scanDocumentFile(capture.file);
        const processingDurationMs = now() - startedAt;
        stopStreamForLifecycle("successful_capture");
        setLastCapture(capture);
        setLastCaptureSharpness(captureSharpnessMetric);
        setLastScannerResult(scannerResult);
        replaceOriginalPreviewUrl(createObjectURL(capture.file));

        if (scannerResult.status === "ready") {
          replaceScanPreviewUrl(createObjectURL(scannerResult.scannedFile));
        } else {
          replaceScanPreviewUrl("");
        }

        setTelemetry((current) => [
          ...current,
          createCameraLabTelemetryEntry({
            timestamp: new Date().toISOString(),
            browser: {
              userAgentFamily: navigator.userAgent.replace(/\s+/g, " ").slice(0, 120),
              platform: navigator.platform,
              hardwareConcurrency: navigator.hardwareConcurrency,
            },
            requestedConstraints: activeConstraints,
            actualSettings: streamRef.current?.getVideoTracks()[0]?.getSettings?.() ?? trackSettings ?? {},
            captureMethod: capture.method,
            sourceDimensions: capture.sourceDimensions,
            outputDimensions: capture.outputDimensions,
            fileSizeBytes: capture.fileSizeBytes,
            captureSharpnessMetric,
            measurements,
            scannerResult,
            lifecycleEvents: lifecycleRecordsRef.current,
            processingDurationMs,
          }),
        ]);
        lastAutoCaptureAtRef.current = now();
        setCaptureNotice(notice ?? "Capture processed locally.");
      } catch (error) {
        stopStreamForLifecycle("capture_error");
        setCaptureNotice(error instanceof Error ? error.message : "Capture failed.");
      } finally {
        setCaptureInProgress(false);
        captureInProgressRef.current = false;
      }
    },
    [
      activeConstraints,
      createObjectURL,
      measureCaptureSharpness,
      measurements,
      now,
      replaceOriginalPreviewUrl,
      replaceScanPreviewUrl,
      scanDocumentFile,
      stopStreamForLifecycle,
      trackSettings,
    ],
  );

  const handleFileCapture = useCallback(
    async (
      event: ChangeEvent<HTMLInputElement>,
      method: Extract<CameraLabCaptureMethod, "system_camera" | "gallery">,
    ) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";

      if (!file) {
        return;
      }

      try {
        const capture = await createCameraLabFileCaptureResult(file, method, inspectFileDimensions);
        await processCaptureResult(capture);
      } catch (error) {
        stopStreamForLifecycle("capture_error");
        setCaptureNotice(error instanceof Error ? error.message : "Could not inspect the selected image.");
      }
    },
    [inspectFileDimensions, processCaptureResult, stopStreamForLifecycle],
  );

  const handleCapture = useCallback(
    async (requestedMethod: CameraLabCaptureMethod = settings.captureMethod) => {
      if (requestedMethod === "system_camera") {
        systemCameraInputRef.current?.click();
        return;
      }
      if (requestedMethod === "gallery") {
        galleryInputRef.current?.click();
        return;
      }

      const track = stream?.getVideoTracks()[0];
      const video = videoRef.current;

      if (!track || !video || captureInProgressRef.current) {
        return;
      }

      try {
        const shouldUseImageCapture = requestedMethod === "image_capture" && imageCaptureSupported;
        const capture = shouldUseImageCapture
          ? await captureImageCapturePhoto(track)
          : await captureCanvasFrame(video, settings);
        await processCaptureResult(
          capture,
          requestedMethod === "image_capture" && !imageCaptureSupported
            ? "ImageCapture is not available; captured with canvas fallback."
            : undefined,
        );
      } catch (error) {
        stopStreamForLifecycle("capture_error");
        setCaptureNotice(error instanceof Error ? error.message : "Capture failed.");
      }
    },
    [
      captureCanvasFrame,
      captureImageCapturePhoto,
      imageCaptureSupported,
      processCaptureResult,
      settings,
      stopStreamForLifecycle,
      stream,
    ],
  );

  useEffect(() => {
    const lastCaptureAt = lastAutoCaptureAtRef.current;
    const cooldownRemainingMs = lastCaptureAt
      ? Math.max(0, settings.captureCooldownMs - (now() - lastCaptureAt))
      : 0;

    if (
      (settings.captureMethod === "canvas" || settings.captureMethod === "image_capture") &&
      shouldTriggerAssistedCapture({
        assistedCapture: settings.assistedCapture,
        measurements,
        isCapturing: captureInProgress,
        captureAlreadyTriggered: assistedCaptureTriggeredRef.current,
        cooldownRemainingMs,
      })
    ) {
      assistedCaptureTriggeredRef.current = true;
      void handleCapture(settings.captureMethod);
    }
  }, [captureInProgress, handleCapture, measurements, now, settings.assistedCapture, settings.captureCooldownMs, settings.captureMethod]);

  const handleClose = () => {
    if (streamRef.current) {
      stopStreamForLifecycle("close");
    }
    replaceScanPreviewUrl("");
    replaceOriginalPreviewUrl("");
    onClose?.();
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      stopStreamForLifecycle("cancel");
    }
    setCaptureNotice("Camera cancelled. Tracks stopped.");
  };

  const updateSetting = <Key extends keyof CameraLabSettings>(key: Key, value: CameraLabSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const guideRect = createA4GuideRect(
    trackSettings?.width ?? 1280,
    trackSettings?.height ?? 720,
    settings.guideScale,
  );
  const countdownRemainingMs = Math.max(0, settings.stabilityDurationMs - measurements.stabilityDurationMs);
  const cooldownRemainingMs = lastAutoCaptureAtRef.current
    ? Math.max(0, settings.captureCooldownMs - (now() - lastAutoCaptureAtRef.current))
    : 0;
  const guidanceInstruction = selectCameraLabGuidanceInstruction(measurements, settings);
  const liveCaptureMethodSelected =
    settings.captureMethod === "canvas" || settings.captureMethod === "image_capture";
  const manualCaptureDisabled = captureInProgress || (liveCaptureMethodSelected && !stream);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">Development only</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
              A4 Camera Calibration Lab
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Route: <code>{CAMERA_LAB_ROUTE_PATH}</code>. Nothing is uploaded; telemetry stays in memory until you download it.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-12 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100 hover:border-white/20"
          >
            Close lab
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-video max-h-[72vh] w-full object-contain"
              />
              {stream ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 rounded-sm border-2 border-cyan-100/90 bg-cyan-100/5 shadow-[0_0_0_9999px_rgb(0_0_0_/_0.30)]"
                  style={{
                    aspectRatio: "1 / 1.41421356237",
                    width: `${Math.min(86, (guideRect.width / Math.max(1, trackSettings?.width ?? 1280)) * 100)}%`,
                    maxHeight: "88%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ) : null}
              <div className="absolute left-3 top-3 rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 text-sm font-black">
                {getCameraLabReadinessLabel(measurements.readyState)}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => void handleOpenCamera()}
                className="min-h-12 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Open camera
              </button>
              <button
                type="button"
                onClick={handleCancelCamera}
                disabled={!stream}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel camera
              </button>
              <button
                type="button"
                onClick={() => void handleCapture(settings.captureMethod)}
                disabled={manualCaptureDisabled}
                className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {captureInProgress ? "Capturing..." : "Manual capture"}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadJson(
                    CAMERA_LAB_TELEMETRY_FILE_NAME,
                    createCameraLabTelemetryExport(telemetry, new Date().toISOString()),
                  )
                }
                disabled={telemetry.length === 0}
                className="min-h-12 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download telemetry JSON
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-2 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100">
                System camera capture
                <input
                  ref={systemCameraInputRef}
                  aria-label="System camera capture input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => void handleFileCapture(event, "system_camera")}
                  className="text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
                />
              </label>
              <label className="grid gap-2 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-100">
                Gallery upload
                <input
                  ref={galleryInputRef}
                  aria-label="Gallery upload input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleFileCapture(event, "gallery")}
                  className="text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
                />
              </label>
            </div>

            {cameraError ? (
              <p role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                {cameraError}
              </p>
            ) : null}
            {constraintError ? (
              <p role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                {constraintError}
              </p>
            ) : null}
            {captureNotice ? (
              <p role="status" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
                {captureNotice}
              </p>
            ) : null}
          </div>

          <aside className="space-y-3">
            <div className="rounded-lg border border-cyan-200/20 bg-cyan-200/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-100">Guidance experiment</p>
              <p className="mt-2 text-2xl font-black text-white">{guidanceInstruction}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
              <p className="text-sm font-black text-white">Live readiness</p>
              <div className="mt-3 grid gap-2">
                <BooleanMetric label="All four corners visible" value={measurements.allFourCornersVisible} />
                <BooleanMetric label="Document inside frame" value={measurements.documentInsideFrame} />
                <BooleanMetric label="Coverage in range" value={measurements.coverageWithinRange} />
                <BooleanMetric label="Skew acceptable" value={measurements.skewAcceptable} />
                <BooleanMetric label="Brightness acceptable" value={measurements.brightnessAcceptable} />
                <BooleanMetric label="Glare acceptable" value={measurements.glareAcceptable} />
                <BooleanMetric label="Sharpness acceptable" value={measurements.sharpnessAcceptable} />
                <BooleanMetric label="Quad stable" value={measurements.quadStable} />
                <BooleanMetric label="Camera stable" value={measurements.cameraStable} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MetricValue label="Coverage" value={measurements.documentCoverage.toFixed(3)} />
                <MetricValue label="Skew" value={measurements.skewMetric.toFixed(3)} />
                <MetricValue label="Brightness" value={measurements.brightnessMetric.toFixed(1)} />
                <MetricValue label="Glare" value={measurements.glareMetric.toFixed(3)} />
                <MetricValue label="Sharpness" value={measurements.sharpnessMetric.toFixed(1)} />
                <MetricValue label="Quad IoU" value={measurements.quadIoU.toFixed(3)} />
                <MetricValue label="Area delta" value={measurements.quadAreaDelta.toFixed(3)} />
                <MetricValue label="Stable" value={`${Math.round(measurements.stabilityDurationMs)}ms`} />
                <MetricValue label="Cooldown" value={`${Math.round(cooldownRemainingMs)}ms`} />
              </div>
              {settings.assistedCapture ? (
                <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-50">
                  Assisted capture countdown: {Math.ceil(countdownRemainingMs / 1000)}s
                </p>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
            <h2 className="text-base font-black text-white">Camera settings</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Camera device
                <select
                  value={selectedDeviceId}
                  onChange={(event) => setSelectedDeviceId(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="">Browser default</option>
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Preferred width
                  <input
                    aria-label="Preferred width"
                    type="number"
                    min={320}
                    value={settings.preferredWidth}
                    onChange={(event) => updateSetting("preferredWidth", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Preferred height
                  <input
                    aria-label="Preferred height"
                    type="number"
                    min={240}
                    value={settings.preferredHeight}
                    onChange={(event) => updateSetting("preferredHeight", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Frame rate
                  <input
                    aria-label="Frame rate"
                    type="number"
                    min={1}
                    max={120}
                    value={settings.frameRate}
                    onChange={(event) => updateSetting("frameRate", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Facing mode
                  <select
                    value={settings.facingMode}
                    onChange={(event) => updateSetting("facingMode", event.target.value as CameraLabSettings["facingMode"])}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  >
                    <option value="environment">Environment</option>
                    <option value="user">User</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Zoom
                <input
                  aria-label="Zoom"
                  type="range"
                  disabled={!hasCapability(capabilities, "zoom")}
                  min={capabilities?.zoom?.min ?? 1}
                  max={capabilities?.zoom?.max ?? 1}
                  step={capabilities?.zoom?.step ?? 0.1}
                  value={zoomValue}
                  onChange={(event) => setZoomValue(Number(event.target.value))}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Focus mode
                <select
                  aria-label="Focus mode"
                  disabled={!hasCapability(capabilities, "focusMode")}
                  value={focusMode}
                  onChange={(event) => setFocusMode(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 disabled:opacity-50"
                >
                  {(capabilities?.focusMode ?? [""]).map((mode) => (
                    <option key={mode || "none"} value={mode}>
                      {mode || "Unavailable"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-12 items-center gap-3 text-sm font-bold text-slate-200">
                <input
                  aria-label="Torch"
                  type="checkbox"
                  disabled={!hasCapability(capabilities, "torch")}
                  checked={torchEnabled}
                  onChange={(event) => setTorchEnabled(event.target.checked)}
                />
                Torch
              </label>
              <button
                type="button"
                disabled={!stream}
                onClick={() => void handleApplyConstraints()}
                className="min-h-12 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply camera settings
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
            <h2 className="text-base font-black text-white">Lab thresholds</h2>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                A4 guide scale
                <input
                  aria-label="A4 guide scale"
                  type="range"
                  min={0.45}
                  max={0.92}
                  step={0.01}
                  value={settings.guideScale}
                  onChange={(event) => updateSetting("guideScale", Number(event.target.value))}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Stability duration
                <input
                  aria-label="Stability duration"
                  type="number"
                  min={0}
                  value={settings.stabilityDurationMs}
                  onChange={(event) => updateSetting("stabilityDurationMs", Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Quad IoU min
                  <input
                    aria-label="Quad IoU minimum"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.quadIoUThreshold}
                    onChange={(event) => updateSetting("quadIoUThreshold", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Area delta max
                  <input
                    aria-label="Area delta maximum"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.maxAreaDelta}
                    onChange={(event) => updateSetting("maxAreaDelta", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Capture cooldown
                <input
                  aria-label="Capture cooldown"
                  type="number"
                  min={0}
                  value={settings.captureCooldownMs}
                  onChange={(event) => updateSetting("captureCooldownMs", Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Coverage min
                  <input
                    aria-label="Coverage minimum"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.documentCoverageMin}
                    onChange={(event) => updateSetting("documentCoverageMin", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Coverage max
                  <input
                    aria-label="Coverage maximum"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.documentCoverageMax}
                    onChange={(event) => updateSetting("documentCoverageMax", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Skew tolerance
                  <input
                    aria-label="Skew tolerance"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={settings.skewTolerance}
                    onChange={(event) => updateSetting("skewTolerance", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold text-slate-200">
                  Output long edge
                  <input
                    aria-label="Output maximum long edge"
                    type="number"
                    min={600}
                    value={settings.outputMaxLongEdge}
                    onChange={(event) => updateSetting("outputMaxLongEdge", Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Output quality
                <input
                  aria-label="Output quality"
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={settings.outputQuality}
                  onChange={(event) => updateSetting("outputQuality", Number(event.target.value))}
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Capture method
                <select
                  aria-label="Capture method"
                  value={settings.captureMethod}
                  onChange={(event) => updateSetting("captureMethod", event.target.value as CameraLabCaptureMethod)}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                >
                  <option value="canvas">Canvas video frame</option>
                  <option value="image_capture" disabled={!imageCaptureSupported}>
                    ImageCapture.takePhoto() {imageCaptureSupported ? "" : "(unavailable)"}
                  </option>
                  <option value="system_camera">System camera file input</option>
                  <option value="gallery">Gallery upload</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-200">
                Review experiment
                <select
                  aria-label="Review experiment"
                  value={settings.reviewMode}
                  onChange={(event) => updateSetting("reviewMode", event.target.value as CameraLabSettings["reviewMode"])}
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
                >
                  <option value="prepared">Prepared scan only</option>
                  <option value="comparison">Original and prepared comparison</option>
                  <option value="fix_edges">Prepared scan with Fix edges placeholder</option>
                </select>
              </label>
              <label className="flex min-h-12 items-center gap-3 text-sm font-bold text-slate-200">
                <input
                  aria-label="Assisted capture"
                  type="checkbox"
                  checked={settings.assistedCapture}
                  onChange={(event) => updateSetting("assistedCapture", event.target.checked)}
                />
                Assisted capture
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
            <h2 className="text-base font-black text-white">Capture and scanner output</h2>
            <div className="mt-3 grid gap-2">
              <MetricValue
                label="Last capture method"
                value={lastCapture?.method ? lastCapture.method : "None yet"}
              />
              <MetricValue
                label="File size"
                value={lastCapture ? `${lastCapture.fileSizeBytes} bytes` : "None yet"}
              />
              <MetricValue
                label="Capture sharpness"
                value={lastCaptureSharpness === undefined ? "None yet" : lastCaptureSharpness.toFixed(1)}
              />
              <MetricValue
                label="Source dimensions"
                value={
                  lastCapture
                    ? `${lastCapture.sourceDimensions.width} x ${lastCapture.sourceDimensions.height}`
                    : "None yet"
                }
              />
              <MetricValue
                label="Output dimensions"
                value={
                  lastCapture
                    ? `${lastCapture.outputDimensions.width} x ${lastCapture.outputDimensions.height}`
                    : "None yet"
                }
              />
              <MetricValue
                label="Scanner result"
                value={lastScannerResult?.status ?? "None yet"}
              />
              <MetricValue label="Telemetry entries" value={String(telemetry.length)} />
              <MetricValue label="Lifecycle records" value={String(lifecycleRecords.length)} />
            </div>
            {scanPreviewUrl && settings.reviewMode === "prepared" ? (
              <img
                src={scanPreviewUrl}
                alt="Prepared scan from calibration capture"
                className="mt-3 max-h-64 w-full rounded-lg border border-white/10 bg-black object-contain"
              />
            ) : null}
            {settings.reviewMode === "comparison" && (originalPreviewUrl || scanPreviewUrl) ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {originalPreviewUrl ? (
                  <figure>
                    <img
                      src={originalPreviewUrl}
                      alt="Original calibration capture"
                      className="max-h-64 w-full rounded-lg border border-white/10 bg-black object-contain"
                    />
                    <figcaption className="mt-1 text-xs font-bold text-slate-400">Original</figcaption>
                  </figure>
                ) : null}
                {scanPreviewUrl ? (
                  <figure>
                    <img
                      src={scanPreviewUrl}
                      alt="Prepared scan from calibration capture"
                      className="max-h-64 w-full rounded-lg border border-white/10 bg-black object-contain"
                    />
                    <figcaption className="mt-1 text-xs font-bold text-slate-400">Prepared</figcaption>
                  </figure>
                ) : null}
              </div>
            ) : null}
            {settings.reviewMode === "fix_edges" && scanPreviewUrl ? (
              <div className="mt-3 space-y-2">
                <img
                  src={scanPreviewUrl}
                  alt="Prepared scan from calibration capture"
                  className="max-h-64 w-full rounded-lg border border-white/10 bg-black object-contain"
                />
                <button
                  type="button"
                  disabled
                  className="min-h-12 w-full rounded-lg border border-amber-200/30 bg-amber-200/10 px-4 py-3 text-sm font-black text-amber-50 opacity-80"
                >
                  Fix edges experiment placeholder
                </button>
                <p className="text-xs leading-5 text-slate-400">
                  Placeholder only. This lab is comparing whether an edge-fix option is useful; it is not an editor.
                </p>
              </div>
            ) : null}
            {lifecycleRecords.length > 0 ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Track lifecycle</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-200">
                  {lifecycleRecords.slice(-5).map((record) => (
                    <li key={`${record.event}-${record.timestamp}`}>
                      {record.event}: {record.stoppedTrackCount} track(s) stopped
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <JsonBlock label="Supported constraints" value={supportedConstraints} />
          <JsonBlock label="Track capabilities" value={capabilities} />
          <JsonBlock label="Current settings" value={trackSettings} />
          <JsonBlock label="Active constraints" value={activeConstraints} />
          <JsonBlock
            label="Selected camera"
            value={{
              selectedDeviceId: selectedDeviceId || "browser default",
              facingMode: trackSettings?.facingMode ?? settings.facingMode,
              width: trackSettings?.width,
              height: trackSettings?.height,
              frameRate: trackSettings?.frameRate,
              zoom: trackSettings?.zoom,
              focusMode: trackSettings?.focusMode,
              torch: trackSettings?.torch,
            }}
          />
          <JsonBlock
            label="Guide geometry"
            value={{
              aspectRatio: "1 / sqrt(2)",
              width: guideRect.width,
              height: guideRect.height,
              scale: guideRect.scale,
            }}
          />
        </section>
      </div>
    </main>
  );
}
