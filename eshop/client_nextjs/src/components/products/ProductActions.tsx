"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useCart } from "@/components/cart/CartProvider";
import type { Cart } from "@/types/storefront";

export function BookmarkButton({ productId, initialBookmarked, compact = false }: { productId: number; initialBookmarked: boolean; compact?: boolean }) {
  const router = useRouter();
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
    router.refresh();
  }
  return (
    <IconButton aria-label={bookmarked ? "Remove from My List" : "Add to My List"} active={bookmarked} disabled={loading} onClick={toggle} className={compact ? "h-9 w-9 bg-white/95" : undefined}>
      {bookmarked ? <Check aria-hidden className="h-4.5 w-4.5 scale-110 transition" /> : <Plus aria-hidden className="h-4.5 w-4.5 transition" />}
    </IconButton>
  );
}

export function AddToCartButton({ productId, productName, quantity = 1, compact = false }: { productId: number; productName: string; quantity?: number; compact?: boolean }) {
  const router = useRouter();
  const { setCount, increment } = useCart();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  async function add() {
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
    setCount(cart.total_quantity);
    increment(0);
    setDone(true);
    window.setTimeout(() => setDone(false), 1200);
    toast.success(`${productName} added to cart.`);
    router.refresh();
  }
  if (compact) {
    return (
      <Button size="icon" variant="secondary" loading={loading} onClick={add} aria-label={`Add ${productName} to cart`} className="rounded-full">
        {done ? <Check aria-hidden className="h-5 w-5" /> : <ShoppingBag aria-hidden className="h-5 w-5" />}
      </Button>
    );
  }
  return <Button loading={loading} onClick={add}><ShoppingBag aria-hidden className="h-5 w-5" />{done ? "Added" : "Add to Cart"}</Button>;
}
