"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Cart, ProductDetail } from "@/types/storefront";
import { CartAction, BookmarkButton } from "./ProductActions";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { parseApiError } from "@/lib/api/errors";
import { ShareProductButton } from "./ShareProductButton";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { setCartState } = useCart();
  const [quantity, setQuantity] = useState(product.minimum_order_quantity || 1);
  const [buying, setBuying] = useState(false);
  const minimum = Math.max(1, product.minimum_order_quantity || 1);
  const unavailable = product.stock_quantity <= 0 || product.stock_quantity < minimum;
  async function buyNow() {
    if (unavailable) return;
    setBuying(true);
    const response = await fetch("/api/storefront/cart/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: product.id, quantity }),
    });
    setBuying(false);
    if (response.status === 401) {
      toast.error("Sign in to checkout.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      toast.error(await parseApiError(response, "Could not start checkout."));
      return;
    }
    const cart = await response.json() as Cart;
    setCartState(cart);
    router.push("/checkout");
    router.refresh();
  }
  return (
    <section className="border-t border-[var(--color-border)] bg-white p-4 md:border-t-0 md:p-5">
      <a href={`/stores/${product.store.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)] hover:underline">{product.store.business_name}{product.store.is_verified ? <span className="text-[var(--color-text)]">Verified</span> : null}</a>
      <h1 className="mt-3 text-2xl font-black leading-tight md:text-3xl">{product.name}</h1>
      <div className="mt-5">
        <p className="text-3xl font-black">{money(product.price, product.currency)}</p>
        <div className="mt-1 flex items-center gap-2">
          {product.compare_at_price ? <span className="text-sm text-[var(--color-text-secondary)] line-through">{money(product.compare_at_price, product.currency)}</span> : null}
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--color-text)]">{unavailable ? "Currently unavailable" : `${product.stock_quantity} in stock`}</p>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{Number(product.delivery_fee) > 0 ? `${money(product.delivery_fee, product.currency)} delivery` : "Free delivery"}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-semibold">Qty</span>
        <div className="flex h-11 items-center rounded-full border border-[var(--color-border-strong)] bg-white">
          <button aria-label="Decrease quantity" className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]" onClick={() => setQuantity((current) => Math.max(minimum, current - 1))}><Minus aria-hidden className="h-4 w-4" /></button>
          <span className="w-10 text-center text-sm font-bold">{quantity}</span>
          <button aria-label="Increase quantity" className="grid h-11 w-11 place-items-center rounded-full hover:bg-[var(--color-primary-soft)]" onClick={() => setQuantity((current) => Math.min(product.stock_quantity || current + 1, current + 1))}><Plus aria-hidden className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <CartAction productId={product.id} productName={product.name} minimumOrderQuantity={product.minimum_order_quantity} stockQuantity={product.stock_quantity} requestedQuantity={quantity} size="large" />
        <Button className="flex-1" variant="secondary" loading={buying} disabled={unavailable} onClick={buyNow}>Buy Now</Button>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} />
        <ShareProductButton product={product} />
      </div>
      <p className="mt-4 text-sm text-[var(--color-text-secondary)]">{product.short_description}</p>
    </section>
  );
}
