import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";
import { SearchClient } from "@/components/search/SearchClient";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const query = params.q || params.search || "";
  const apiParams = new URLSearchParams();
  if (query) apiParams.set("search", query);
  for (const key of ["category", "store", "min_price", "max_price", "in_stock", "discounted", "sort"]) {
    if (params[key]) apiParams.set(key, params[key] as string);
  }
  const data = await serverGet<Paginated<ProductCardType>>(`/storefront/products/?${apiParams.toString()}`);
  const initialFilters = {
    category: params.category,
    store: params.store,
    min_price: params.min_price,
    max_price: params.max_price,
    in_stock: params.in_stock,
    discounted: params.discounted,
    sort: params.sort || "newest",
  };
  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{data.count} results</p>
      </div>
      <SearchClient initialQuery={query} initialData={data} initialFilters={initialFilters} />
    </section>
  );
}
