import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductShelfScroller } from "./ProductShelfScroller";

export function ProductShelf({ title, products, href }: { title: string; products: ProductCardType[]; href?: string }) {
  if (!products.length) return null;
  const visibleProducts = products.slice(0, 3);
  return (
    <section className="border-b border-[var(--color-border)] px-3 py-5 md:px-4">
      <SectionHeader title={title} href={href} />
      <ProductShelfScroller>
        {visibleProducts.map((product, index) => index === 2
          ? <div className="shelf-desktop-only" key={product.id}><ProductCard product={product} /></div>
          : <ProductCard key={product.id} product={product} />)}
      </ProductShelfScroller>
    </section>
  );
}
