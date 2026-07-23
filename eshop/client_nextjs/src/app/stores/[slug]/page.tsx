import { ProductCard } from "@/components/products/ProductCard";
import { serverGet } from "@/lib/api/django";
import type { Paginated, ProductCard as ProductCardType, StoreDetail } from "@/types/storefront";
import { notFound } from "next/navigation";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: Paginated<ProductCardType> & { store: StoreDetail };
  try { data = await serverGet<Paginated<ProductCardType> & { store: StoreDetail }>(`/storefront/stores/${slug}/`); } catch { notFound(); }
  return <section><div className="overflow-hidden rounded-lg bg-white"><div className="h-28 bg-[#ded6ff]" /><div className="p-4"><h1 className="text-2xl font-black">{data.store.business_name}{data.store.is_verified ? " ✓" : ""}</h1><p className="text-sm text-black/60">{data.store.location_summary}</p><p className="mt-2 text-sm">{data.store.follower_count} followers · {data.store.product_count} products</p><button className="mt-3 rounded-full bg-[#5b2cff] px-5 py-2 font-bold text-white">{data.store.is_following ? "Following" : "Follow"}</button><p className="mt-4 text-sm text-black/70">{data.store.address_description}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
