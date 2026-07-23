"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export function ProductShelfScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function scroll(direction: 1 | -1) {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: "smooth" });
  }
  return (
    <div className="group relative">
      <div ref={ref} className="shelf-scroll">{children}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
        <IconButton aria-label="Scroll shelf left" onClick={() => scroll(-1)} className="pointer-events-auto h-11 w-11"><ChevronLeft aria-hidden className="h-5 w-5" /></IconButton>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 md:flex">
        <IconButton aria-label="Scroll shelf right" onClick={() => scroll(1)} className="pointer-events-auto h-11 w-11"><ChevronRight aria-hidden className="h-5 w-5" /></IconButton>
      </div>
    </div>
  );
}
