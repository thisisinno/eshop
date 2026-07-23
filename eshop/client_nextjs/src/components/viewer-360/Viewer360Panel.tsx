"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import type { Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

export function Viewer360Panel({ viewer }: { viewer: Viewer360 }) {
  const [index, setIndex] = useState(0);
  const frames = viewer.mode === "spin" ? viewer.frames : [];
  const frameUrl = resolveMediaUrl(frames[index]?.url);
  const modelUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.model_url) : null;
  const posterUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.poster_url) : null;
  const readyText = useMemo(() => viewer.enabled ? "360 view has not been uploaded yet." : "360 view is disabled for this product.", [viewer.enabled]);
  if (!viewer.ready) return <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--color-text-secondary)]">{readyText}</div>;
  if (viewer.mode === "model") {
    return (
      <div className="relative h-full w-full">
        <model-viewer src={modelUrl || undefined} poster={posterUrl || undefined} camera-controls auto-rotate style={{ width: "100%", height: "100%" }} />
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm">Drag to orbit</div>
        <button aria-label="Fullscreen 3D viewer" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/90"><Maximize2 aria-hidden className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div
      className="relative h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      onPointerMove={(event) => {
        if (event.buttons !== 1 || !frames.length) return;
        setIndex((current) => (current + (event.movementX < 0 ? 1 : -1) + frames.length) % frames.length);
      }}
    >
      {frameUrl ? <Image src={frameUrl} alt="360 product frame" fill sizes="100vw" className="object-contain" /> : null}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm">Drag to spin · {index + 1}/{frames.length}</div>
      <button aria-label="Reset 360 view" onClick={() => setIndex(0)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/90"><RotateCcw aria-hidden className="h-4 w-4" /></button>
    </div>
  );
}
