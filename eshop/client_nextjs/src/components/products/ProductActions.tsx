"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useCart } from "@/components/cart/CartProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import type { Cart } from "@/types/storefront";

export function BookmarkButton({ productId, initialBookmarked, compact = false }: { productId: number; initialBookmarked: boolean; compact?: boolean }) {
  const router = useRouter();
  const { refreshUnreadCount } = useNotifications();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);
  async function toggle() {
    const next = !bookmarked;
    setBookmarked(next);
    setLoading(true);
    const response = await fetch(`/api/storefront/products/${productId}/bookmark/`, { method: next ? "POST" : "DELETE" });
    setLoading(false);
    if (response.status === 401) {
      setBookmarked(!next);
      toast.error("Sign in to use My List.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      setBookmarked(!next);
      toast.error("Could not update My List.");
      return;
    }
    toast.success(next ? "Added to My List" : "Removed from My List");
    void refreshUnreadCount();
    router.refresh();
  }
  return (
    <IconButton aria-label={bookmarked ? "Remove from My List" : "Add to My List"} active={bookmarked} disabled={loading} onClick={toggle} className={compact ? "h-9 w-9 bg-white/95" : undefined}>
      {bookmarked ? <Check aria-hidden className="h-4.5 w-4.5 scale-110 transition" /> : <Plus aria-hidden className="h-4.5 w-4.5 transition" />}
    </IconButton>
  );
}

export function AddToCartButton({ productId, productName, quantity = 1, mode = "cta" }: { productId: number; productName: string; quantity?: number; mode?: "icon" | "cta" }) {
  const router = useRouter();
  const { hasProduct, setCartState } = useCart();
  const { refreshUnreadCount } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const inCart = hasProduct(productId);

  async function add() {
    if (inCart) {
      router.push("/cart");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/storefront/cart/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: productId, quantity }),
    });
    setLoading(false);
    if (response.status === 401) {
      toast.error("Sign in to add products to your cart.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      toast.error("Could not add to cart.");
      return;
    }
    const cart = await response.json() as Cart;
    setCartState(cart);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 650);
    toast.success(`${productName} added to cart.`);
    void refreshUnreadCount();
    router.refresh();
  }

  if (mode === "icon") {
    const label = inCart ? `${productName} is in cart` : `Add ${productName} to cart`;
    return (
      <button
        type="button"
        disabled={loading}
        onClick={add}
        aria-label={label}
        title={label}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white text-[var(--color-text)] transition duration-180 hover:bg-[var(--color-primary-soft)] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none"
      >
        {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ShoppingBag aria-hidden className={`h-4.5 w-4.5 transition ${justAdded ? "scale-90" : ""}`} />}
        {inCart && !loading ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--color-black)] text-white">
            <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : null}
      </button>
    );
  }

  return <Button loading={loading} onClick={add}><ShoppingBag aria-hidden className="h-5 w-5" />{inCart ? "Open Cart" : justAdded ? "Added" : "Add to Cart"}</Button>;
}
