import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductShelfScroller } from "./ProductShelfScroller";

export function ProductShelf({ title, products, href }: { title: string; products: ProductCardType[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="border-b border-[var(--color-border)] px-3 py-5 md:px-4">
      <SectionHeader title={title} href={href} />
      <ProductShelfScroller label={`${title} products`}>
        {products.map((product) => (
          <div className="shelf-item" key={product.id}>
            <ProductCard product={product} disableTouchMediaSwipe />
          </div>
        ))}
      </ProductShelfScroller>
    </section>
  );
}
