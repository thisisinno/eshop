"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryDrawer } from "@/components/categories/CategoryDrawer";
import { HorizontalChipScroller } from "@/components/ui/HorizontalChipScroller";
import { hasCategoryChildren, rootCategories } from "@/lib/storefront/categories";
import type { Category } from "@/types/storefront";

export function HomeDiscoveryControls({ categories, activeTab }: { categories: Category[]; activeTab: "for-you" | "following" }) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [drawerRoot, setDrawerRoot] = useState<Category | null>(null);
  const previousY = useRef(0);
  const accumulated = useRef(0);
  const frame = useRef<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const roots = rootCategories(categories);
  const closeDrawer = useCallback(() => setDrawerRoot(null), []);

  useEffect(() => {
    function update() {
      frame.current = null;
      if (drawerRoot) {
        previousY.current = Math.max(0, window.scrollY);
        return;
      }
      const nextY = Math.max(0, window.scrollY);
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
  }, [drawerRoot]);

  function selectRoot(category: Category, event: React.MouseEvent<HTMLButtonElement>) {
    if (category.slug === "all" || !hasCategoryChildren(categories, category.id)) {
      router.push(`/categories/${category.slug}`);
      return;
    }
    triggerRef.current = event.currentTarget;
    setVisible(true);
    setDrawerRoot(category);
  }

  return (
    <>
      <div className={`sticky top-[58px] z-20 bg-white/95 backdrop-blur transition-transform duration-180 ease-out motion-reduce:transition-none md:top-0 ${visible ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="grid grid-cols-2 border-b border-[var(--color-border)] text-sm font-bold">
          <Link className={`relative py-4 text-center transition hover:bg-[var(--color-primary-soft)] ${activeTab === "for-you" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`} href="/">{activeTab === "for-you" ? <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-[var(--color-black)]" /> : null}For You</Link>
          <Link className={`relative py-4 text-center transition hover:bg-[var(--color-primary-soft)] ${activeTab === "following" ? "text-[var(--color-text)]" : "text-[var(--color-text-secondary)]"}`} href="/?tab=following">{activeTab === "following" ? <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-[var(--color-black)]" /> : null}Following</Link>
        </div>
        <HorizontalChipScroller>
          {roots.map((category) => (
            <button key={category.id} type="button" onClick={(event) => selectRoot(category, event)} className="inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--color-border-strong)] bg-white px-3 text-sm font-semibold transition hover:bg-[var(--color-primary-soft)] active:scale-[0.98] motion-reduce:transition-none">
              {category.name}
            </button>
          ))}
        </HorizontalChipScroller>
      </div>
      <CategoryDrawer categories={categories} root={drawerRoot} open={drawerRoot !== null} onClose={closeDrawer} returnFocusRef={triggerRef} />
    </>
  );
}
