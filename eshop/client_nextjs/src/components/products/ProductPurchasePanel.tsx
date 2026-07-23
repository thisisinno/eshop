"use client";

import { useState } from "react";
import { Minus, Plus, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import type { ProductDetail } from "@/types/storefront";
import { AddToCartButton, BookmarkButton } from "./ProductActions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const [quantity, setQuantity] = useState(product.minimum_order_quantity || 1);
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm md:p-5">
      <a href={`/stores/${product.store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">{product.store.business_name}{product.store.is_verified ? <Badge>Verified</Badge> : null}</a>
      <h1 className="mt-3 text-2xl font-black leading-tight md:text-3xl">{product.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1"><Star aria-hidden className="h-4 w-4 fill-[var(--color-primary)] text-[var(--color-primary)]" /> Popular</span>
        <span>{product.sold_count} sold</span>
        <span>{product.views_count} views</span>
      </div>
      <div className="mt-5">
        <p className="text-3xl font-black">{money(product.price, product.currency)}</p>
        <div className="mt-1 flex items-center gap-2">
          {product.compare_at_price ? <span className="text-sm text-[var(--color-text-secondary)] line-through">{money(product.compare_at_price, product.currency)}</span> : null}
          {product.has_discount ? <Badge>-{Number(product.discount_percent).toFixed(0)}%</Badge> : null}
        </div>
      </div>
      <p className={`mt-4 text-sm font-semibold ${product.stock_quantity > 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-semibold">Qty</span>
        <div className="flex h-11 items-center rounded-lg border border-[var(--color-border)] bg-white">
          <button aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((current) => Math.max(product.minimum_order_quantity || 1, current - 1))}><Minus aria-hidden className="h-4 w-4" /></button>
          <span className="w-10 text-center text-sm font-bold">{quantity}</span>
          <button aria-label="Increase quantity" className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((current) => Math.min(product.stock_quantity || current + 1, current + 1))}><Plus aria-hidden className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <AddToCartButton productId={product.id} productName={product.name} quantity={quantity} />
        <Button variant="secondary" onClick={() => toast.message("Checkout starts from your cart.")}>Buy Now</Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} />
        <Button variant="outline" onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => undefined)}><Share2 aria-hidden className="h-4 w-4" />Share</Button>
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{product.short_description}</p>
    </section>
  );
}
