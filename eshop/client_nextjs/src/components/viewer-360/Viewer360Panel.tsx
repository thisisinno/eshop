"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

export function Viewer360Panel({ viewer }: { viewer: Viewer360 }) {
  const [index, setIndex] = useState(0);
  const frames = viewer.mode === "spin" ? viewer.frames : [];
  const frameUrl = resolveMediaUrl(frames[index]?.url);
  const modelUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.model_url) : null;
  const posterUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.poster_url) : null;
  const readyText = useMemo(() => viewer.enabled ? "360 view has not been uploaded yet." : "360 view is disabled for this product.", [viewer.enabled]);
  if (!viewer.ready) return <div className="grid h-full place-items-center px-6 text-center text-sm text-black/55">{readyText}</div>;
  if (viewer.mode === "model") {
    return (
      <model-viewer
        src={modelUrl || undefined}
        poster={posterUrl || undefined}
        camera-controls
        auto-rotate
        style={{ width: "100%", height: "100%" }}
      />
    );
  }
  return (
    <div
      className="relative h-full w-full touch-pan-y"
      onPointerMove={(event) => {
        if (event.buttons !== 1 || !frames.length) return;
        setIndex((current) => (current + (event.movementX < 0 ? 1 : -1) + frames.length) % frames.length);
      }}
    >
      {frameUrl ? <Image src={frameUrl} alt="360 product frame" fill sizes="100vw" className="object-contain" /> : null}
    </div>
  );
}
