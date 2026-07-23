import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const query = params.q || "";
  const data = await serverGet<Paginated<ProductCardType>>(`/storefront/products/?search=${encodeURIComponent(query)}`);
  return <section><h1 className="mb-4 text-2xl font-black">Search</h1><form className="mb-4"><input name="q" defaultValue={query} placeholder="Search products, stores, categories" className="w-full rounded-lg border border-black/10 bg-white px-4 py-3" /></form><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
