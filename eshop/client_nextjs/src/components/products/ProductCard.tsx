"use client";

import Image from "next/image";
import Link from "next/link";
import { Info } from "lucide-react";
import { useState } from "react";
import type { ProductCard as ProductCardType } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { BookmarkButton } from "./ProductActions";
import { IconButton } from "@/components/ui/IconButton";
import { ProductQuickView } from "./ProductQuickView";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductCard({ product }: { product: ProductCardType }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const image = resolveMediaUrl(product.primary_media_url);
  return (
    <>
      <article className="snap-card group min-w-0">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
          <Link href={`/products/${product.id}`} className="absolute inset-0 block" aria-label={`View ${product.name}`}>
            {image ? <Image src={image} alt={product.name} fill sizes="(max-width: 767px) 48vw, (max-width: 1199px) 330px, 350px" className="object-cover transition duration-200 group-hover:scale-[1.03] motion-reduce:transition-none" /> : <div className="grid h-full place-items-center text-xs text-[var(--color-text-secondary)]">No image</div>}
          </Link>
          <div className="absolute right-2 top-2 flex gap-2">
            <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} compact />
            <IconButton aria-label={`More information about ${product.name}`} onClick={() => setQuickViewOpen(true)} className="h-9 w-9 bg-white/95">
              <Info aria-hidden className="h-4.5 w-4.5" />
            </IconButton>
          </div>
        </div>
        <Link href={`/products/${product.id}`} className="block min-h-[104px] pt-2">
          <p className="line-clamp-1 text-[12px] font-semibold text-[var(--color-text-secondary)]">{product.store.business_name}</p>
          <h3 className="line-clamp-2 mt-1 h-10 text-[14px] font-bold leading-5">{product.name}</h3>
          <p className="mt-2 truncate text-[14px] font-black">{money(product.price, product.currency)}</p>
        </Link>
      </article>
      <ProductQuickView productId={product.id} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </>
  );
}
