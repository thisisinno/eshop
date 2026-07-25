"use client";

import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import { useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { CartAction, BookmarkButton } from "./ProductActions";
import { IconButton } from "@/components/ui/IconButton";
import { ProductQuickView } from "./ProductQuickView";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

type ProductCardVariant = "discovery" | "my-list" | "collection";

function discountPercent(product: ProductCardType) {
  const price = Number(product.price);
  const compare = Number(product.compare_at_price);
  if (!Number.isFinite(price) || !Number.isFinite(compare) || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

export function ProductCard({ product, variant = "discovery" }: { product: ProductCardType; variant?: ProductCardVariant }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const image = resolveMediaUrl(product.primary_media_url);
  const discount = discountPercent(product);
  return (
    <>
      <article className="snap-card group flex h-full min-w-0 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">
          <Link href={`/products/${product.id}`} className="absolute inset-0 block" aria-label={`View ${product.name}`}>
            {image ? <Image src={image} alt={product.name} fill sizes="(max-width: 767px) 48vw, (max-width: 1199px) 330px, (max-width: 1439px) 250px, 310px" className="object-cover transition duration-200 group-hover:scale-[1.025] motion-reduce:transition-none" /> : <div className="grid h-full place-items-center text-xs text-[var(--color-text-secondary)]">No image</div>}
          </Link>
        </div>
        <div className="flex min-h-[104px] flex-1 flex-col pt-2">
          <Link href={`/products/${product.id}`} className="line-clamp-2 text-[14px] font-black leading-5">{product.name}</Link>
          <div className="mt-1 flex min-h-5 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[14px] font-black">{money(product.price, product.currency)}</span>
            {discount ? <span className="text-[12px] font-semibold text-[var(--color-text-secondary)] line-through">{money(product.compare_at_price!, product.currency)}</span> : null}
            {discount ? <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">{discount}% off</span> : null}
          </div>
          <div className="mt-auto flex min-h-11 items-center gap-1.5 border-t border-[var(--color-border)] pt-2">
            {variant === "my-list" ? <CartAction productId={product.id} productName={product.name} minimumOrderQuantity={product.minimum_order_quantity} stockQuantity={product.stock_quantity} /> : null}
            <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} compact={variant === "my-list"} />
            <IconButton aria-label={`Quick view ${product.name}`} title="Quick view" onClick={() => setQuickViewOpen(true)} className={`product-card-action ${variant === "my-list" ? "h-9 w-9" : ""}`}>
              <Info aria-hidden className="h-4.5 w-4.5" />
            </IconButton>
          </div>
        </div>
      </article>
      <ProductQuickView productId={product.id} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </>
  );
}
