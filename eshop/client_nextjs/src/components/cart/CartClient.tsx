"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Cart } from "@/types/storefront";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "./CartProvider";

const money = (amount: string, currency = "TZS") => `${currency} ${Number(amount).toLocaleString()}`;

export function CartClient({ initialCart }: { initialCart: Cart }) {
  const [cart, setCart] = useState(initialCart);
  const [busy, setBusy] = useState<number | null>(null);
  const { setCartState } = useCart();

  function syncCart(nextCart: Cart) {
    setCart(nextCart);
    setCartState(nextCart);
  }

  async function updateItem(itemId: number, quantity: number) {
    const previous = cart;
    setBusy(itemId);
    if (quantity <= 0) {
      setCart((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId), total_quantity: current.total_quantity - (current.items.find((item) => item.id === itemId)?.quantity ?? 0) }));
      const response = await fetch(`/api/storefront/cart/items/${itemId}/`, { method: "DELETE" });
      setBusy(null);
      if (!response.ok) { syncCart(previous); toast.error("Could not remove item."); return; }
      const next = await response.json() as Cart;
      syncCart(next); return;
    }
    setCart((current) => ({ ...current, items: current.items.map((item) => item.id === itemId ? { ...item, quantity } : item) }));
    const response = await fetch(`/api/storefront/cart/items/${itemId}/`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity }) });
    setBusy(null);
    if (!response.ok) { syncCart(previous); toast.error("Could not update quantity."); return; }
    const next = await response.json() as Cart;
    syncCart(next);
  }

  if (!cart.items.length) return <EmptyState title="Your cart is empty" action={<ButtonLink href="/search">Find products</ButtonLink>}>Products you add will appear here.</EmptyState>;

  return (
    <section>
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h1 className="text-2xl font-black md:text-3xl">Cart</h1>
      </div>
      <div className="p-3 md:p-4">
        <div className="space-y-2">
          {cart.items.map((item) => {
            const image = resolveMediaUrl(item.product.primary_media_url);
            return (
              <article key={item.id} className="grid grid-cols-[118px_minmax(0,1fr)] gap-3 border-b border-[var(--color-border)] bg-white py-3 sm:grid-cols-[128px_minmax(0,1fr)] md:grid-cols-[148px_minmax(0,1fr)]">
                <Link href={`/products/${item.product.id}`} className="relative aspect-square overflow-hidden rounded-lg bg-[var(--color-primary-soft)]">
                  {image ? <Image src={image} alt={item.product.name} fill sizes="(max-width: 639px) 118px, (max-width: 767px) 128px, 148px" className="object-cover" /> : null}
                </Link>
                <div className="flex min-w-0 flex-col">
                  <Link href={`/products/${item.product.id}`} className="line-clamp-2 min-h-10 text-sm font-black leading-5">{item.product.name}</Link>
                  <p className="mt-0.5 truncate text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">{item.product.store.business_name}</p>
                  <div className="mt-2">
                    <p className="text-base font-black leading-tight">{money(item.line_total, item.product.currency)}</p>
                    {item.quantity > 1 ? <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">{item.quantity} x {money(item.product.price, item.product.currency)}</p> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 items-center rounded-full border border-[var(--color-border-strong)]">
                        <button disabled={busy === item.id} aria-label={`Decrease ${item.product.name} quantity`} onClick={() => updateItem(item.id, item.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-primary-soft)] active:scale-[0.97]"><Minus aria-hidden className="h-3.5 w-3.5" /></button>
                        <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                        <button disabled={busy === item.id} aria-label={`Increase ${item.product.name} quantity`} onClick={() => updateItem(item.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full transition hover:bg-[var(--color-primary-soft)] active:scale-[0.97]"><Plus aria-hidden className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <button disabled={busy === item.id} aria-label={`Remove ${item.product.name} from cart`} onClick={() => updateItem(item.id, 0)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--color-border-strong)] text-[var(--color-text)] transition hover:bg-[var(--color-primary-soft)] active:scale-[0.97]"><Trash2 aria-hidden className="h-4 w-4" /></button>
                  </div>
                  {item.product.stock_quantity <= 0 ? <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Out of stock</p> : null}
                </div>
              </article>
            );
          })}
        </div>
        <aside className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-4 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur md:static md:bg-white md:p-0 md:pt-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><b>{money(cart.subtotal, cart.items[0]?.product.currency)}</b></div>
            <div className="flex justify-between text-[var(--color-text-secondary)]"><span>Delivery</span><span>Calculated later</span></div>
          </div>
          <div className="mt-3 flex justify-end">
            <ButtonLink href="/checkout" className="h-11 rounded-full bg-[var(--color-black)] px-6 text-white hover:bg-[var(--color-primary-hover)]">Checkout</ButtonLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
