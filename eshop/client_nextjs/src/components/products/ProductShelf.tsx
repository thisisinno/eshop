import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductShelfScroller } from "./ProductShelfScroller";

export function ProductShelf({ title, products, href }: { title: string; products: ProductCardType[]; href?: string }) {
  if (!products.length) return null;
  const visibleProducts = products.slice(0, 2);
  return (
    <section className="border-b border-[var(--color-border)] px-3 py-5 md:px-4">
      <SectionHeader title={title} href={href} />
      <ProductShelfScroller>
        {visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
      </ProductShelfScroller>
    </section>
  );
}
