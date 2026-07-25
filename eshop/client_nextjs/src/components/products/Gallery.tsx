"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Box, Images, Maximize2, Rotate3D } from "lucide-react";
import type { ProductMedia, Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { Viewer360Panel } from "@/components/viewer-360/Viewer360Panel";
import { ProductMediaCarousel } from "./ProductMediaCarousel";

export function Gallery({ gallery, videos, slides, viewer }: { gallery: ProductMedia[]; videos: ProductMedia[]; slides?: ProductMedia[]; viewer: Viewer360 }) {
  const media = useMemo(() => slides?.length ? slides : [...gallery, ...videos].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id), [gallery, slides, videos]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"gallery" | "360">("gallery");
  return (
    <section>
      <div className="mb-2 grid grid-cols-2 border-b border-[var(--color-border)] text-sm font-bold md:mb-3">
        <button onClick={() => setMode("gallery")} className={`relative inline-flex h-11 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] md:h-12 ${mode === "gallery" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "gallery" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Images aria-hidden className="h-4 w-4" />Gallery</button>
        <button onClick={() => setMode("360")} className={`relative inline-flex h-11 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] md:h-12 ${mode === "360" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "360" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Rotate3D aria-hidden className="h-4 w-4" />360 View</button>
      </div>
      <div className="relative aspect-square overflow-hidden bg-white">
        {mode === "360" ? <Viewer360Panel viewer={viewer} /> : <ProductMediaCarousel media={media} alt="Product media" objectFit="contain" imageSizes="(max-width: 900px) 100vw, 700px" activeIndex={selectedIndex} onIndexChange={setSelectedIndex} />}
        <button aria-label="Open media fullscreen" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white/90 text-[var(--color-text)]"><Maximize2 aria-hidden className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto px-1 pb-2 md:mt-3 md:px-0">
        {media.map((item) => {
          const url = resolveMediaUrl(item.url);
          const itemIndex = media.indexOf(item);
          const active = selectedIndex === itemIndex && mode === "gallery";
          return <button key={item.id} aria-label={`Go to media ${itemIndex + 1} of ${media.length}`} onClick={() => { setSelectedIndex(itemIndex); setMode("gallery"); }} className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-white transition md:h-16 md:w-16 ${active ? "border-[var(--color-black)]" : "border-[var(--color-border)]"}`}>{url && item.media_type !== "clip" ? <Image src={url} alt={item.alt_text || item.title || ""} fill sizes="64px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs"><Box aria-hidden className="h-4 w-4" /></span>}</button>;
        })}
      </div>
    </section>
  );
}
