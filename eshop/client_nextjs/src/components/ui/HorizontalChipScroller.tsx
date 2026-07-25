"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function HorizontalChipScroller({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;
    setCanLeft(node.scrollLeft > 2);
    setCanRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    node.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", update);
    };
  }, [children, update]);

  function move(direction: number) {
    const node = viewportRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * Math.max(180, node.clientWidth * 0.65), behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <div ref={viewportRef} className="flex flex-nowrap gap-2 overflow-x-auto px-3 py-3 pr-8 [scrollbar-width:none] [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden md:px-4 md:pr-10">
        {children}
      </div>
      <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-white to-transparent transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`} />
      <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`} />
      {canLeft ? <ScrollButton direction="left" onClick={() => move(-1)} /> : null}
      {canRight ? <ScrollButton direction="right" onClick={() => move(1)} /> : null}
    </div>
  );
}

function ScrollButton({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return <button type="button" aria-label={`Scroll categories ${direction}`} title={`Scroll categories ${direction}`} onClick={onClick} className={`carousel-arrow absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-[var(--color-border)] bg-white shadow-sm md:grid ${direction === "left" ? "left-1" : "right-1"}`}><Icon aria-hidden className="h-4 w-4" /></button>;
}
