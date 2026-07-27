"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function ProductShelfScroller({ children, label }: { children: React.ReactNode; label: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateControls = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    setCanScrollLeft(scroller.scrollLeft > 2);
    setCanScrollRight(scroller.scrollLeft < maxScroll - 2);
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      updateControls();
    });
  }, [updateControls]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    updateControls();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleUpdate);
    observer?.observe(scroller);
    Array.from(scroller.children).forEach((child) => observer?.observe(child));
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [children, scheduleUpdate, updateControls]);

  function scroll(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.9,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <div className="shelf-scroller">
      <div ref={scrollerRef} className="shelf-scroll" role="region" aria-label={label} onScroll={scheduleUpdate}>
        {children}
      </div>
      <button type="button" className="shelf-scroll-control shelf-scroll-control-left" aria-label={`Scroll ${label} left`} disabled={!canScrollLeft} onClick={() => scroll(-1)}>
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </button>
      <button type="button" className="shelf-scroll-control shelf-scroll-control-right" aria-label={`Scroll ${label} right`} disabled={!canScrollRight} onClick={() => scroll(1)}>
        <ChevronRight aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}
