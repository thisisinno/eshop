import type { ProductCard as ProductCardType } from "@/types/storefront";
import { ProductCard } from "./ProductCard";

export function ProductShelf({ title, products }: { title: string; products: ProductCardType[] }) {
  if (!products.length) return null;
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="shelf-scroll">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}
