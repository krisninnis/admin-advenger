import { useMemo, useRef } from "react";
import {
  getFullImageQuad,
  updateDocumentQuadPoint,
  type DocumentEnhancementMode,
} from "../lib/documentScannerV2";
import type { DocumentScannerPoint, DocumentScannerQuad } from "../lib/documentScanner";

type CornerKey = keyof DocumentScannerQuad;

type DocumentCropReviewProps = {
  sourcePreviewUrl: string;
  processedPreviewUrl: string;
  dimensions: { width: number; height: number };
  quad: DocumentScannerQuad;
  detectedQuad?: DocumentScannerQuad;
  mode: DocumentEnhancementMode;
  warnings: string[];
  isRendering: boolean;
  onQuadChange: (quad: DocumentScannerQuad) => void;
  onModeChange: (mode: DocumentEnhancementMode) => void;
  onResetCorners: () => void;
  onUseFullImage: () => void;
  onRetake: () => void;
  onUseScan: () => void;
};

const cornerLabels: Record<CornerKey, string> = {
  topLeft: "Top left corner",
  topRight: "Top right corner",
  bottomRight: "Bottom right corner",
  bottomLeft: "Bottom left corner",
};

const modes: Array<{ id: DocumentEnhancementMode; label: string }> = [
  { id: "original", label: "Original / Colour" },
  { id: "clean", label: "Clean" },
  { id: "grayscale", label: "Grayscale" },
  { id: "black_and_white", label: "Black & white" },
];

const pointToPercent = (
  point: DocumentScannerPoint,
  dimensions: { width: number; height: number },
) => ({
  left: `${(point.x / Math.max(1, dimensions.width)) * 100}%`,
  top: `${(point.y / Math.max(1, dimensions.height)) * 100}%`,
});

export function DocumentCropReview({
  sourcePreviewUrl,
  processedPreviewUrl,
  dimensions,
  quad,
  detectedQuad,
  mode,
  warnings,
  isRendering,
  onQuadChange,
  onModeChange,
  onResetCorners,
  onUseFullImage,
  onRetake,
  onUseScan,
}: DocumentCropReviewProps) {
  const imageFrameRef = useRef<HTMLDivElement | null>(null);

  const polygonPoints = useMemo(
    () =>
      [quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft]
        .map(
          (point) =>
            `${(point.x / Math.max(1, dimensions.width)) * 100},${
              (point.y / Math.max(1, dimensions.height)) * 100
            }`,
        )
        .join(" "),
    [dimensions.height, dimensions.width, quad],
  );

  const moveCorner = (
    key: CornerKey,
    clientX: number,
    clientY: number,
  ) => {
    const frame = imageFrameRef.current;
    if (!frame) {
      return;
    }
    const rect = frame.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) {
      return;
    }
    const point = {
      x: ((clientX - rect.left) / rect.width) * dimensions.width,
      y: ((clientY - rect.top) / rect.height) * dimensions.height,
    };
    onQuadChange(updateDocumentQuadPoint(quad, key, point, dimensions.width, dimensions.height));
  };

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-2" aria-labelledby="document-crop-review-title">
      <section className="min-w-0">
        <div className="mb-3">
          <h3 id="document-crop-review-title" className="text-lg font-black text-white">
            Check the edges
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            Drag the corners if AdminAvenger missed part of the page.
          </p>
        </div>

        {warnings.length ? (
          <div className="mb-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-50" role="status">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <div className="flex justify-center overflow-auto rounded-lg border border-white/10 bg-black p-2">
          <div ref={imageFrameRef} className="relative inline-block max-w-full touch-none select-none">
            <img
              src={sourcePreviewUrl}
              alt="Original document photo with adjustable crop"
              className="block max-h-[50dvh] max-w-full rounded object-contain"
              draggable={false}
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={polygonPoints}
                fill="rgba(16,185,129,0.10)"
                stroke="rgb(110 231 183)"
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {(Object.keys(cornerLabels) as CornerKey[]).map((key) => {
              const position = pointToPercent(quad[key], dimensions);
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={cornerLabels[key]}
                  className="absolute z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-emerald-400/90 shadow-lg outline-none ring-offset-2 ring-offset-slate-950 focus:ring-2 focus:ring-emerald-200"
                  style={position}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    moveCorner(key, event.clientX, event.clientY);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      moveCorner(key, event.clientX, event.clientY);
                    }
                  }}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 10 : 3;
                    const point = quad[key];
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      onQuadChange(
                        updateDocumentQuadPoint(
                          quad,
                          key,
                          { x: point.x - step, y: point.y },
                          dimensions.width,
                          dimensions.height,
                        ),
                      );
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      onQuadChange(
                        updateDocumentQuadPoint(
                          quad,
                          key,
                          { x: point.x + step, y: point.y },
                          dimensions.width,
                          dimensions.height,
                        ),
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      onQuadChange(
                        updateDocumentQuadPoint(
                          quad,
                          key,
                          { x: point.x, y: point.y - step },
                          dimensions.width,
                          dimensions.height,
                        ),
                      );
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      onQuadChange(
                        updateDocumentQuadPoint(
                          quad,
                          key,
                          { x: point.x, y: point.y + step },
                          dimensions.width,
                          dimensions.height,
                        ),
                      );
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onResetCorners}
            disabled={!detectedQuad}
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset corners
          </button>
          <button
            type="button"
            onClick={() => {
              onQuadChange(getFullImageQuad(dimensions.width, dimensions.height));
              onUseFullImage();
            }}
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-100"
          >
            Use full image
          </button>
        </div>
      </section>

      <section className="min-w-0" aria-labelledby="document-preview-title">
        <h3 id="document-preview-title" className="text-lg font-black text-white">
          Preview
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Choose a restrained document view. The original photo stays unchanged until you use the scan.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Document appearance">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => onModeChange(item.id)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                mode === item.id
                  ? "border-emerald-300 bg-emerald-300/15 text-emerald-50"
                  : "border-white/10 bg-slate-950 text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex min-h-48 items-center justify-center rounded-lg border border-white/10 bg-black p-2">
          {processedPreviewUrl ? (
            <img
              src={processedPreviewUrl}
              alt={`Prepared document preview using ${mode.replaceAll("_", " ")} mode`}
              className="max-h-[50dvh] max-w-full rounded object-contain"
            />
          ) : (
            <p role="status" className="px-4 text-center text-sm leading-6 text-slate-300">
              {isRendering ? "Preparing preview…" : "Adjust the crop to prepare a preview."}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onRetake}
            className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100"
          >
            Retake
          </button>
          <button
            type="button"
            onClick={() => imageFrameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="min-h-12 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-100"
          >
            Adjust crop
          </button>
          <button
            type="button"
            onClick={onUseScan}
            disabled={isRendering || !processedPreviewUrl}
            className="min-h-12 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use scan
          </button>
        </div>
      </section>
    </div>
  );
}
