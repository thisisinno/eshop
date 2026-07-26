"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { categoryChildren, hasCategoryChildren } from "@/lib/storefront/categories";
import type { Category } from "@/types/storefront";
import { ResponsiveDrawer } from "@/components/ui/ResponsiveDrawer";

export function CategoryDrawer({
  categories,
  root,
  open,
  onClose,
  returnFocusRef,
  onSelect,
}: {
  categories: Category[];
  root: Category | null;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  onSelect?: (category: Category) => void;
}) {
  const router = useRouter();
  const [stack, setStack] = useState<Category[]>([]);
  const effectiveStack = root && stack[0]?.id === root.id ? stack : root ? [root] : [];
  const current = effectiveStack.at(-1) ?? root;
  const children = current ? categoryChildren(categories, current.id) : [];

  function choose(category: Category) {
    onClose();
    if (onSelect) onSelect(category);
    else router.push(`/categories/${category.slug}`);
  }

  return (
    <ResponsiveDrawer open={open} title={current?.name ?? "Categories"} onClose={onClose} closeLabel="Close categories" returnFocusRef={returnFocusRef} onBack={effectiveStack.length > 1 ? () => setStack(effectiveStack.slice(0, -1)) : undefined}>
          {current ? (
            <button type="button" onClick={() => choose(current)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left font-bold transition hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2">
              <span>All {current.name}</span>
              <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
            </button>
          ) : null}
          {children.length ? <div className="my-1 border-t border-[var(--color-border)]" /> : null}
          {children.map((child) => {
            const nested = hasCategoryChildren(categories, child.id);
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => nested ? setStack([...effectiveStack, child]) : choose(child)}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left font-semibold transition hover:bg-[var(--color-primary-soft)] focus-visible:outline focus-visible:outline-2"
              >
                <span className="truncate">{child.name}</span>
                <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
              </button>
            );
          })}
    </ResponsiveDrawer>
  );
}
