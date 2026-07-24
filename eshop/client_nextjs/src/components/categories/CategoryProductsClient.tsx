"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Category, Paginated, ProductCard as ProductCardType } from "@/types/storefront";

const SORT_OPTIONS = [
  ["newest", "Newest"],
  ["popularity", "Popular"],
  ["best_selling", "Best selling"],
  ["price_asc", "Price low to high"],
  ["price_desc", "Price high to low"],
] as const;

type Filters = {
  sort: string;
  in_stock: boolean;
  discounted: boolean;
  min_price: string;
  max_price: string;
};

function filtersFromParams(params: Record<string, string | undefined>): Filters {
  return {
    sort: params.sort || "newest",
    in_stock: params.in_stock === "true",
    discounted: params.discounted === "true",
    min_price: params.min_price || "",
    max_price: params.max_price || "",
  };
}

function paramsFromFilters(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.in_stock) params.set("in_stock", "true");
  if (filters.discounted) params.set("discounted", "true");
  if (filters.min_price.trim()) params.set("min_price", filters.min_price.trim());
  if (filters.max_price.trim()) params.set("max_price", filters.max_price.trim());
  return params;
}

export function CategoryProductsClient({
  slug,
  initialData,
  initialParams,
}: {
  slug: string;
  initialData: Paginated<ProductCardType> & { category: Category };
  initialParams: Record<string, string | undefined>;
}) {
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(initialParams));
  const [data, setData] = useState(initialData);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasMounted = useRef(false);
  const requestId = useRef(0);
  const activeFilterCount = useMemo(() => {
    return Number(filters.sort !== "newest") + Number(filters.in_stock) + Number(filters.discounted) + Number(Boolean(filters.min_price.trim())) + Number(Boolean(filters.max_price.trim()));
  }, [filters]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const id = ++requestId.current;
    const controller = new AbortController();
    const delay = window.setTimeout(async () => {
      const params = paramsFromFilters(filters);
      const query = params.toString();
      window.history.replaceState(null, "", `/categories/${slug}${query ? `?${query}` : ""}`);
      setLoading(true);
      try {
        const response = await fetch(`/api/storefront/categories/${slug}/${query ? `?${query}` : ""}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load category products.");
        const next = await response.json() as Paginated<ProductCardType> & { category: Category };
        if (requestId.current === id) setData(next);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          // Keep current results visible for transient failures.
        }
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    }, filters.min_price || filters.max_price ? 320 : 0);

    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
  }, [filters, slug]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  function update(next: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function reset() {
    setFilters({ sort: "newest", in_stock: false, discounted: false, min_price: "", max_price: "" });
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white p-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black md:text-3xl">{data.category.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{loading ? "Updating..." : `${data.count} products`}</p>
        </div>
        <button type="button" onClick={() => setDrawerOpen(true)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-4 text-sm font-bold transition hover:bg-[var(--color-primary-soft)]">
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Filters
          {activeFilterCount ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-black)] px-1 text-xs text-white">{activeFilterCount}</span> : null}
        </button>
      </div>
      {data.results.length ? <div className={`product-grid-two p-3 transition md:p-4 ${loading ? "opacity-60" : "opacity-100"}`}>{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="p-4"><EmptyState title="No public products in this category yet" /></div>}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Category filters">
          <button aria-label="Close filters" className="absolute inset-0 h-full w-full bg-black/25" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl border-t border-[var(--color-border)] bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:w-[380px] md:max-h-none md:rounded-none md:border-l md:border-t-0 md:p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={() => setDrawerOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-bold">Sort</span>
                <select value={filters.sort} onChange={(event) => update({ sort: event.target.value })} className="mt-2 h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white px-3 text-sm">
                  {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3">
                <span className="text-sm font-bold">In stock</span>
                <input type="checkbox" checked={filters.in_stock} onChange={(event) => update({ in_stock: event.target.checked })} className="h-5 w-5 accent-black" />
              </label>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3">
                <span className="text-sm font-bold">Discounted</span>
                <input type="checkbox" checked={filters.discounted} onChange={(event) => update({ discounted: event.target.checked })} className="h-5 w-5 accent-black" />
              </label>
              <div>
                <p className="text-sm font-bold">Price</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input inputMode="decimal" value={filters.min_price} onChange={(event) => update({ min_price: event.target.value })} placeholder="Minimum" className="h-11 rounded-full border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-[var(--color-text)] focus:outline-none" />
                  <input inputMode="decimal" value={filters.max_price} onChange={(event) => update({ max_price: event.target.value })} placeholder="Maximum" className="h-11 rounded-full border border-[var(--color-border-strong)] bg-white px-3 text-sm focus:border-[var(--color-text)] focus:outline-none" />
                </div>
              </div>
              <button type="button" onClick={reset} className="h-10 rounded-full border border-[var(--color-border-strong)] px-4 text-sm font-bold hover:bg-[var(--color-primary-soft)]">Reset filters</button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
