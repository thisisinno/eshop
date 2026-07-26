"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";
import type { Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

type DragState = { pointerId: number | null; startX: number; startY: number; startFrame: number; dragging: boolean; horizontalIntent: boolean | null };
const emptyDrag: DragState = { pointerId: null, startX: 0, startY: 0, startFrame: 0, dragging: false, horizontalIntent: null };
const wrap = (value: number, length: number) => ((value % length) + length) % length;

export function Viewer360Panel({ viewer }: { viewer: Viewer360 }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const desiredIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState>({ ...emptyDrag });
  const viewerRef = useRef<HTMLDivElement>(null);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [nearbyReady, setNearbyReady] = useState(false);
  const frames = useMemo(() => viewer.mode === "spin" ? viewer.frames : [], [viewer]);
  const frameUrls = useMemo(() => frames.map((frame) => resolveMediaUrl(frame.url)).filter((url): url is string => Boolean(url)), [frames]);
  const modelUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.model_url) : null;
  const posterUrl = viewer.mode === "model" ? resolveMediaUrl(viewer.poster_url) : null;

  const commitIndex = useCallback((next: number) => {
    if (!frameUrls.length) return;
    const normalized = wrap(next, frameUrls.length);
    desiredIndexRef.current = normalized;
    if (normalized === indexRef.current) return;
    indexRef.current = normalized;
    setIndex(normalized);
  }, [frameUrls.length]);

  const scheduleIndex = useCallback((next: number) => {
    desiredIndexRef.current = next;
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      commitIndex(desiredIndexRef.current);
    });
  }, [commitIndex]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    if (!viewer.ready || viewer.mode !== "spin" || !frameUrls.length) return;
    let cancelled = false;
    let idleId: number | null = null;
    const loaded = new Set<number>();
    const load = (frameIndex: number) => new Promise<void>((resolve) => {
      const normalized = wrap(frameIndex, frameUrls.length);
      if (loaded.has(normalized)) return resolve();
      loaded.add(normalized);
      const image = new window.Image();
      image.onload = image.onerror = () => resolve();
      image.src = frameUrls[normalized];
    });
    void Promise.all([0, 1, -1, 2, -2, 3, -3].map(load)).then(() => {
      if (cancelled) return;
      setNearbyReady(true);
      const preloadRemaining = () => {
        let cursor = 0;
        const batch = () => {
          if (cancelled) return;
          const indexes = [cursor++, cursor++, cursor++].filter((value) => value < frameUrls.length);
          void Promise.all(indexes.map(load)).then(() => {
            if (cursor < frameUrls.length && !cancelled) globalThis.setTimeout(batch, 80);
          });
        };
        batch();
      };
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(preloadRemaining, { timeout: 1200 });
      else globalThis.setTimeout(preloadRemaining, 250);
    });
    return () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
    };
  }, [frameUrls, viewer.mode, viewer.ready]);

  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    viewerRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFullscreen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      focusReturnRef.current?.focus();
    };
  }, [fullscreen]);

  function toggleFullscreen() {
    if (!fullscreen) focusReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFullscreen((value) => !value);
  }

  function finishPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = { ...emptyDrag };
  }

  const shell = fullscreen
    ? "fixed inset-0 z-[120] bg-white p-[env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    : "relative h-full w-full";

  if (!viewer.ready) {
    return <div className="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-[var(--color-text-secondary)]">{viewer.enabled ? "360 view is being prepared for this product." : "360 view is disabled for this product."}</div>;
  }

  if (viewer.mode === "model") {
    return (
      <div ref={viewerRef} tabIndex={0} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? "Fullscreen 3D viewer" : "3D product viewer"} className={shell}>
        <model-viewer src={modelUrl || undefined} poster={posterUrl || undefined} camera-controls auto-rotate style={{ width: "100%", height: "100%" }} />
        <div className="pointer-events-none absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-[calc(12px+env(safe-area-inset-left))] rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm">Drag to orbit</div>
        <button onClick={toggleFullscreen} aria-label={fullscreen ? "Close fullscreen 3D viewer" : "Fullscreen 3D viewer"} className="absolute right-[calc(12px+env(safe-area-inset-right))] top-[calc(12px+env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/95">{fullscreen ? <Minimize2 aria-hidden className="h-4 w-4" /> : <Maximize2 aria-hidden className="h-4 w-4" />}</button>
      </div>
    );
  }

  const frameUrl = frameUrls[index];
  return (
    <div
      ref={viewerRef}
      tabIndex={0}
      role={fullscreen ? "dialog" : "group"}
      aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? "Fullscreen 360 product viewer" : "360 product viewer. Drag horizontally or use arrow keys to rotate."}
      className={`${shell} cursor-grab select-none [touch-action:pan-y_pinch-zoom] active:cursor-grabbing`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); commitIndex(indexRef.current - 1); }
        else if (event.key === "ArrowRight") { event.preventDefault(); commitIndex(indexRef.current + 1); }
        else if (event.key === "Home") { event.preventDefault(); commitIndex(0); }
      }}
      onPointerDown={(event) => {
        if (!frameUrls.length || event.button !== 0) return;
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startFrame: indexRef.current, dragging: true, horizontalIntent: null };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag.dragging || drag.pointerId !== event.pointerId || !frameUrls.length) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (drag.horizontalIntent === null && Math.hypot(dx, dy) >= 7) drag.horizontalIntent = Math.abs(dx) > Math.abs(dy) * 1.15;
        if (drag.horizontalIntent !== true) return;
        const width = viewerRef.current?.clientWidth || 320;
        const pixelsPerFrame = Math.max(8, Math.min(48, width / frameUrls.length));
        scheduleIndex(wrap(drag.startFrame + Math.round(-dx / pixelsPerFrame), frameUrls.length));
      }}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      {frameUrl ? <Image key={frameUrl} src={frameUrl} alt={`360 product frame ${index + 1} of ${frameUrls.length}`} fill unoptimized sizes={fullscreen ? "100vw" : "(max-width: 767px) calc(100vw - 24px), (max-width: 1199px) calc(100vw - 128px), (max-width: 1439px) 540px, 560px"} draggable={false} className="pointer-events-none object-contain" /> : null}
      <div className="pointer-events-none absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-[calc(12px+env(safe-area-inset-left))] rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm">{nearbyReady ? "Drag to spin" : "Preparing spin"} · {index + 1}/{frameUrls.length}</div>
      <button aria-label="Reset 360 view" onPointerDown={(event) => event.stopPropagation()} onClick={() => commitIndex(0)} className="absolute right-[calc(12px+env(safe-area-inset-right))] top-[calc(12px+env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/95"><RotateCcw aria-hidden className="h-4 w-4" /></button>
      <button onPointerDown={(event) => event.stopPropagation()} onClick={toggleFullscreen} aria-label={fullscreen ? "Close fullscreen 360 viewer" : "Fullscreen 360 viewer"} className="absolute right-[calc(12px+env(safe-area-inset-right))] top-[calc(64px+env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/95">{fullscreen ? <Minimize2 aria-hidden className="h-4 w-4" /> : <Maximize2 aria-hidden className="h-4 w-4" />}</button>
    </div>
  );
}
