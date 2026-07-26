"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { toast } from "sonner";
import type { ProductDetail } from "@/types/storefront";
import { ButtonLink } from "@/components/ui/Button";
import { BookmarkButton, CartAction } from "./ProductActions";
import { ShareProductButton } from "./ShareProductButton";
import { VerifiedBusinessBadge } from "@/components/store/VerifiedBusinessBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductMediaCarousel } from "./ProductMediaCarousel";
import { ProductMediaLightbox } from "./ProductMediaLightbox";

const money = (amount: string, currency: string) => `${currency} ${Number(amount).toLocaleString()}`;

type QuickViewProps = { productId: number | null; open: boolean; onClose: () => void };

export function ProductQuickView(props: QuickViewProps) {
  if (!props.open || !props.productId) return null;
  return <ProductQuickViewDialog key={props.productId} productId={props.productId} onClose={props.onClose} />;
}

function ProductQuickViewDialog({ productId, onClose }: { productId: number; onClose: () => void }) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/storefront/products/${productId}/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load product.");
        return response.json() as Promise<ProductDetail>;
      })
      .then((data) => { if (!cancelled) setProduct(data); })
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          toast.error("Could not load product details.");
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [productId]);

  useEffect(() => {
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
  }, [onClose]);

  const visibleProduct = product?.id === productId ? product : null;
  const loading = !visibleProduct;
  const media = visibleProduct ? (visibleProduct.media.slides?.length
    ? visibleProduct.media.slides
    : [...visibleProduct.media.gallery, ...visibleProduct.media.videos].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)) : [];
  const specs = Object.entries(visibleProduct?.specifications || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim()).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Product quick view">
      <button aria-label="Close quick view" className="absolute inset-0 h-full w-full bg-black/25" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-white outline-none md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[min(760px,92vw)] md:rounded-none">
        <div className="shrink-0 border-b border-[var(--color-border)] bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-base font-black">Quick view</h2>
            <button aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)]"><X aria-hidden className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? <QuickViewSkeleton /> : visibleProduct ? (
          <div className="grid gap-0 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
            <div className="p-3">
              <div className="relative aspect-[4/5] max-h-[62vh] overflow-hidden rounded-xl bg-[var(--color-primary-soft)]">
                <ProductMediaCarousel media={media} alt={visibleProduct.name} imageSizes="(max-width: 767px) 100vw, 430px" objectFit="contain" activeIndex={mediaIndex} onIndexChange={setMediaIndex} />
                <button onClick={() => setLightboxOpen(true)} className="absolute right-3 top-3 inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/95 px-3 text-xs font-bold"><Maximize2 className="h-4 w-4" />View image · {mediaIndex + 1}/{media.length}</button>
              </div>
            </div>
            <div className="flex min-w-0 flex-col p-4 md:p-5">
              <Link href={`/stores/${visibleProduct.store.slug}`} className="inline-flex max-w-full items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:underline md:text-sm">
                <span className="truncate">{visibleProduct.store.business_name}</span>
                {visibleProduct.store.is_verified ? <VerifiedBusinessBadge /> : null}
              </Link>
              <h3 className="mt-1 line-clamp-2 text-base font-black leading-snug md:mt-2 md:text-xl">{visibleProduct.name}</h3>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-lg font-black md:text-2xl">{money(visibleProduct.price, visibleProduct.currency)}</p>
                {visibleProduct.compare_at_price ? <p className="text-sm text-[var(--color-text-secondary)] line-through">{money(visibleProduct.compare_at_price, visibleProduct.currency)}</p> : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--color-text)] md:text-sm">{visibleProduct.stock_quantity > 0 ? `${visibleProduct.stock_quantity} in stock` : "Out of stock"}</p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)] md:text-sm">{Number(visibleProduct.delivery_fee) > 0 ? `${money(visibleProduct.delivery_fee, visibleProduct.currency)} delivery` : "Free delivery"}</p>
              {visibleProduct.short_description ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--color-text-secondary)] md:mt-3 md:text-sm md:leading-6">{visibleProduct.short_description}</p> : null}
              {specs.length ? <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs text-[var(--color-text-secondary)]">{specs.map(([key, value]) => <div key={key} className="contents"><dt className="font-bold text-[var(--color-text)]">{key}</dt><dd className="truncate">{String(value)}</dd></div>)}</dl> : null}
            </div>
          </div>
        ) : <div className="grid min-h-[300px] place-items-center text-sm text-[var(--color-text-secondary)]">Product details are unavailable.</div>}
        </div>
        {visibleProduct ? <ProductMediaLightbox media={media} initialIndex={mediaIndex} open={lightboxOpen} alt={visibleProduct.name} onClose={() => setLightboxOpen(false)} onIndexChange={setMediaIndex} /> : null}
        <div className="shrink-0 border-t border-[var(--color-border)] bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="space-y-3"><div className="grid grid-cols-3 gap-2"><Skeleton className="h-10 rounded-full" /><Skeleton className="h-10 rounded-full" /><Skeleton className="h-10 rounded-full" /></div><div className="grid grid-cols-2 gap-2"><Skeleton className="h-10 rounded-full" /><Skeleton className="h-10 rounded-full" /></div></div>
          ) : visibleProduct ? (
            <>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
                <BookmarkButton productId={visibleProduct.id} initialBookmarked={visibleProduct.is_bookmarked} />
                <CartAction productId={visibleProduct.id} productName={visibleProduct.name} minimumOrderQuantity={visibleProduct.minimum_order_quantity} stockQuantity={visibleProduct.stock_quantity} hasSelectableSpecifications={visibleProduct.has_selectable_specifications} productDetail={visibleProduct} />
                <ShareProductButton product={visibleProduct} compact />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <CartAction productId={visibleProduct.id} productName={visibleProduct.name} minimumOrderQuantity={visibleProduct.minimum_order_quantity} stockQuantity={visibleProduct.stock_quantity} hasSelectableSpecifications={visibleProduct.has_selectable_specifications} productDetail={visibleProduct} checkout text="Checkout" variant="primary" grow onSuccess={onClose} className="w-full" />
                <ButtonLink className="h-10 px-3 text-sm" href={`/products/${visibleProduct.id}`} variant="outline" onClick={onClose}>Full details</ButtonLink>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QuickViewSkeleton() {
  return (
    <div className="grid gap-0 md:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
      <div className="p-3">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="mt-2 grid grid-cols-4 gap-2">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-square rounded-lg" />)}</div>
      </div>
      <div className="min-w-0 p-3 min-[360px]:pl-0 md:p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-5 w-full" />
        <Skeleton className="mt-1 h-5 w-4/5" />
        <Skeleton className="mt-3 h-6 w-32" />
        <Skeleton className="mt-3 h-4 w-24" />
        <Skeleton className="mt-2 h-4 w-36" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
      </div>
    </div>
  );
}
