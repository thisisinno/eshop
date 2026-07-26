"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Box, Images, Maximize2, Play, Rotate3D } from "lucide-react";
import type { ProductMedia, Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { Viewer360Panel } from "@/components/viewer-360/Viewer360Panel";
import { ProductMediaCarousel } from "./ProductMediaCarousel";
import { ProductMediaLightbox } from "./ProductMediaLightbox";

export function Gallery({ gallery, videos, slides, viewer }: { gallery: ProductMedia[]; videos: ProductMedia[]; slides?: ProductMedia[]; viewer: Viewer360 }) {
  const media = useMemo(() => slides?.length ? slides : [...gallery, ...videos].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id), [gallery, slides, videos]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"gallery" | "360">("gallery");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <section className="lg:grid lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-3">
      <div className="mb-2 grid grid-cols-2 border-b border-[var(--color-border)] text-xs font-bold lg:col-start-2">
        <button onClick={() => setMode("gallery")} className={`relative inline-flex h-11 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] md:h-12 ${mode === "gallery" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "gallery" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Images aria-hidden className="h-4 w-4" />Gallery</button>
        {viewer.enabled ? <button onClick={() => setMode("360")} className={`relative inline-flex h-11 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] md:h-12 ${mode === "360" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "360" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Rotate3D aria-hidden className="h-4 w-4" />360° {viewer.ready ? "· Drag to rotate" : "· Not ready"}</button> : <span />}
      </div>
      <div className="relative h-[min(56dvh,500px)] min-h-[300px] overflow-hidden bg-white sm:min-h-[360px] lg:col-start-2 lg:row-start-2 lg:h-[min(56vw,560px)] lg:max-h-[560px]">
        {mode === "360" ? <Viewer360Panel viewer={viewer} /> : <ProductMediaCarousel media={media} alt="Product media" objectFit="contain" imageSizes="(max-width: 900px) 100vw, 700px" activeIndex={selectedIndex} onIndexChange={setSelectedIndex} />}
        {mode === "gallery" ? <button onClick={() => setLightboxOpen(true)} aria-label="Open media fullscreen" className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white/95 px-3 text-xs font-bold text-[var(--color-text)]"><Maximize2 aria-hidden className="h-3.5 w-3.5" />View image · {selectedIndex + 1}/{media.length}</button> : null}
      </div>
      <ProductMediaLightbox media={media} initialIndex={selectedIndex} open={lightboxOpen} alt="Product" onClose={() => setLightboxOpen(false)} onIndexChange={setSelectedIndex} />
      <div className="mt-2 flex gap-2 overflow-x-auto px-3 pb-2 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:max-h-[560px] lg:flex-col lg:overflow-y-auto lg:px-0">
        {media.map((item) => {
          const url = resolveMediaUrl(item.url);
          const itemIndex = media.indexOf(item);
          const active = selectedIndex === itemIndex && mode === "gallery";
          return <button key={item.id} aria-label={`Go to media ${itemIndex + 1} of ${media.length}`} onClick={() => { setSelectedIndex(itemIndex); setMode("gallery"); }} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-white transition ${active ? "border-[var(--color-black)]" : "border-transparent"}`}>{url && item.media_type !== "clip" ? <Image src={url} alt={item.alt_text || item.title || ""} fill sizes="56px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs">{item.media_type === "clip" ? <Play aria-hidden className="h-4 w-4 fill-current" /> : <Box aria-hidden className="h-4 w-4" />}</span>}</button>;
        })}
      </div>
    </section>
  );
}
