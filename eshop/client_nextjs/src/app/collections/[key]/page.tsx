import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
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
      <div className="sticky top-[58px] z-20 border-b border-[var(--color-border)] bg-white/95 px-3 py-3 backdrop-blur md:top-0 md:px-4">
        <Link href="/" className="mb-2 inline-flex h-10 items-center gap-2 rounded-full pr-3 text-sm font-bold transition hover:bg-[var(--color-primary-soft)]"><ArrowLeft aria-hidden className="h-5 w-5" />Back</Link>
        <h1 className="text-2xl font-black">{shelf.title}</h1>
      </div>
      {shelf.products.length ? (
        <div className="product-grid-two p-3 md:p-4">
          {shelf.products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      ) : <div className="p-4"><EmptyState title="No products in this collection yet" /></div>}
    </section>
  );
}
