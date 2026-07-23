import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { AddToCartButton, BookmarkButton } from "./ProductActions";
import { Badge } from "@/components/ui/Badge";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductCard({ product }: { product: ProductCardType }) {
  const image = resolveMediaUrl(product.primary_media_url);
  return (
    <article className="snap-card group grid h-[312px] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative aspect-square bg-slate-100">
        <Link href={`/products/${product.id}`} className="absolute inset-0 block" aria-label={`View ${product.name}`}>
          {image ? <Image src={image} alt={product.name} fill sizes="(max-width: 767px) 48vw, (max-width: 1179px) 28vw, 16vw" className="object-cover transition duration-200 group-hover:scale-[1.03] motion-reduce:transition-none" /> : <div className="grid h-full place-items-center text-xs text-[var(--color-text-secondary)]">No image</div>}
        </Link>
        {product.has_discount ? <Badge className="absolute left-2 top-2 bg-[var(--color-primary)] text-white">-{Number(product.discount_percent).toFixed(0)}%</Badge> : null}
        <div className="absolute right-2 top-2">
          <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} compact />
        </div>
      </div>
      <Link href={`/products/${product.id}`} className="block min-h-0 p-2.5">
        <p className="line-clamp-1 text-[12px] font-semibold text-[var(--color-primary)]">{product.store.business_name}</p>
        <h3 className="line-clamp-2 mt-1 h-10 text-[13px] font-bold leading-5">{product.name}</h3>
        <p className="mt-1 h-4 text-[11px] text-[var(--color-text-secondary)]">{product.sold_count} sold · {product.views_count} views</p>
      </Link>
      <div className="flex h-[58px] items-center justify-between gap-2 border-t border-[var(--color-border)] p-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-black">{money(product.price, product.currency)}</p>
          {product.compare_at_price ? <p className="truncate text-[11px] text-[var(--color-text-secondary)] line-through">{money(product.compare_at_price, product.currency)}</p> : null}
        </div>
        <AddToCartButton productId={product.id} productName={product.name} compact />
      </div>
    </article>
  );
}
