import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Category, Paginated, ProductCard as ProductCardType } from "@/types/storefront";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function CategoryDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  if (sp.sort) query.set("sort", sp.sort);
  if (sp.in_stock) query.set("in_stock", sp.in_stock);
  if (sp.discounted) query.set("discounted", sp.discounted);
  const data = await serverGet<Paginated<ProductCardType> & { category: Category }>(`/storefront/categories/${slug}/?${query.toString()}`);
  const products = data.results;
  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-primary)]">Category</p>
          <h1 className="text-2xl font-black md:text-3xl">{data.category.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{data.count} products</p>
        </div>
        <form className="flex gap-2">
          <select name="sort" defaultValue={sp.sort || "newest"} className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm">
            <option value="newest">Newest</option>
            <option value="popularity">Popular</option>
            <option value="best_selling">Best selling</option>
            <option value="price_asc">Price low</option>
            <option value="price_desc">Price high</option>
          </select>
          <button className="h-10 rounded-lg bg-[var(--color-black)] px-4 text-sm font-semibold text-white">Apply</button>
        </form>
      </div>
      {products.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="No public products in this category yet" />}
    </section>
  );
}
