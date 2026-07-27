import { notFound } from "next/navigation";
import { CollectionHeader } from "@/components/collections/CollectionHeader";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { serverGet } from "@/lib/api/django";
import type { HomeResponse } from "@/types/storefront";

export default async function CollectionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const home = await serverGet<HomeResponse>("/storefront/home/");
  const shelf = home.shelves.find((item) => item.key === key);
  if (!shelf) notFound();
  return (
    <section>
      <CollectionHeader title={shelf.title} />
      {shelf.products.length ? (
        <div className="product-grid-two p-3 md:p-4">
          {shelf.products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : <div className="p-4"><EmptyState title="No products in this collection yet" /></div>}
    </section>
  );
}
