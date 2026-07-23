import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "./ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductShelfScroller } from "./ProductShelfScroller";

export function ProductShelf({ title, products, href }: { title: string; products: ProductCardType[]; href?: string }) {
  if (!products.length) return null;
  return (
    <section className="mb-7">
      <SectionHeader title={title} href={href} />
      <ProductShelfScroller>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </ProductShelfScroller>
    </section>
  );
}
