"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { categoryChildren, hasCategoryChildren } from "@/lib/storefront/categories";
import type { Category } from "@/types/storefront";

export function CategoryDrawer({
  categories,
  root,
  open,
  onClose,
  returnFocusRef,
}: {
  categories: Category[];
  root: Category | null;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const [stack, setStack] = useState<Category[]>([]);
  const effectiveStack = root && stack[0]?.id === root.id ? stack : root ? [root] : [];
  const current = effectiveStack.at(-1) ?? root;
  const children = current ? categoryChildren(categories, current.id) : [];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = returnFocusRef?.current;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  function choose(category: Category) {
    onClose();
    router.push(`/categories/${category.slug}`);
  }

  return (
    <div
      className={`fixed inset-0 z-[80] transition-[visibility] duration-200 motion-reduce:transition-none ${open ? "visible" : "invisible"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close categories"
        className={`absolute inset-0 h-full w-full bg-black/25 transition-opacity duration-200 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-drawer-title"
        className={`absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-2xl border-t border-[var(--color-border)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out motion-reduce:transition-none md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:max-h-none md:w-[400px] md:rounded-none md:border-l md:border-t-0 ${open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full md:translate-y-0"}`}
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[var(--color-border-strong)] md:hidden" />
        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3">
          {effectiveStack.length > 1 ? (
            <button type="button" aria-label="Back one category level" onClick={() => setStack(effectiveStack.slice(0, -1))} className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]">
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
          ) : null}
          <h2 id="category-drawer-title" className="min-w-0 flex-1 truncate text-xl font-black">{current?.name ?? "Categories"}</h2>
          <button type="button" aria-label="Close categories" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin]">
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
        </div>
      </aside>
    </div>
  );
}
