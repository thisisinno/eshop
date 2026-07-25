"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { CartAction, BookmarkButton } from "./ProductActions";
import { IconButton } from "@/components/ui/IconButton";
import { ProductQuickView } from "./ProductQuickView";
import { ProductMediaCarousel } from "./ProductMediaCarousel";

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
  const media = product.media_preview?.length ? product.media_preview : product.primary_media_url ? [{
    id: -product.id, media_type: "image" as const, url: product.primary_media_url, title: product.name,
    alt_text: product.name, is_primary: true, sort_order: 0,
  }] : [];
  const discount = discountPercent(product);
  return (
    <>
      <article className="snap-card group flex h-full min-w-0 flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">
          <ProductMediaCarousel media={media} alt={product.name} linkHref={`/products/${product.id}`} imageSizes="(max-width: 767px) 48vw, (max-width: 1199px) 330px, (max-width: 1439px) 250px, 310px" />
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
