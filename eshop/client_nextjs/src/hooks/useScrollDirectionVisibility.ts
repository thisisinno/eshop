"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollDirectionVisibility({ paused = false }: { paused?: boolean } = {}) {
  const [visible, setVisible] = useState(true);
  const previousY = useRef(0);
  const accumulated = useRef(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    function update() {
      frame.current = null;
      const nextY = Math.max(0, window.scrollY);
      if (paused) {
        previousY.current = nextY;
        accumulated.current = 0;
        return;
      }

      const delta = nextY - previousY.current;
      previousY.current = nextY;
      if (nextY <= 12) {
        accumulated.current = 0;
        setVisible(true);
        return;
      }
      if (!delta) return;
      if (Math.sign(delta) !== Math.sign(accumulated.current)) accumulated.current = 0;
      accumulated.current += delta;
      if (accumulated.current <= -4) {
        setVisible(true);
        accumulated.current = 0;
      } else if (accumulated.current >= 7) {
        setVisible(false);
        accumulated.current = 0;
      }
    }

    function onScroll() {
      if (frame.current === null) frame.current = window.requestAnimationFrame(update);
    }

    previousY.current = Math.max(0, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [paused]);

  return { visible, setVisible };
}
