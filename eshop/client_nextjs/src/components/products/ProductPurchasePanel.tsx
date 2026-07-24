"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import type { Cart, ProductDetail } from "@/types/storefront";
import { CartAction, BookmarkButton } from "./ProductActions";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { parseApiError } from "@/lib/api/errors";
import { ShareProductButton } from "./ShareProductButton";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";

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
    toast.success(`${product.name} added to cart`);
    router.push("/checkout");
  }
  return (
    <section className="border-t border-[var(--color-border)] bg-white p-3 md:border-t-0 md:p-5 lg:pt-5">
      <div className="mx-auto max-w-xl lg:max-w-none">
        <Link href={`/stores/${product.store.slug}`} className="inline-flex max-w-full items-center gap-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:underline md:text-sm">
          <span className="truncate">{product.store.business_name}</span>
          {product.store.is_verified ? <VerifiedBusinessBadge /> : null}
        </Link>
        <h1 className="mt-1 text-lg font-black leading-snug md:mt-2 md:text-2xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:mt-4">
          <p className="text-xl font-black md:text-2xl">{money(product.price, product.currency)}</p>
          {product.compare_at_price ? <span className="text-sm text-[var(--color-text-secondary)] line-through">{money(product.compare_at_price, product.currency)}</span> : null}
        </div>
        <div className="mt-3 grid gap-1.5 text-sm md:mt-4 md:gap-2">
          <p className="font-semibold text-[var(--color-text)]">{unavailable ? "Currently unavailable" : `${product.stock_quantity} in stock`}</p>
          <p className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]"><Truck aria-hidden className="h-4 w-4" />{Number(product.delivery_fee) > 0 ? `${money(product.delivery_fee, product.currency)} delivery` : "Free delivery"}</p>
        </div>
        <div className="mt-3 flex items-center gap-3 md:mt-4">
          <span className="text-sm font-semibold">Qty</span>
          <div className="flex h-10 items-center rounded-full border border-[var(--color-border-strong)] bg-white md:h-9">
            <button aria-label="Decrease quantity" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)] md:h-9 md:w-9" onClick={() => setQuantity((current) => Math.max(minimum, current - 1))}><Minus aria-hidden className="h-4 w-4" /></button>
            <span className="w-9 text-center text-sm font-bold">{quantity}</span>
            <button aria-label="Increase quantity" className="grid h-10 w-10 place-items-center rounded-full hover:bg-[var(--color-primary-soft)] md:h-9 md:w-9" onClick={() => setQuantity((current) => Math.min(product.stock_quantity || current + 1, current + 1))}><Plus aria-hidden className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 md:mt-5 md:gap-3">
          <CartAction productId={product.id} productName={product.name} minimumOrderQuantity={product.minimum_order_quantity} stockQuantity={product.stock_quantity} requestedQuantity={quantity} size="large" />
          <Button className="h-10 flex-1 px-3 text-sm md:h-11 md:text-base" variant="secondary" loading={buying} disabled={unavailable} onClick={buyNow}>Buy Now</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 md:gap-3">
          <BookmarkButton productId={product.id} initialBookmarked={product.is_bookmarked} />
          <ShareProductButton product={product} />
        </div>
      </div>
    </section>
  );
}
