"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/IconButton";
import { useMyList } from "@/components/bookmarks/MyListProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import type { Cart } from "@/types/storefront";
import { parseApiError } from "@/lib/api/errors";

export function BookmarkButton({ productId, initialBookmarked, compact = false }: { productId: number; initialBookmarked: boolean; compact?: boolean }) {
  const router = useRouter();
  const { refreshUnreadCount } = useNotifications();
  const { isBookmarked, setBookmarked } = useMyList();
  const [loading, setLoading] = useState(false);
  const bookmarked = isBookmarked(productId, initialBookmarked);
  async function toggle() {
    const next = !bookmarked;
    setBookmarked(productId, next, { removed: false });
    setLoading(true);
    const response = await fetch(`/api/storefront/products/${productId}/bookmark/`, { method: next ? "POST" : "DELETE" });
    setLoading(false);
    if (response.status === 401) {
      setBookmarked(productId, !next, { removed: false });
      toast.error("Sign in to use My List.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      setBookmarked(productId, !next, { removed: false });
      toast.error("Could not update My List.");
      return;
    }
    if (next) {
      const payload = await response.json().catch(() => ({ created: true })) as { created?: boolean };
      setBookmarked(productId, true, { created: Boolean(payload.created) });
      toast.success(payload.created ? "Added to My List" : "Already added");
    } else {
      setBookmarked(productId, false, { removed: true });
      toast.success("Removed from My List");
    }
    void refreshUnreadCount();
  }
  return (
    <IconButton aria-label={bookmarked ? "Remove from My List" : "Add to My List"} active={bookmarked} disabled={loading} onClick={toggle} className={compact ? "h-9 w-9 bg-white/95" : undefined}>
      {bookmarked ? <Check aria-hidden className="h-4.5 w-4.5 scale-110 transition" /> : <Plus aria-hidden className="h-4.5 w-4.5 transition" />}
    </IconButton>
  );
}

export function CartAction({
  productId,
  productName,
  minimumOrderQuantity,
  stockQuantity,
  requestedQuantity,
  size = "compact",
  className = "",
}: {
  productId: number;
  productName: string;
  minimumOrderQuantity: number;
  stockQuantity: number;
  requestedQuantity?: number;
  size?: "compact" | "large";
  className?: string;
}) {
  const router = useRouter();
  const { hasProduct, setCartState } = useCart();
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const inCart = hasProduct(productId);
  const minimum = Math.max(1, minimumOrderQuantity || 1);
  const quantity = Math.max(minimum, requestedQuantity ?? minimum);
  const unavailable = stockQuantity <= 0 || stockQuantity < minimum;
  const label = unavailable
    ? `${productName} is currently unavailable`
    : inCart
      ? `${productName} is already in cart`
      : `Add ${productName} to cart`;

  async function add() {
    if (unavailable || loading) return;
    if (inCart) {
      toast.info("Already in cart");
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
      toast.error(await parseApiError(response, "Could not add product to cart."));
      return;
    }
    const cart = await response.json() as Cart;
    setCartState(cart);
    toast.success(`${productName} added to cart`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 520);
  }

  const dimensions = size === "large" ? "h-12 w-12" : "h-9 w-9";
  const icon = size === "large" ? "h-5 w-5" : "h-4.5 w-4.5";
  return (
    <button
      type="button"
      disabled={loading || unavailable}
      onClick={add}
      aria-label={label}
      title={label}
      className={`relative grid ${dimensions} shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] bg-white text-[var(--color-text)] transition duration-180 hover:-translate-y-0.5 hover:bg-[var(--color-primary-soft)] active:scale-[0.94] disabled:pointer-events-none disabled:text-[var(--color-text-secondary)] disabled:opacity-50 motion-reduce:transition-none ${justAdded ? "cart-action-added" : ""} ${className}`}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShoppingBag aria-hidden className={`${icon} transition duration-180 ${justAdded ? "scale-90 opacity-70" : ""} motion-reduce:transition-none`} />}
      {(inCart || justAdded) && !loading ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--color-black)] text-white">
          <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

export const AddToCartButton = CartAction;
