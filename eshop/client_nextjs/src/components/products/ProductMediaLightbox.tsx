"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductCardMedia, ProductMedia } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

type Media = ProductCardMedia | ProductMedia;

export function ProductMediaLightbox({ media, initialIndex, open, alt, onClose, onIndexChange }: {
  media: Media[]; initialIndex: number; open: boolean; alt: string; onClose: () => void; onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const slides = media.filter((item) => resolveMediaUrl(item.url));
  const go = useCallback((next: number) => {
    if (!slides.length) return;
    const value = (next + slides.length) % slides.length;
    setIndex(value); setZoom(1); onIndexChange?.(value);
  }, [onIndexChange, slides.length]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setIndex(Math.min(initialIndex, Math.max(0, slides.length - 1)));
      setZoom(1);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialIndex, open, slides.length]);
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", keyboard); returnFocus.current?.focus(); };
  }, [go, index, onClose, open]);
  if (!open || !slides.length) return null;
  const current = slides[index];
  const url = resolveMediaUrl(current.url)!;
  return (
    <div role="dialog" aria-modal="true" aria-label={`${alt} media viewer`} className="fixed inset-0 z-[100] flex flex-col bg-neutral-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between px-4">
        <span className="text-sm font-bold">{index + 1} / {slides.length}</span>
        <div className="flex items-center gap-2">
          {current.media_type !== "clip" ? <>
            <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(1, value - .5))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Minus className="h-4 w-4" /></button>
            <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(3, value + .5))} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><Plus className="h-4 w-4" /></button>
          </> : null}
          <button ref={closeRef} aria-label="Close media viewer" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white text-black"><X className="h-5 w-5" /></button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-auto" onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)}>
        {current.media_type === "clip" ? <video src={url} controls autoPlay playsInline preload="metadata" className="h-full w-full object-contain" /> :
          <div className="relative h-full w-full transition-transform duration-200" style={{ transform: `scale(${zoom})` }}><Image src={url} alt={current.alt_text || current.title || alt} fill sizes="100vw" priority className="object-contain" /></div>}
        {slides.length > 1 ? <>
          <button aria-label="Previous media" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black md:grid"><ChevronLeft /></button>
          <button aria-label="Next media" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black md:grid"><ChevronRight /></button>
        </> : null}
      </div>
      {slides.length > 1 ? <div className="flex shrink-0 justify-center gap-1.5 p-4">{slides.map((item, itemIndex) => <button key={item.id} aria-label={`View media ${itemIndex + 1}`} onClick={() => go(itemIndex)} className={`h-1.5 rounded-full transition-all ${itemIndex === index ? "w-8 bg-white" : "w-1.5 bg-white/40"}`} />)}</div> : null}
    </div>
  );
}
