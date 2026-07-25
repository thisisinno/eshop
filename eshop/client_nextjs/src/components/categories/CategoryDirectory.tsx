"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { CategoryDrawer } from "@/components/categories/CategoryDrawer";
import { hasCategoryChildren, rootCategories } from "@/lib/storefront/categories";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { Category } from "@/types/storefront";

export function CategoryDirectory({ categories }: { categories: Category[] }) {
  const [drawerRoot, setDrawerRoot] = useState<Category | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawerRoot(null), []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-3 md:p-4">
        {rootCategories(categories).map((category) => {
          const image = resolveMediaUrl(category.image_url);
          const contents = (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
                {image ? <Image src={image} alt="" fill sizes="(max-width: 768px) 50vw, 360px" className="object-cover transition group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-3xl font-black text-[var(--color-text)]">{category.name.slice(0, 1)}</div>}
              </div>
              <div className="pt-2"><h2 className="font-black">{category.name}</h2></div>
            </>
          );
          return hasCategoryChildren(categories, category.id) ? (
            <button
              key={category.id}
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setDrawerRoot(category);
              }}
              className="group overflow-hidden rounded-xl bg-white text-left transition"
              aria-label={`Browse ${category.name} subcategories`}
            >
              {contents}
            </button>
          ) : (
            <Link key={category.id} href={`/categories/${category.slug}`} className="group overflow-hidden rounded-xl bg-white transition">
              {contents}
            </Link>
          );
        })}
      </div>
      <CategoryDrawer categories={categories} root={drawerRoot} open={drawerRoot !== null} onClose={closeDrawer} returnFocusRef={triggerRef} />
    </>
  );
}
