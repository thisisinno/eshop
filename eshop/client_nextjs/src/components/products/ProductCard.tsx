import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductCard({ product }: { product: ProductCardType }) {
  const image = resolveMediaUrl(product.primary_media_url);
  return (
    <article className="snap-card grid h-[292px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
      <Link href={`/products/${product.id}`} className="relative block aspect-square bg-[#eeeafd]">
        {image ? <Image src={image} alt={product.name} fill sizes="(max-width: 767px) 48vw, (max-width: 1179px) 28vw, 16vw" className="object-cover" /> : <div className="grid h-full place-items-center text-xs text-black/45">No image</div>}
        {product.has_discount && <span className="absolute left-2 top-2 rounded bg-[#5b2cff] px-2 py-1 text-[11px] font-bold text-white">-{Number(product.discount_percent).toFixed(0)}%</span>}
        <button aria-label="Save product" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90">♡</button>
      </Link>
      <Link href={`/products/${product.id}`} className="block p-2">
        <p className="line-clamp-1 text-[12px] font-semibold text-[#5b2cff]">{product.store.business_name}</p>
        <h3 className="line-clamp-2 text-[13px] font-bold leading-5">{product.name}</h3>
        <p className="mt-1 h-4 text-[11px] text-black/55">{product.sold_count} sold · {product.views_count} views</p>
      </Link>
      <div className="flex h-[52px] items-center justify-between gap-2 border-t border-black/10 p-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black">{money(product.price, product.currency)}</p>
          {product.compare_at_price && <p className="truncate text-[11px] text-black/45 line-through">{money(product.compare_at_price, product.currency)}</p>}
        </div>
        <button className="h-9 min-w-9 rounded-full bg-[#161225] px-3 text-sm font-bold text-white" aria-label={`Add ${product.name} to cart`}>+</button>
      </div>
    </article>
  );
}
