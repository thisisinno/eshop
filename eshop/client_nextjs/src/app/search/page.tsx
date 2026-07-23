import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const query = params.q || params.search || "";
  const apiParams = new URLSearchParams();
  if (query) apiParams.set("search", query);
  for (const key of ["category", "store", "min_price", "max_price", "in_stock", "discounted", "sort"]) {
    if (params[key]) apiParams.set(key, params[key] as string);
  }
  const data = await serverGet<Paginated<ProductCardType>>(`/storefront/products/?${apiParams.toString()}`);
  return (
    <section>
      <div className="mb-4">
        <h1 className="text-2xl font-black md:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{data.count} results</p>
      </div>
      <form className="mb-4 grid gap-3 rounded-lg border border-[var(--color-border)] bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={query} placeholder="Search products, stores, categories" className="h-11 w-full rounded-lg border border-[var(--color-border)] bg-white pl-10 pr-10 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-blue-100" />
          {query ? <a aria-label="Clear search" href="/search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X aria-hidden className="h-4 w-4" /></a> : null}
        </label>
        <select name="sort" defaultValue={params.sort || "newest"} className="h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm">
          <option value="newest">Newest</option>
          <option value="popularity">Popular</option>
          <option value="best_selling">Best selling</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
        <Button type="submit"><SlidersHorizontal aria-hidden className="h-4 w-4" />Search</Button>
      </form>
      {data.results.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="No products found">Try a different search or remove filters.</EmptyState>}
    </section>
  );
}
