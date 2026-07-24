"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Cart, ProductDetail } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BookmarkButton, CartAction } from "./ProductActions";
import { useCart } from "@/components/cart/CartProvider";
import { parseApiError } from "@/lib/api/errors";
import { ShareProductButton } from "./ShareProductButton";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

export function ProductQuickView({ productId, open, onClose }: { productId: number | null; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { hasProduct, setCartState } = useCart();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    fetch(`/api/storefront/products/${productId}/`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load product.");
        return response.json() as Promise<ProductDetail>;
      })
      .then((data) => { if (!cancelled) setProduct(data); })
      .catch(() => { if (!cancelled) toast.error("Could not load product details."); })
    return () => { cancelled = true; };
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !productId) return null;

  async function addToCart(checkout = false) {
    if (!product) return;
    if (checkout && hasProduct(product.id)) {
      onClose();
      router.push("/checkout");
      return;
    }
    setCartLoading(true);
    const response = await fetch("/api/storefront/cart/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: product.id, quantity: product.minimum_order_quantity || 1 }),
    });
    setCartLoading(false);
    if (response.status === 401) {
      toast.error("Sign in to add products to your cart.");
      router.push("/auth/sign-in");
      return;
    }
    if (!response.ok) {
      toast.error(await parseApiError(response, "Could not start checkout."));
      return;
    }
    const cart = await response.json() as Cart;
    setCartState(cart);
    if (checkout) {
      onClose();
      router.push("/checkout");
    } else {
      toast.success(`${product.name} added to cart`);
    }
  }

  const visibleProduct = product?.id === productId ? product : null;
  const loading = !visibleProduct;
  const image = resolveMediaUrl(visibleProduct?.primary_media_url);
  const gallery = visibleProduct?.media.gallery.slice(0, 4) ?? [];
  const specs = Object.entries(visibleProduct?.specifications || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim()).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Product quick view">
      <button aria-label="Close quick view" className="absolute inset-0 h-full w-full bg-black/25" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-white outline-none md:left-1/2 md:right-auto md:top-1/2 md:h-auto md:max-h-[86vh] md:w-[680px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
        <button aria-label="Close" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
        {loading ? <div className="grid min-h-[420px] place-items-center text-sm text-[var(--color-text-secondary)]">Loading product...</div> : visibleProduct ? (
          <div className="grid gap-0 min-[520px]:grid-cols-[minmax(160px,.9fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)]">
            <div className="p-3">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
                {image ? <Image src={image} alt={visibleProduct.name} fill sizes="(max-width: 767px) 100vw, 380px" className="object-cover" /> : <div className="grid h-full place-items-center text-sm text-[var(--color-text-secondary)]">No image</div>}
              </div>
              {gallery.length ? <div className="mt-2 grid grid-cols-4 gap-2">{gallery.map((item) => {
                const url = resolveMediaUrl(item.url);
                return <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">{url ? <Image src={url} alt={item.alt_text || item.title || ""} fill sizes="80px" className="object-cover" /> : null}</div>;
              })}</div> : null}
            </div>
            <div className="flex min-w-0 flex-col p-4 min-[520px]:pl-1 md:p-5">
              <Link href={`/stores/${visibleProduct.store.slug}`} className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:underline">
                <span className="truncate">{visibleProduct.store.business_name}</span>
                {visibleProduct.store.is_verified ? <VerifiedBusinessBadge /> : null}
              </Link>
              <h2 className="mt-2 text-lg font-black leading-snug md:text-xl">{visibleProduct.name}</h2>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-xl font-black md:text-2xl">{money(visibleProduct.price, visibleProduct.currency)}</p>
                {visibleProduct.compare_at_price ? <p className="text-sm text-[var(--color-text-secondary)] line-through">{money(visibleProduct.compare_at_price, visibleProduct.currency)}</p> : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">{visibleProduct.stock_quantity > 0 ? `${visibleProduct.stock_quantity} in stock` : "Out of stock"}</p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{Number(visibleProduct.delivery_fee) > 0 ? `${money(visibleProduct.delivery_fee, visibleProduct.currency)} delivery` : "Free delivery"}</p>
              {visibleProduct.short_description ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--color-text-secondary)]">{visibleProduct.short_description}</p> : null}
              {specs.length ? <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">{specs.map(([key, value]) => <div key={key} className="contents"><dt className="font-bold text-[var(--color-text)]">{key}</dt><dd className="truncate">{String(value)}</dd></div>)}</dl> : null}
              <div className="mt-5 flex items-center gap-3">
                <BookmarkButton productId={visibleProduct.id} initialBookmarked={visibleProduct.is_bookmarked} />
                <CartAction productId={visibleProduct.id} productName={visibleProduct.name} minimumOrderQuantity={visibleProduct.minimum_order_quantity} stockQuantity={visibleProduct.stock_quantity} />
                <ShareProductButton product={visibleProduct} compact />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Button loading={cartLoading} variant="secondary" onClick={() => addToCart(true)}>Checkout</Button>
                <ButtonLink href={`/products/${visibleProduct.id}`} variant="outline" onClick={onClose}>View full details</ButtonLink>
              </div>
            </div>
          </div>
        ) : <div className="grid min-h-[300px] place-items-center text-sm text-[var(--color-text-secondary)]">Product details are unavailable.</div>}
      </div>
    </div>
  );
}
