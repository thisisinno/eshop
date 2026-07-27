"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Bookmark, Check, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { IconButton } from "@/components/ui/IconButton";
import { useMyList } from "@/components/bookmarks/MyListProvider";
import { useCart } from "@/components/cart/CartProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import type { Cart, ProductDetail } from "@/types/storefront";
import { parseApiError } from "@/lib/api/errors";
import { ProductSpecificationDrawer } from "./ProductSpecificationDrawer";

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
    <IconButton
      aria-label={bookmarked ? "Remove from My List" : "Add to My List"}
      title={bookmarked ? "Remove from My List" : "Add to My List"}
      active={bookmarked}
      disabled={loading}
      onClick={toggle}
      className={`product-card-action relative ${bookmarked ? "bookmark-action-confirmed" : ""} ${compact ? "h-9 w-9 bg-white/95" : ""}`}
    >
      <Bookmark aria-hidden className={`h-4.5 w-4.5 transition duration-180 motion-reduce:transition-none ${bookmarked ? "fill-current scale-105" : ""}`} />
      {bookmarked ? <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--color-black)] text-white"><Check aria-hidden className="h-3 w-3" strokeWidth={3} /></span> : null}
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
  variant = "outline",
  grow = false,
  className = "",
  hasSelectableSpecifications = false,
  productDetail,
  checkout = false,
  text,
  onSuccess,
}: {
  productId: number;
  productName: string;
  minimumOrderQuantity: number;
  stockQuantity: number;
  requestedQuantity?: number;
  size?: "compact" | "large";
  variant?: "outline" | "primary";
  grow?: boolean;
  className?: string;
  hasSelectableSpecifications?: boolean;
  productDetail?: ProductDetail;
  checkout?: boolean;
  text?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { hasProduct, setCartState } = useCart();
  const [loading, setLoading] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<ProductDetail | null>(productDetail ?? null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inCart = hasProduct(productId);
  const minimum = Math.max(1, minimumOrderQuantity || 1);
  const quantity = Math.max(minimum, requestedQuantity ?? minimum);
  const outOfStock = stockQuantity <= 0;
  const belowMinimum = !outOfStock && stockQuantity < minimum;
  const available = !outOfStock && !belowMinimum;
  const label = outOfStock
    ? `${productName} is out of stock`
    : belowMinimum
      ? `Only ${stockQuantity} unit${stockQuantity === 1 ? "" : "s"} are available; minimum order is ${minimum}`
    : inCart
      ? `${productName} is already in cart`
      : `Add ${productName} to cart`;

  async function submit(optionIds: number[] = []) {
    if (!available || loading) return;
    if (inCart && !hasSelectableSpecifications) {
      toast.info("Already in cart");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/storefront/cart/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: productId, quantity, specification_option_ids: optionIds }),
    });
    setLoading(false);
    if (response.status === 401) {
      toast.error("Sign in to add products to your cart.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      const message = await parseApiError(response, "Could not add product to cart.");
      if (!optionIds.length && /(?:choose|select|required).*(?:option|size|colour|color)|specification/i.test(message)) {
        setDrawerError(message);
        setDrawerOpen(true);
        if (!detail) {
          setDetailLoading(true);
          const detailResponse = await fetch(`/api/storefront/products/${productId}/`);
          setDetailLoading(false);
          if (detailResponse.ok) setDetail(await detailResponse.json() as ProductDetail);
        }
        return;
      }
      setDrawerError(message);
      toast.error(message);
      return;
    }
    const cart = await response.json() as Cart;
    setCartState(cart);
    toast.success(`${productName} added to cart`);
    setDrawerOpen(false);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 520);
    onSuccess?.();
    if (checkout) router.push("/checkout");
  }

  async function add() {
    if (!hasSelectableSpecifications) return submit();
    setDrawerError("");
    setDrawerOpen(true);
    if (detail) return;
    setDetailLoading(true);
    const response = await fetch(`/api/storefront/products/${productId}/`);
    setDetailLoading(false);
    if (!response.ok) {
      const message = await parseApiError(response, "Could not load specifications.");
      setDrawerError(message);
      return;
    }
    setDetail(await response.json() as ProductDetail);
  }

  const dimensions = size === "large"
    ? (text ? "h-12 px-5" : "h-12 w-12")
    : (text ? "h-9 px-4" : "h-9 w-9");
  const icon = size === "large" ? "h-5 w-5" : "h-4.5 w-4.5";
  const visualStyles = variant === "primary"
    ? "border-black bg-[var(--color-black)] text-white hover:bg-neutral-800 focus-visible:ring-black disabled:bg-neutral-700 disabled:text-white"
    : "border-[var(--color-border-strong)] bg-white text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] focus-visible:ring-[var(--color-text)] disabled:text-[var(--color-text-secondary)]";
  return (
    <>
    <button ref={triggerRef}
      type="button"
      disabled={loading || !available}
      onClick={add}
      aria-label={label}
      title={label}
      className={`relative ${text ? "inline-flex" : "grid"} ${dimensions} ${grow ? "min-w-0 flex-1" : "shrink-0"} place-items-center items-center justify-center gap-2 rounded-full border transition duration-180 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none ${visualStyles} ${justAdded ? "cart-action-added" : ""} ${className}`}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShoppingBag aria-hidden className={`${icon} transition duration-180 ${justAdded ? "scale-90 opacity-70" : ""} motion-reduce:transition-none`} />}
      {text ? <span className="text-sm font-bold">{text}</span> : null}
      {(inCart || justAdded) && !loading ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--color-black)] text-white">
          <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
    <ProductSpecificationDrawer open={drawerOpen} product={detail} loading={detailLoading} submitting={loading} error={drawerError} onClose={() => setDrawerOpen(false)} onSubmit={submit} returnFocusRef={triggerRef} />
    </>
  );
}

export const AddToCartButton = CartAction;
