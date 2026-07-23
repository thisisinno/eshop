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
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{data.count} results</p>
      </div>
      <form className="grid gap-3 border-b border-[var(--color-border)] bg-white p-3 sm:grid-cols-[1fr_auto_auto] md:p-4">
        <label className="relative block">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input name="q" defaultValue={query} placeholder="Search products, stores, categories" className="h-11 w-full rounded-full border border-[var(--color-border-strong)] bg-white pl-10 pr-10 text-sm focus:border-[var(--color-text)] focus:outline-none" />
          {query ? <a aria-label="Clear search" href="/search" className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"><X aria-hidden className="h-4 w-4" /></a> : null}
        </label>
        <select name="sort" defaultValue={params.sort || "newest"} className="h-11 rounded-full border border-[var(--color-border-strong)] bg-white px-3 text-sm">
          <option value="newest">Newest</option>
          <option value="popularity">Popular</option>
          <option value="best_selling">Best selling</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
        </select>
        <Button type="submit"><SlidersHorizontal aria-hidden className="h-4 w-4" />Search</Button>
      </form>
      {data.results.length ? <div className="product-grid-two p-3 md:p-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="p-4"><EmptyState title="No products found">Try a different search or remove filters.</EmptyState></div>}
    </section>
  );
}
