import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType } from "@/types/storefront";

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverGet<Paginated<ProductCardType> & { category: unknown }>(`/storefront/categories/${slug}/`);
  const products = data.results;
  return <section><h1 className="mb-4 text-2xl font-black">Category</h1><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>{!products.length && <p className="rounded-lg bg-white p-6 text-center">No public products in this category yet.</p>}</section>;
}
