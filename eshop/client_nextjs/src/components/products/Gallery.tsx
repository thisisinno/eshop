"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Box, Images, Maximize2, Rotate3D } from "lucide-react";
import type { ProductMedia, Viewer360 } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { Viewer360Panel } from "@/components/viewer-360/Viewer360Panel";

export function Gallery({ gallery, videos, viewer }: { gallery: ProductMedia[]; videos: ProductMedia[]; viewer: Viewer360 }) {
  const media = useMemo(() => [...gallery, ...videos], [gallery, videos]);
  const [selected, setSelected] = useState(media[0] ?? null);
  const [mode, setMode] = useState<"gallery" | "360">("gallery");
  const selectedUrl = resolveMediaUrl(selected?.url);
  return (
    <section>
      <div className="mb-3 grid grid-cols-2 border-b border-[var(--color-border)] text-sm font-bold">
        <button onClick={() => setMode("gallery")} className={`relative inline-flex h-12 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] ${mode === "gallery" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "gallery" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Images aria-hidden className="h-4 w-4" />Gallery</button>
        <button onClick={() => setMode("360")} className={`relative inline-flex h-12 items-center justify-center gap-2 transition hover:bg-[var(--color-primary-soft)] ${mode === "360" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`}>{mode === "360" ? <span className="absolute bottom-0 h-1 w-16 rounded-full bg-[var(--color-black)]" /> : null}<Rotate3D aria-hidden className="h-4 w-4" />360 View</button>
      </div>
      <div className="relative aspect-square overflow-hidden bg-white">
        {mode === "360" ? <Viewer360Panel viewer={viewer} /> : selected?.media_type === "clip" && selectedUrl ? <video src={selectedUrl} controls className="h-full w-full object-contain" /> : selectedUrl ? <Image src={selectedUrl} alt={selected?.alt_text || selected?.title || "Product media"} fill sizes="(max-width: 900px) 100vw, 700px" className="object-contain" /> : <div className="grid h-full place-items-center text-[var(--color-text-secondary)]">No gallery media</div>}
        <button aria-label="Open media fullscreen" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white/90 text-[var(--color-text)]"><Maximize2 aria-hidden className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {media.map((item) => {
          const url = resolveMediaUrl(item.url);
          const active = selected?.id === item.id && mode === "gallery";
          return <button key={item.id} aria-label={`Select ${item.title || item.media_type}`} onClick={() => { setSelected(item); setMode("gallery"); }} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white transition ${active ? "border-[var(--color-black)]" : "border-[var(--color-border)]"}`}>{url && item.media_type !== "clip" ? <Image src={url} alt={item.alt_text || item.title || ""} fill sizes="64px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs"><Box aria-hidden className="h-4 w-4" /></span>}</button>;
        })}
      </div>
    </section>
  );
}
