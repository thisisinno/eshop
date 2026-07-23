"use client";

import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";

const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["popularity", "Popular"],
  ["best_selling", "Best selling"],
  ["price_asc", "Price low to high"],
  ["price_desc", "Price high to low"],
] as const;

type SearchFilters = {
  category?: string;
  store?: string;
  min_price?: string;
  max_price?: string;
  in_stock?: string;
  discounted?: string;
  sort?: string;
};

export function SearchClient({ initialQuery, initialData, initialFilters }: { initialQuery: string; initialData: Paginated<ProductCardType>; initialFilters: SearchFilters }) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(initialFilters.sort || "newest");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      for (const key of ["category", "store", "min_price", "max_price", "in_stock", "discounted"] as const) {
        const value = initialFilters[key];
        if (value) params.set(key, value);
      }
      if (sort) params.set("sort", sort);

      const urlParams = new URLSearchParams();
      if (query.trim()) urlParams.set("q", query.trim());
      for (const key of ["category", "store", "min_price", "max_price", "in_stock", "discounted"] as const) {
        const value = initialFilters[key];
        if (value) urlParams.set(key, value);
      }
      if (sort && sort !== "newest") urlParams.set("sort", sort);
      window.history.replaceState(null, "", `/search${urlParams.toString() ? `?${urlParams.toString()}` : ""}`);

      setLoading(true);
      try {
        const response = await fetch(`/api/storefront/products/?${params.toString()}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const next = await response.json() as Paginated<ProductCardType>;
        if (requestId.current === id) setData(next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // Keep the previous result set visible on transient failures.
        }
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [initialFilters, query, sort]);

  function clear() {
    setQuery("");
  }

  return (
    <>
      <div className="grid gap-3 border-b border-[var(--color-border)] bg-white p-3 sm:grid-cols-[1fr_auto] md:p-4">
        <div className="relative block">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Search products, stores, categories"
            className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-10 pr-10 text-sm focus:border-[var(--color-text)] focus:outline-none"
          />
          {query ? <button type="button" aria-label="Clear search" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"><X aria-hidden className="h-4 w-4" /></button> : null}
        </div>
        <label className="relative">
          <SlidersHorizontal aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-9 pr-8 text-sm sm:w-44">
            {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="border-b border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
        {loading ? "Searching..." : `${data.count} results`}
      </div>
      {data.results.length ? <div className="product-grid-two p-3 md:p-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="p-4"><EmptyState title={query ? "No products found" : "Search eShop"}>{query ? "Try a different search or remove filters." : "Start typing to find products, stores, and categories."}</EmptyState></div>}
    </>
  );
}
