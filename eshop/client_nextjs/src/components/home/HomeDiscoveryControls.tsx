"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryDrawer } from "@/components/categories/CategoryDrawer";
import { HorizontalChipScroller } from "@/components/ui/HorizontalChipScroller";
import { hasCategoryChildren, rootCategories } from "@/lib/storefront/categories";
import type { Category } from "@/types/storefront";
import { useScrollDirectionVisibility } from "@/hooks/useScrollDirectionVisibility";

export function HomeDiscoveryControls({ categories, activeTab }: { categories: Category[]; activeTab: "for-you" | "following" }) {
  const router = useRouter();
  const [drawerRoot, setDrawerRoot] = useState<Category | null>(null);
  const { visible, setVisible } = useScrollDirectionVisibility({ paused: drawerRoot !== null });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const roots = rootCategories(categories);
  const closeDrawer = useCallback(() => setDrawerRoot(null), []);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener("smartwear:show-home-controls", show);
    return () => window.removeEventListener("smartwear:show-home-controls", show);
  }, [setVisible]);

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
