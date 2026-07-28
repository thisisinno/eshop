"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

const MIN_DISTANCE = 64;
const MAX_DURATION = 700;
const EDGE_GUARD = 22;
const HORIZONTAL_DOMINANCE = 1.25;
const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "[role=dialog]",
  "[role=button]",
  "[data-home-tab-swipe-ignore]",
].join(",");

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  shelf: HTMLElement | null;
  shelfCanScrollLeft: boolean;
  shelfCanScrollRight: boolean;
};

export function HomeTabSwipeNavigator({
  activeTab,
  children,
}: {
  activeTab: "for-you" | "following";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const gesture = useRef<Gesture | null>(null);
  const navigated = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [direction, setDirection] = useState<-1 | 0 | 1>(0);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.clientX <= EDGE_GUARD || event.clientX >= window.innerWidth - EDGE_GUARD) return;
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    const shelf = target.closest<HTMLElement>("[data-horizontal-scroll-region='product-shelf']");
    const tolerance = 3;
    const maxScroll = shelf ? Math.max(0, shelf.scrollWidth - shelf.clientWidth) : 0;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      shelf,
      shelfCanScrollLeft: Boolean(shelf && shelf.scrollLeft > tolerance),
      shelfCanScrollRight: Boolean(shelf && shelf.scrollLeft < maxScroll - tolerance),
    };
    navigated.current = false;
  }

  function finish(event: React.PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    gesture.current = null;
    if (!current || current.pointerId !== event.pointerId || navigated.current || isPending) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const elapsed = performance.now() - current.startedAt;
    if (
      elapsed > MAX_DURATION
      || Math.abs(dx) < MIN_DISTANCE
      || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE
    ) return;

    const swipingLeft = dx < 0;
    if (current.shelf) {
      if (swipingLeft && current.shelfCanScrollRight) return;
      if (!swipingLeft && current.shelfCanScrollLeft) return;
    }
    const nextTab = swipingLeft && activeTab === "for-you"
      ? "following"
      : !swipingLeft && activeTab === "following"
        ? "for-you"
        : null;
    if (!nextTab) return;

    navigated.current = true;
    setDirection(swipingLeft ? -1 : 1);
    window.dispatchEvent(new Event("smartwear:show-home-controls"));
    window.scrollTo({ top: 0, behavior: "auto" });
    startTransition(() => router.push(nextTab === "following" ? "/?tab=following" : "/", { scroll: false }));
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={finish}
      onPointerCancel={() => { gesture.current = null; }}
      className={`transition-[opacity,transform] duration-150 motion-reduce:transition-none ${
        isPending ? `opacity-70 ${direction < 0 ? "-translate-x-1" : "translate-x-1"}` : ""
      }`}
    >
      {children}
    </div>
  );
}
