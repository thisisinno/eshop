"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
      <div className="mb-3 grid grid-cols-2 rounded-lg bg-white p-1 text-sm font-bold">
        <button onClick={() => setMode("gallery")} className={`rounded-md py-2 ${mode === "gallery" ? "bg-[#5b2cff] text-white" : ""}`}>Gallery</button>
        <button onClick={() => setMode("360")} className={`rounded-md py-2 ${mode === "360" ? "bg-[#5b2cff] text-white" : ""}`}>360 View</button>
      </div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
        {mode === "360" ? <Viewer360Panel viewer={viewer} /> : selected?.media_type === "clip" && selectedUrl ? <video src={selectedUrl} controls className="h-full w-full object-contain" /> : selectedUrl ? <Image src={selectedUrl} alt={selected?.alt_text || ""} fill sizes="(max-width: 900px) 100vw, 700px" className="object-contain" /> : <div className="grid h-full place-items-center text-black/50">No gallery media</div>}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {media.map((item) => {
          const url = resolveMediaUrl(item.url);
          return <button key={item.id} onClick={() => { setSelected(item); setMode("gallery"); }} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-black/10 bg-white">{url && item.media_type !== "clip" ? <Image src={url} alt={item.alt_text || ""} fill sizes="64px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs">Video</span>}</button>;
        })}
      </div>
    </section>
  );
}
