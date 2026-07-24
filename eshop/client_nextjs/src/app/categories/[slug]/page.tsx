import { CategoryProductsClient } from "@/components/categories/CategoryProductsClient";
import { serverGet } from "@/lib/api/django";
import type { Category, Paginated, ProductCard as ProductCardType } from "@/types/storefront";

export default async function CategoryDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  if (sp.sort) query.set("sort", sp.sort);
  if (sp.in_stock) query.set("in_stock", sp.in_stock);
  if (sp.discounted) query.set("discounted", sp.discounted);
  if (sp.min_price) query.set("min_price", sp.min_price);
  if (sp.max_price) query.set("max_price", sp.max_price);
  const data = await serverGet<Paginated<ProductCardType> & { category: Category }>(`/storefront/categories/${slug}/?${query.toString()}`);
  return <CategoryProductsClient slug={slug} initialData={data} initialParams={sp} />;
}
