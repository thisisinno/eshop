"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import type { Category, Paginated, ProductCard as ProductCardType, StoreDetail } from "@/types/storefront";

type StoreProductsData = Paginated<ProductCardType> & { store: StoreDetail };

function buildParams(search: string, category: string, sort: string) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (category) params.set("category", category);
  if (sort && sort !== "newest") params.set("sort", sort);
  return params;
}

export function StoreProductsClient({
  slug,
  categories,
  initialData,
  initialSearch,
  initialCategory,
  initialSort,
}: {
  slug: string;
  categories: Category[];
  initialData: StoreProductsData;
  initialSearch: string;
  initialCategory: string;
  initialSort: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort] = useState(initialSort || "newest");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      const params = buildParams(search, category, sort);
      const query = params.toString();
      window.history.replaceState(null, "", `/stores/${slug}${query ? `?${query}` : ""}`);
      setLoading(true);
      try {
        const response = await fetch(`/api/storefront/stores/${slug}/${query ? `?${query}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load store products.");
        const next = await response.json() as StoreProductsData;
        if (requestId.current === id) setData(next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // Keep the current products visible during transient store-search failures.
        }
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [category, search, slug, sort]);

  return (
    <>
      {categories.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((item) => {
            const active = category === item.slug;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory((current) => current === item.slug ? "" : item.slug)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition active:scale-[0.98] motion-reduce:transition-none ${active ? "border-[var(--color-black)] bg-[var(--color-black)] text-white" : "border-[var(--color-border-strong)] bg-white text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"}`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="mt-4">
        <label className="relative block">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Search this store"
            className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-10 pr-10 text-sm focus:border-[var(--color-text)] focus:outline-none"
          />
          {search ? <button type="button" aria-label="Clear store search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"><X aria-hidden className="h-4 w-4" /></button> : null}
        </label>
      </div>
      <div className="mt-3 border-t border-[var(--color-border)] pt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
        {loading ? "Searching..." : `${data.count} products`}
      </div>
      {data.results.length ? (
        <div className={`product-grid-two -mx-1 mt-1 p-1 transition md:-mx-2 md:p-2 ${loading ? "opacity-60" : "opacity-100"}`}>
          {data.results.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : (
        <div className="p-4"><EmptyState title="No products found in this store" /></div>
      )}
      {loading && !data.results.length ? <div className="product-grid-two -mx-1 mt-1 p-1 md:-mx-2 md:p-2"><ProductCardSkeleton /><ProductCardSkeleton /></div> : null}
    </>
  );
}
