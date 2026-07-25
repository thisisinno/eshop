"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductCardMedia, ProductMedia } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

type CarouselMedia = ProductCardMedia | ProductMedia;

type Props = {
  media: CarouselMedia[];
  alt: string;
  linkHref?: string;
  objectFit?: "cover" | "contain";
  imageSizes: string;
  showArrows?: boolean;
  className?: string;
  onIndexChange?: (index: number) => void;
  activeIndex?: number;
};

export function ProductMediaCarousel({
  media,
  alt,
  linkHref,
  objectFit = "cover",
  imageSizes,
  showArrows = true,
  className = "",
  onIndexChange,
  activeIndex,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const frame = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(true);
  const slides = media.filter((item) => resolveMediaUrl(item.url));

  const updateIndex = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport?.clientWidth) return;
    const next = Math.max(0, Math.min(slides.length - 1, Math.round(viewport.scrollLeft / viewport.clientWidth)));
    setIndex((current) => {
      if (current !== next) onIndexChange?.(next);
      return next;
    });
  }, [onIndexChange, slides.length]);

  useEffect(() => {
    if (activeIndex === undefined || activeIndex === index) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ left: activeIndex * viewport.clientWidth, behavior: "smooth" });
  }, [activeIndex, index]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.querySelectorAll<HTMLVideoElement>("video[data-slide-index]").forEach((video) => {
      const slideIndex = Number(video.dataset.slideIndex);
      if (slideIndex !== index || !inView) video.pause();
      else void video.play().catch(() => undefined);
    });
  }, [index, inView]);

  function scrollTo(next: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ left: next * viewport.clientWidth, behavior: reduced ? "auto" : "smooth" });
  }

  function onScroll() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      updateIndex();
    });
  }

  function onPointerDown(event: React.PointerEvent) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    dragged.current = false;
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointerStart.current) return;
    if (Math.abs(event.clientX - pointerStart.current.x) > 8) dragged.current = true;
  }

  function protectLink(event: React.MouseEvent<HTMLAnchorElement>) {
    if (dragged.current) {
      event.preventDefault();
      event.stopPropagation();
    }
    pointerStart.current = null;
    window.setTimeout(() => { dragged.current = false; }, 0);
  }

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  if (!slides.length) {
    return <div className={`grid h-full place-items-center text-xs text-[var(--color-text-secondary)] ${className}`}>No image</div>;
  }

  const viewport = (
    <div
      ref={viewportRef}
      onScroll={onScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { pointerStart.current = null; }}
      onPointerCancel={() => { pointerStart.current = null; dragged.current = false; }}
      className={`flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [touch-action:pan-x_pan-y] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {slides.map((item, slideIndex) => {
        const url = resolveMediaUrl(item.url)!;
        return (
          <div key={item.id} className="relative h-full min-w-full snap-center snap-always">
            {item.media_type === "clip" ? (
              <video
                src={url}
                controls
                data-slide-index={slideIndex}
                playsInline
                muted
                preload="metadata"
                onClick={(event) => event.stopPropagation()}
                className={`h-full w-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
              />
            ) : (
              <Image
                src={url}
                alt={item.alt_text || item.title || alt}
                fill
                sizes={imageSizes}
                loading={slideIndex === 0 ? undefined : "lazy"}
                className={`${objectFit === "cover" ? "object-cover" : "object-contain"} transition duration-200 motion-reduce:transition-none`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {linkHref ? <Link href={linkHref} aria-label={`View ${alt}`} onClick={protectLink} className="absolute inset-0">{viewport}</Link> : viewport}
      {slides.length > 1 ? (
        <>
          {showArrows && index > 0 ? <CarouselArrow direction="previous" onClick={() => scrollTo(index - 1)} /> : null}
          {showArrows && index < slides.length - 1 ? <CarouselArrow direction="next" onClick={() => scrollTo(index + 1)} /> : null}
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/35 px-2 py-1">
            {slides.length <= 7 ? slides.map((item, dot) => <span key={item.id} className={`h-1.5 w-1.5 rounded-full ${dot === index ? "bg-white" : "bg-white/50"}`} />) : <span className="text-[10px] font-bold text-white">{index + 1} / {slides.length}</span>}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CarouselArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={`${direction === "previous" ? "Previous" : "Next"} product image`}
      title={`${direction === "previous" ? "Previous" : "Next"} product image`}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClick(); }}
      className={`carousel-arrow absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-sm transition hover:bg-white active:scale-95 motion-reduce:transition-none md:grid ${direction === "previous" ? "left-2" : "right-2"}`}
    >
      <Icon aria-hidden className="h-4 w-4" />
    </button>
  );
}
